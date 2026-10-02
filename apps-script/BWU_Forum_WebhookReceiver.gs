/**
 * BWU Forum Committee Sign-up — Netlify Webhook Receiver
 *
 * Purpose: receives the "Outgoing webhook" notification Netlify sends every
 * time someone submits the committee sign-up form on the Forum page
 * (https://bridgewateryou.netlify.app/forum), and appends it as a new row
 * in the "BWU Framing Committee Volunteer Sign-ups" Google Sheet.
 *
 * Bound Sheet ID: 1A5XT4UD8WRajCANAJQxy_LZEEn8wUep-pUyOXuu9um4
 * Tab name:       Sheet1
 *
 * Columns written (A–H):
 *   Timestamp | Full Name | Email | Committee | Notes | Raw Submission | Submission ID | Phone/Text
 *
 * "Phone/Text" (added 2026-10-02) is the volunteer's phone / text number from
 * the form field named "phone". It is deliberately the LAST column (H) so that
 * columns A–G and every existing row stay exactly where they were.
 *
 * "Raw Submission" is a safety net: the complete original JSON Netlify
 * sent, so nothing is ever lost even if a parsed column comes up blank.
 *
 * "Submission ID" (added 2026-08-27) is Netlify's own unique ID for each
 * form submission. Netlify was observed calling this webhook 2–3 times
 * for the SAME submission (confirmed by identical submission IDs and
 * timestamps landing as duplicate rows). This script now checks the
 * Submission ID column before writing, and skips anything already
 * recorded — so no matter how many times Netlify calls this webhook for
 * one real sign-up, only one row is ever written for it. A script lock
 * prevents two near-simultaneous retries from both slipping past the
 * duplicate check at once.
 */

var SHEET_ID = '1A5XT4UD8WRajCANAJQxy_LZEEn8wUep-pUyOXuu9um4';
var SHEET_NAME = 'Sheet1';
var HEADERS = ['Timestamp', 'Full Name', 'Email', 'Committee', 'Notes', 'Raw Submission', 'Submission ID', 'Phone/Text'];
var SUBMISSION_ID_COL = 7; // column G

/**
 * Handles the POST request Netlify's "Outgoing webhook" notification sends
 * on every new form submission. Locked so overlapping retries for the same
 * submission can't both pass the duplicate check before either has written
 * a row.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var sheet = getSheet_();
    ensureHeaders_(sheet);

    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    var submissionId = '';
    var row;

    try {
      var parsed = JSON.parse(rawBody);
      var submission = (parsed && parsed.payload) ? parsed.payload : parsed;
      submission = submission || {};
      submissionId = submission.id ? String(submission.id) : '';

      if (submissionId && isDuplicate_(sheet, submissionId)) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'duplicate_skipped', id: submissionId }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var fields = extractFields_(submission);
      row = [
        fields.timestamp,
        fields.name,
        fields.email,
        fields.committee,
        fields.notes,
        rawBody,
        submissionId,
        fields.phone
      ];
    } catch (err) {
      // Even if parsing fails entirely, still record the raw body so the
      // submission is never silently dropped. Timestamp falls back to "now".
      row = [new Date(), '', '', '', 'PARSE ERROR: ' + err.message, rawBody, '', ''];
    }

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', id: submissionId }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Simple health check so you can confirm the deployed web app is live by
 * visiting its URL directly in a browser (a GET request, not a real
 * submission — this does NOT write a row to the Sheet).
 */
function doGet(e) {
  return ContentService
    .createTextOutput('BWU Forum webhook receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Pulls Full Name / Email / Phone / Committee / Notes / Timestamp out of the
 * submission object, trying several field-name patterns Netlify is known
 * to use, so the script keeps working even if the exact shape differs
 * slightly from what's expected.
 */
function extractFields_(submission) {
  var data = submission.data || {};
  var human = submission.human_fields || {};

  var name = firstNonEmpty_([
    data.name, data['full-name'], data.fullname,
    human.Name, human['Full Name'], human['full name']
  ]);

  var email = firstNonEmpty_([
    data.email, human.Email, human.email
  ]);

  var phone = firstNonEmpty_([
    data.phone,
    human['Phone / Text Number'],
    human.Phone,
    human.phone
  ]);

  var committee = firstNonEmpty_([
    data.committee,
    human.Committee,
    human['Select the one committee for this submission'],
    human['committee']
  ]);

  var notes = firstNonEmpty_([
    data.message,
    human.Message,
    human["Anything else you'd like us to know?"],
    human['message']
  ]);

  var createdAt = submission.created_at ? new Date(submission.created_at) : new Date();

  return {
    timestamp: createdAt,
    name: name,
    email: email,
    phone: phone,
    committee: committee,
    notes: notes
  };
}

/** Returns the first value in the array that is a non-empty string. */
function firstNonEmpty_(values) {
  for (var i = 0; i < values.length; i++) {
    if (values[i] !== undefined && values[i] !== null && String(values[i]).trim() !== '') {
      return String(values[i]).trim();
    }
  }
  return '';
}

/** True if this Submission ID already has a row in the sheet. */
function isDuplicate_(sheet, submissionId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var ids = sheet.getRange(2, SUBMISSION_ID_COL, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === submissionId) return true;
  }
  return false;
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

/**
 * Writes the header row (bolded) if it doesn't already exactly match
 * HEADERS — this safely adds the new "Phone/Text" header to an
 * existing sheet without touching any data rows below it.
 */
function ensureHeaders_(sheet) {
  var existing = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var matches = true;
  for (var i = 0; i < HEADERS.length; i++) {
    if (existing[i] !== HEADERS[i]) { matches = false; break; }
  }
  if (matches) return;
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

/**
 * Run this once manually from the Apps Script editor (select
 * setupHeadersOnly from the function dropdown, click Run) if you want the
 * header row updated before testing, without waiting for a real
 * submission. Safe to run more than once.
 */
function setupHeadersOnly() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);
}
