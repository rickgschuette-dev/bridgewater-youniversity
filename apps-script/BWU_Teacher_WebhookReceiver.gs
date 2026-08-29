/**
 * BWU Teacher Class Sign-up — Netlify Webhook Receiver
 *
 * Purpose: receives the "Outgoing webhook" notification Netlify sends every
 * time someone submits the "Interested in Teaching a Class?" form on the
 * Teachers page (https://bridgewateryou.netlify.app/teachers), appends it as
 * a new row in the "BWU Teacher Class Proposals" Google Sheet, and emails a
 * notification to the recipients listed below.
 *
 * This mirrors BWU_Forum_WebhookReceiver.gs (the Framing Committee sign-up
 * receiver), including its duplicate-submission protection, since that
 * pattern has been running successfully in production since 2026-08-27.
 *
 * NOTE: this file is a version-controlled mirror for reference. The Apps
 * Script project itself lives inside the "BWU Teacher Class Proposals"
 * Google Sheet (Extensions > Apps Script) — that is what's actually
 * deployed and running, not this file. If you edit the deployed script,
 * copy the change back into this file too so they don't drift apart.
 *
 * Bound Sheet ID: 10I3iP7nljMkt3EeF0WBb357RF8hhhKHPR7JGmzVDiv8
 * Sheet URL:      https://docs.google.com/spreadsheets/d/10I3iP7nljMkt3EeF0WBb357RF8hhhKHPR7JGmzVDiv8/edit
 * Tab name:       Sheet1
 *
 * Columns written (A–H):
 *   Timestamp | First Name | Last Name | Email | Phone | Proposed Class to Teach | Raw Submission | Submission ID
 *
 * "Raw Submission" is a safety net: the complete original JSON Netlify
 * sent, so nothing is ever lost even if a parsed column comes up blank.
 *
 * "Submission ID" is Netlify's own unique ID for each form submission.
 * Netlify has been observed calling this kind of webhook 2–3 times for the
 * SAME submission on the Forum form, so this script checks the Submission ID
 * column before writing and skips anything already recorded — only one row
 * is ever written per real sign-up. A script lock prevents two
 * near-simultaneous retries from both slipping past the duplicate check.
 */

var SHEET_ID = '10I3iP7nljMkt3EeF0WBb357RF8hhhKHPR7JGmzVDiv8';
var SHEET_NAME = 'Sheet1';
var HEADERS = ['Timestamp', 'First Name', 'Last Name', 'Email', 'Phone', 'Proposed Class to Teach', 'Raw Submission', 'Submission ID'];
var SUBMISSION_ID_COL = 8; // column H

// Everyone who should get an email the moment a new teacher sign-up comes in.
var NOTIFY_EMAILS = [
  'rick.g.schuette@gmail.com',
  'pmkushner@verizon.net',
  'aanpa1@yahoo.com',
  'jlhelfand1@bellsouth.net'
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
    var row;
    var fields = null;

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

      fields = extractFields_(submission);

      row = [
        fields.timestamp,
        fields.firstName,
        fields.lastName,
        fields.email,
        fields.phone,
        fields.proposedClass,
        rawBody,
        submissionId
      ];
    } catch (err) {
      // Even if parsing fails entirely, still record the raw body so the
      // submission is never silently dropped. Timestamp falls back to "now".
      row = [new Date(), '', '', '', '', 'PARSE ERROR: ' + err.message, rawBody, ''];
    }

    sheet.appendRow(row);

    if (fields) {
      sendNotificationEmail_(fields);
    }

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
    .createTextOutput('BWU Teacher sign-up webhook receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Emails everyone in NOTIFY_EMAILS about a new teacher sign-up. Runs after
 * the row has already been written, so a failure here never blocks the
 * Sheet record from being saved.
 */
function sendNotificationEmail_(fields) {
  try {
    var subject = 'New BWU Teacher Sign-Up: ' + (fields.firstName + ' ' + fields.lastName).trim();
    var body =
      'A new class-teaching sign-up came in through the Teachers page:\n\n' +
      'Name: ' + fields.firstName + ' ' + fields.lastName + '\n' +
      'Email: ' + fields.email + '\n' +
      'Phone: ' + fields.phone + '\n' +
      'Proposed Class to Teach: ' + fields.proposedClass + '\n\n' +
      'Full list: https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit';

    MailApp.sendEmail({
      to: NOTIFY_EMAILS.join(','),
      subject: subject,
      body: body
    });
  } catch (err) {
    // Don't let an email failure surface as a webhook error — the row is
    // already saved either way. Logged so it's visible in Executions.
    console.error('sendNotificationEmail_ failed: ' + err.message);
  }
}

/**
 * Pulls First Name / Last Name / Email / Phone / Proposed Class out of the
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

  var proposedClass = firstNonEmpty_([
    data['proposed-class'], data.class,
    human['Proposed Class to Teach'], human['proposed class to teach']
  ]);

  var createdAt = submission.created_at ? new Date(submission.created_at) : new Date();

  return {
    timestamp: createdAt,
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: phone,
    proposedClass: proposedClass
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
 * HEADERS — this safely sets up a brand-new sheet without touching any
 * data rows below it if it's ever run again later.
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
