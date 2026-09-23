/**
 * BWU Student Class Registration — Netlify Webhook Receiver
 *
 * Purpose: receives the "Outgoing webhook" notification Netlify sends every
 * time a resident submits the class registration form on the Registration
 * page (https://bridgewateryou.netlify.app/registration), and appends ONE
 * ROW PER CLASS the resident selected to the "BWU Student Class
 * Registration" Google Sheet — so a resident registering for 3 classes in
 * one submission produces 3 rows, with no manual splitting needed
 * afterward. It also emails a notification to the recipients listed below
 * and a personalized acknowledgement back to the resident.
 *
 * This mirrors BWU_Teacher_WebhookReceiver.gs and
 * BWU_Forum_WebhookReceiver.gs, including their duplicate-submission
 * protection, since that pattern has been running successfully in
 * production since 2026-08-27. Because Netlify is known to call this kind
 * of webhook 2-3 times for the SAME real submission, and this script can
 * legitimately write several rows for one submission (one per class), the
 * dedupe key stored in the Submission ID column is a COMPOSITE of
 * "<Netlify submission id>::<class title>" — not the bare submission ID —
 * so a retry correctly skips all of that submission's rows (already
 * written) while still allowing a resident's separate real classes to each
 * get their own row the first time through.
 *
 * NOTE: this file is a version-controlled mirror for reference. The Apps
 * Script project itself lives inside the "BWU Student Class Registration"
 * Google Sheet (Extensions > Apps Script) — that is what's actually
 * deployed and running, not this file. If you edit the deployed script,
 * copy the change back into this file too so they don't drift apart.
 *
 * Bound Sheet ID: 1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI
 * Sheet URL:      https://docs.google.com/spreadsheets/d/1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI/edit
 * Tab name:       Sheet1
 *
 * Columns written (A-H):
 *   Timestamp | First Name | Last Name | Phone | Email |
 *   Class Registered For | Raw Submission | Submission ID
 *
 * The registration form's class checkboxes are UI-only (no "name"
 * attribute), because Netlify Forms only stores fields present in the
 * site's static HTML at deploy time and the class list is fetched live at
 * runtime. Instead, the page's JavaScript copies every checked class's
 * exact title into one static, always-present hidden field named
 * "classes" as a JSON array right before submit. This script parses that
 * single field; it never needs to know the class list in advance, so it
 * keeps working unchanged as classes are added or removed on the live
 * Confirmed Classes sheet.
 *
 * "Raw Submission" is a safety net: the complete original JSON Netlify
 * sent, so nothing is ever lost even if a parsed column comes up blank.
 */

var SHEET_ID = '1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI';
var SHEET_NAME = 'Sheet1';
var HEADERS = ['Timestamp', 'First Name', 'Last Name', 'Phone', 'Email', 'Class Registered For', 'Raw Submission', 'Submission ID'];
var SUBMISSION_ID_COL = 8; // column H — composite "<submission id>::<class title>"

// Everyone who should get an email the moment a new registration comes in.
// TEMPORARY: Rick only while testing, matching the same starting point used
// for the Teacher receiver. Add more addresses here once testing is done.
var NOTIFY_EMAILS = [
  'rick.g.schuette@gmail.com'
];

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
    var fields = null;
    var classes = [];
    var writtenCount = 0;

    try {
      var parsed = JSON.parse(rawBody);
      var submission = (parsed && parsed.payload) ? parsed.payload : parsed;
      submission = submission || {};
      submissionId = submission.id ? String(submission.id) : '';

      fields = extractFields_(submission);
      classes = extractClasses_(submission);
      if (classes.length === 0) classes = ['(none selected)'];

      for (var i = 0; i < classes.length; i++) {
        var compositeId = submissionId ? (submissionId + '::' + classes[i]) : '';
        if (compositeId && isDuplicate_(sheet, compositeId)) continue;

        sheet.appendRow([
          fields.timestamp,
          fields.firstName,
          fields.lastName,
          fields.phone,
          fields.email,
          classes[i],
          rawBody,
          compositeId
        ]);
        writtenCount++;
      }
    } catch (err) {
      sheet.appendRow([new Date(), '', '', '', '', 'PARSE ERROR: ' + err.message, rawBody, '']);
    }

    // Only email on genuinely new rows -- a Netlify retry of an already-
    // recorded submission writes nothing new (writtenCount stays 0), so it
    // must not re-notify anyone a second or third time.
    if (fields && writtenCount > 0) {
      sendNotificationEmail_(fields, classes);
      sendAcknowledgementEmail_(fields, classes);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', id: submissionId, classesWritten: writtenCount }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Simple health check so you can confirm the deployed web app is live by
 * visiting its URL directly in a browser (a GET request, not a real
 * submission -- this does NOT write a row to the Sheet).
 */
function doGet(e) {
  return ContentService
    .createTextOutput('BWU Student Class Registration webhook receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Emails everyone in NOTIFY_EMAILS about a new registration. Runs after the
 * rows have already been written, so a failure here never blocks the Sheet
 * record from being saved.
 */
function sendNotificationEmail_(fields, classes) {
  try {
    var subject = 'New BWU Class Registration: ' + (fields.firstName + ' ' + fields.lastName).trim();
    var body =
      'A new class registration came in through the Registration page:\n\n' +
      'Name: ' + fields.firstName + ' ' + fields.lastName + '\n' +
      'Email: ' + fields.email + '\n' +
      'Phone: ' + fields.phone + '\n' +
      'Classes registered for:\n  - ' + classes.join('\n  - ') + '\n\n' +
      'Full list: https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';

    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(','),
      subject: subject,
      body: body
    });
  } catch (err) {
    console.error('sendNotificationEmail_ failed: ' + err.message);
  }
}

/**
 * Emails the resident who submitted the form a personalized acknowledgement
 * listing every class they registered for. Runs after the rows have
 * already been written, so a failure here never blocks the Sheet record or
 * the admin notification. Silently does nothing if no email address was
 * captured.
 */
function sendAcknowledgementEmail_(fields, classes) {
  if (!fields.email) return;

  try {
    var greetingName = fields.firstName || 'there';
    var subject = 'You\'re registered, ' + (fields.firstName || 'neighbor') + '!';
    var body =
      'Hi ' + greetingName + ',\n\n' +
      'Thank you for registering with Bridgewater YOUniversity! We\'ve received your registration for:\n\n' +
      '  - ' + classes.join('\n  - ') + '\n\n' +
      'If anything looks incorrect, just reply to this email and let us know.\n\n' +
      'Thanks, and we look forward to seeing you in class!\n\n' +
      '— Bridgewater YOUniversity';

    MailApp.sendEmail({
      to: fields.email,
      subject: subject,
      body: body,
      name: 'Bridgewater YOUniversity'
    });
  } catch (err) {
    console.error('sendAcknowledgementEmail_ failed: ' + err.message);
  }
}

/**
 * Pulls First Name / Last Name / Phone / Email out of the
 * submission object, trying several field-name patterns Netlify is known
 * to use, so the script keeps working even if the exact shape differs
 * slightly from what's expected.
 */
function extractFields_(submission) {
  var data = submission.data || {};
  var human = submission.human_fields || {};

  var firstName = firstNonEmpty_([
    data['first-name'], data.firstname, data.first_name,
    human['First Name'], human['first name']
  ]);

  var lastName = firstNonEmpty_([
    data['last-name'], data.lastname, data.last_name,
    human['Last Name'], human['last name']
  ]);

  var email = firstNonEmpty_([
    data.email, human.Email, human.email
  ]);

  var phone = firstNonEmpty_([
    data.phone, data['phone-number'], human['Phone Number'], human.Phone, human.phone
  ]);

  var createdAt = submission.created_at ? new Date(submission.created_at) : new Date();

  return {
    timestamp: createdAt,
    firstName: firstName,
    lastName: lastName,
    phone: phone,
    email: email
  };
}

/**
 * Collects every checked class from the submission. The registration
 * page's checkboxes are rendered dynamically (from a live Google Sheet)
 * and so have no "name" attribute of their own -- Netlify Forms only
 * stores fields present in the site's static HTML at deploy time, so a
 * per-checkbox field name would be silently dropped. Instead, the page's
 * JavaScript copies every checked class's exact title into one static,
 * always-present field named "classes" as a JSON array right before
 * submit. This just parses that field, so it keeps working unchanged as
 * classes are added or removed.
 */
function extractClasses_(submission) {
  var data = submission.data || {};
  var raw = data.classes;
  if (raw === undefined || raw === null || String(raw).trim() === '') return [];

  var classes = [];
  try {
    var parsed = JSON.parse(raw);
    if (Object.prototype.toString.call(parsed) === '[object Array]') {
      for (var i = 0; i < parsed.length; i++) {
        var val = parsed[i];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          classes.push(String(val).trim());
        }
      }
    }
  } catch (err) {
    console.error('extractClasses_ failed to parse "classes" field: ' + err.message);
  }
  return classes;
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

/** True if this composite "<submission id>::<class title>" already has a row in the sheet. */
function isDuplicate_(sheet, compositeId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var ids = sheet.getRange(2, SUBMISSION_ID_COL, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === compositeId) return true;
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
 * HEADERS -- safely sets up a brand-new sheet without touching any data
 * rows below it if it's ever run again later.
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
 * header row set up before testing, without waiting for a real submission.
 * Safe to run more than once.
 */
function setupHeadersOnly() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);
}
