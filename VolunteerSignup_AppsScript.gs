/**
 * Bridgewater YOUniversity — Framing Committee Volunteer Sign-up
 * Receives "New form submission" webhook POSTs from Netlify Forms and
 * appends each one as a row in this spreadsheet.
 *
 * WHY THIS IS BUILT THE WAY IT IS (plain-language notes for Rick):
 * - Every possible error is caught, so this script ALWAYS answers Netlify
 *   with "OK", even if something inside goes wrong. If it ever answered
 *   with an error instead, Netlify treats that as "this webhook is broken"
 *   after enough failures and can stop sending it new submissions — which
 *   is the exact breakage this project has run into before with other
 *   Google Sheets-connected forms.
 * - A "lock" is used so that if two people submit the form at nearly the
 *   same moment, their two rows don't collide or get lost while both
 *   copies of this script try to write at once.
 * - Every submission includes a unique ID from Netlify. Before adding a
 *   row, the script checks whether that ID has already been recorded. If
 *   Netlify ever retries a delivery (it does this automatically if it
 *   doesn't get a fast-enough reply), this prevents the same sign-up from
 *   being logged twice.
 * - Anything unexpected is written to a separate "Errors" tab in this same
 *   spreadsheet instead of being silently lost, so Rick can check there if
 *   a submission ever looks like it didn't come through as expected.
 */

var SHEET_NAME = 'Volunteer Signups';
var ERRORS_SHEET_NAME = 'Errors';
var HEADERS = ['Timestamp', 'Name', 'Email', 'Committee', 'Message', 'Submission ID'];
var MAX_ROWS_TO_SCAN_FOR_DUPLICATES = 1000; // keeps duplicate-checking fast even as the sheet grows

function doPost(e) {
  var lock = LockService.getScriptLock();
  var gotLock = false;

  try {
    gotLock = lock.tryLock(30000); // wait up to 30 seconds for the lock
    if (!gotLock) {
      logError_('Could not get lock within 30 seconds — submission may not have been recorded. Raw body: ' + safeRawBody_(e));
      return respondOk_();
    }

    var parsed = parseNetlifyPayload_(e);
    if (!parsed) {
      logError_('Could not parse incoming payload. Raw body: ' + safeRawBody_(e));
      return respondOk_();
    }

    // Skip anything the honeypot field caught (spam bots fill every field,
    // including the hidden "bot-field" a real person never sees).
    if (parsed.botField) {
      logError_('Skipped a submission flagged by the spam honeypot field. Submission ID: ' + parsed.submissionId);
      return respondOk_();
    }

    var sheet = getOrCreateSheet_(SHEET_NAME, HEADERS);

    if (parsed.submissionId && isDuplicateSubmission_(sheet, parsed.submissionId)) {
      // Already recorded this exact submission — Netlify is retrying a
      // delivery it thinks failed. Answer OK and do nothing else.
      return respondOk_();
    }

    sheet.appendRow([
      new Date(),
      parsed.name,
      parsed.email,
      parsed.committee,
      parsed.message,
      parsed.submissionId
    ]);

    return respondOk_();
  } catch (err) {
    logError_('Unexpected error in doPost: ' + err + ' | Raw body: ' + safeRawBody_(e));
    return respondOk_(); // never let an error escape — always answer OK
  } finally {
    if (gotLock) {
      lock.releaseLock();
    }
  }
}

/**
 * Pulls name/email/committee/message/id out of whatever shape Netlify sent.
 * Netlify's outgoing webhook payload is normally shaped like:
 *   { payload: { id: "...", data: { name: "...", email: "...", ... } } }
 * but this checks a couple of fallback shapes too, in case that ever
 * changes, so a format tweak on Netlify's end doesn't silently break
 * everything.
 */
function parseNetlifyPayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return null;
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }

  var payload = body.payload || body;
  var data = payload.data || payload.human_fields || payload;

  return {
    submissionId: payload.id || payload.number || '',
    name: data.name || '',
    email: data.email || '',
    committee: data.committee || '',
    message: data.message || '',
    botField: !!(data['bot-field'])
  };
}

function getOrCreateSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function isDuplicateSubmission_(sheet, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false; // only the header row exists so far
  }
  var startRow = Math.max(2, lastRow - MAX_ROWS_TO_SCAN_FOR_DUPLICATES + 1);
  var numRows = lastRow - startRow + 1;
  var idColumn = 6; // "Submission ID" is column F
  var existingIds = sheet.getRange(startRow, idColumn, numRows, 1).getValues();
  for (var i = 0; i < existingIds.length; i++) {
    if (String(existingIds[i][0]) === String(submissionId)) {
      return true;
    }
  }
  return false;
}

function logError_(message) {
  try {
    var sheet = getOrCreateSheet_(ERRORS_SHEET_NAME, ['Timestamp', 'Error']);
    sheet.appendRow([new Date(), message]);
  } catch (err) {
    // If even error-logging fails, there's nothing further we can safely do
    // without risking an uncaught exception reaching Netlify.
  }
}

function safeRawBody_(e) {
  try {
    return e && e.postData && e.postData.contents ? e.postData.contents : '(no body)';
  } catch (err) {
    return '(unavailable)';
  }
}

function respondOk_() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
