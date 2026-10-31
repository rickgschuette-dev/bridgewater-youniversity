/**
 * BWU Student Class Registration — Netlify Webhook Receiver
 *
 * Purpose: receives the "Outgoing webhook" notification Netlify sends every
 * time a resident submits the class registration form on the Registration
 * page (https://www.bridgewateryou.net/registration), and appends ONE
 * ROW PER CLASS the resident selected to the "BW_YOU_Winter_27_Class_
 * Registration" Google Sheet's "Sheet1" tab — so a resident registering for
 * 3 classes in one submission produces 3 rows, with no manual splitting
 * needed afterward. It also:
 *   1. Emails a notification to the recipients listed below and a
 *      personalized acknowledgement back to the resident,
 *   2. Regenerates three live report tabs in the same Sheet after every new
 *      registration ("Unique Residents", "Class Tally", "Class Rosters"), and
 *   3. Checks "Rick's BW Contacts" (1k7R-JalUzER7z8TEn52a6k264cHjXXo1Mic-YoDtyXI)
 *      and automatically appends the registrant (with the "(BW Resident)"
 *      suffix, formatted phone number, and email) if their phone number is
 *      not already on the list.
 *
 * Bound Sheet ID: 1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI
 * Sheet URL:      https://docs.google.com/spreadsheets/d/1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI/edit
 * Raw data tab:   Sheet1
 *
 * Rick's BW Contacts Sheet ID: 1k7R-JalUzER7z8TEn52a6k264cHjXXo1Mic-YoDtyXI
 * Rick's BW Contacts Tab Name: BW Residents
 */

var SHEET_ID = '1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI';
var SHEET_NAME = 'Sheet1';
var HEADERS = ['Timestamp', 'First Name', 'Last Name', 'Phone', 'Email', 'Class Registered For', 'Raw Submission', 'Submission ID'];
var SUBMISSION_ID_COL = 8; // column H — composite "<submission id>::<class title>"

var BW_CONTACTS_SHEET_ID = '1k7R-JalUzER7z8TEn52a6k264cHjXXo1Mic-YoDtyXI';
var BW_CONTACTS_TAB_NAME = 'BW Residents';

var BRAND = {
  navy: '#0B2A5C',
  navyDark: '#081f45',
  gold: '#C78F14',
  cream: '#FBF3E5',
  white: '#FFFFFF',
  altRow: '#EEF2F7'
};

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

    // Only email / rebuild reports / sync contacts on genuinely new rows.
    if (fields && writtenCount > 0) {
      try {
        rebuildReportTabs_(sheet);
      } catch (err) {
        console.error('rebuildReportTabs_ failed: ' + err.message);
      }
      try {
        syncToRicksBWContacts_(fields);
      } catch (err) {
        console.error('syncToRicksBWContacts_ failed: ' + err.message);
      }
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

// ==========================================================================
// AUTOMATIC SYNC TO "Rick's BW Contacts" GOOGLE SHEET
// ==========================================================================

/**
 * Normalizes a phone string to a 10-digit US number for duplicate checking.
 */
function normalizePhone10_(phone) {
  var digits = String(phone || '').replace(/\D+/g, '');
  if (digits.length === 11 && digits.charAt(0) === '1') {
    digits = digits.substring(1);
  }
  return digits;
}

/**
 * Formats a 10-digit phone number as (XXX) XXX-XXXX.
 */
function formatPhoneDisplay_(phone) {
  var digits = normalizePhone10_(phone);
  if (digits.length === 10) {
    return '(' + digits.substring(0, 3) + ') ' + digits.substring(3, 6) + '-' + digits.substring(6);
  }
  return String(phone || '').trim();
}

/**
 * Title-cases a name nicely if entered in ALL CAPS or all lowercase.
 */
function cleanNameCase_(name) {
  var s = String(name || '').trim();
  if (!s) return '';
  if (s === s.toUpperCase() || s === s.toLowerCase()) {
    return s.toLowerCase().replace(/\b([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }
  return s;
}

/**
 * Checks "Rick's BW Contacts" (tab "BW Residents") to see if the registrant's
 * phone number (or exact First + Last Name + Email) is already listed. If not,
 * appends the new neighbor with "(BW Resident)" and sorts the sheet
 * alphabetically by Last Name (column C) then First Name (column B).
 */
function syncToRicksBWContacts_(fields) {
  if (!fields) return false;
  var firstName = cleanNameCase_(fields.firstName);
  var lastName = cleanNameCase_(fields.lastName);
  var rawPhone = String(fields.phone || '').trim();
  var email = String(fields.email || '').trim().toLowerCase();
  var normPhone = normalizePhone10_(rawPhone);

  if (!firstName && !lastName && !normPhone) return false;

  // Skip Rick's own test entries
  if (lastName.toLowerCase() === 'schuette' && (firstName.toLowerCase() === 'rick' || firstName.toLowerCase() === 'richard')) {
    return false;
  }

  var contactsSS = SpreadsheetApp.openById(BW_CONTACTS_SHEET_ID);
  var contactsSheet = contactsSS.getSheetByName(BW_CONTACTS_TAB_NAME);
  if (!contactsSheet) {
    contactsSheet = contactsSS.insertSheet(BW_CONTACTS_TAB_NAME);
    contactsSheet.appendRow(['Contact Name in Phone', 'First Name', 'Last Name', 'Text / Mobile Number', 'Email Address', 'Contact Group / Label']);
    contactsSheet.setFrozenRows(1);
  }

  var data = contactsSheet.getDataRange().getValues();
  var fullCleanName = (firstName + ' ' + lastName).trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var rowFirst = String(data[i][1] || '').trim().toLowerCase();
    var rowLast = String(data[i][2] || '').trim().toLowerCase();
    var rowPhone = normalizePhone10_(data[i][3]);
    var rowName = (rowFirst + ' ' + rowLast).trim();

    // If the same 10-digit phone number and same first name already exist, skip
    if (normPhone && rowPhone === normPhone) {
      if (!rowFirst || !firstName || rowFirst === firstName.toLowerCase()) {
        return false;
      }
    }
    // Or if the exact same First + Last name already exists with the same phone or blank phone, skip
    if (fullCleanName && rowName === fullCleanName && (!normPhone || !rowPhone || rowPhone === normPhone)) {
      return false;
    }
  }

  var contactDisplayName = (firstName + ' ' + lastName).trim() + ' (BW Resident)';
  var formattedPhone = formatPhoneDisplay_(rawPhone);

  contactsSheet.appendRow([
    contactDisplayName,
    firstName,
    lastName,
    formattedPhone,
    email,
    'BWU Winter 27 Registration'
  ]);

  // Keep rows sorted alphabetically by Last Name (col 3), then First Name (col 2)
  var lastRow = contactsSheet.getLastRow();
  if (lastRow > 2) {
    contactsSheet.getRange(2, 1, lastRow - 1, 6).sort([
      { column: 3, ascending: true },
      { column: 2, ascending: true }
    ]);
  }
  return true;
}

/**
 * Optional manual helper: run this from the Apps Script editor toolbar to
 * scan all existing rows in Sheet1 and add any missing registrants to
 * "Rick's BW Contacts".
 */
function backfillRicksBWContacts() {
  var sheet = getSheet_();
  var data = sheet.getDataRange().getValues();
  var added = 0;
  for (var i = 1; i < data.length; i++) {
    var wasAdded = syncToRicksBWContacts_({
      firstName: data[i][1],
      lastName: data[i][2],
      phone: data[i][3],
      email: data[i][4]
    });
    if (wasAdded) added++;
  }
  Logger.log('Backfill complete. New neighbors added to Rick\'s BW Contacts: ' + added);
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
 * listing every class they registered for.
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
 * Pulls First Name / Last Name / Phone / Email out of the submission object.
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
 * Collects every checked class from the submission's hidden "classes" JSON array.
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
 * Writes the header row (bolded) if it doesn't already exactly match HEADERS.
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

function setupHeadersOnly() {
  var sheet = getSheet_();
  ensureHeaders_(sheet);
}

// ==========================================================================
// LIVE REPORT TABS — "Unique Residents", "Class Tally", "Class Rosters"
// ==========================================================================

function rebuildReportTabs_(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var residents = {};
  var residentOrder = [];
  var classes = {};
  var classOrder = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var firstName = String(row[1] || '').trim();
    var lastName = String(row[2] || '').trim();
    var phone = String(row[3] || '').trim();
    var email = String(row[4] || '').trim();
    var classTitle = String(row[5] || '').trim();

    if (!classTitle || classTitle === '(none selected)' || classTitle.indexOf('PARSE ERROR') === 0) continue;

    var key = email ? email.toLowerCase() : (firstName || lastName ? 'name:' + firstName.toLowerCase() + '_' + lastName.toLowerCase() : '');
    if (!key) continue;

    if (!residents[key]) {
      residents[key] = { firstName: firstName, lastName: lastName, phone: phone, email: email, classes: {} };
      residentOrder.push(key);
    } else {
      residents[key].firstName = firstName || residents[key].firstName;
      residents[key].lastName = lastName || residents[key].lastName;
      residents[key].phone = phone || residents[key].phone;
      residents[key].email = email || residents[key].email;
    }
    residents[key].classes[classTitle] = true;

    if (!classes[classTitle]) {
      classes[classTitle] = { registrants: {} };
      classOrder.push(classTitle);
    }
    classes[classTitle].registrants[key] = residents[key];
  }

  writeUniqueResidentsTab_(residentOrder, residents);
  writeClassTallyTab_(classOrder, classes);
  writeClassRostersTab_(classOrder, classes);
}

function getOrCreateReportTab_(name) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function applyAlternatingRows_(sheet, startRow, numRows, numCols) {
  var backgrounds = [];
  for (var i = 0; i < numRows; i++) {
    var bg = (i % 2 === 0) ? BRAND.white : BRAND.altRow;
    var rowColors = [];
    for (var j = 0; j < numCols; j++) rowColors.push(bg);
    backgrounds.push(rowColors);
  }
  sheet.getRange(startRow, 1, numRows, numCols).setBackgrounds(backgrounds);
}

function nowFormatted_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy h:mm a');
}

function writeUniqueResidentsTab_(residentOrder, residents) {
  var sheet = getOrCreateReportTab_('Unique Residents');
  sheet.clear();

  var numCols = 6;
  var rows = residentOrder.map(function (key) {
    var r = residents[key];
    return {
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      count: Object.keys(r.classes).length
    };
  });
  rows.sort(function (a, b) {
    return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  });

  sheet.getRange(1, 1, 1, numCols).merge()
    .setValue('BRIDGEWATER YOUNIVERSITY — Unique Registered Residents')
    .setBackground(BRAND.navy).setFontColor(BRAND.white).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center');

  sheet.getRange(2, 1, 1, numCols).merge()
    .setValue('Total Unique Residents: ' + rows.length + '   |   Updated: ' + nowFormatted_())
    .setBackground(BRAND.gold).setFontColor(BRAND.white).setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange(3, 1, 1, numCols)
    .setValues([['First Name', 'Last Name', 'Phone', 'Email', 'Classes Registered', 'Notes']])
    .setBackground(BRAND.cream).setFontColor(BRAND.navy).setFontWeight('bold');

  if (rows.length) {
    var values = rows.map(function (r) {
      return [r.firstName, r.lastName, r.phone, r.email, r.count, ''];
    });
    sheet.getRange(4, 1, values.length, numCols).setValues(values);
    applyAlternatingRows_(sheet, 4, values.length, numCols);
  }

  var summaryRow = 4 + rows.length;
  sheet.getRange(summaryRow, 1, 1, numCols).merge()
    .setValue('TOTAL UNIQUE RESIDENTS: ' + rows.length)
    .setBackground(BRAND.gold).setFontColor(BRAND.white).setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 240);
  sheet.setFrozenRows(3);
}

function writeClassTallyTab_(classOrder, classes) {
  var sheet = getOrCreateReportTab_('Class Tally');
  sheet.clear();

  var numCols = 2;
  var rows = classOrder.map(function (title) {
    return { title: title, count: Object.keys(classes[title].registrants).length };
  });
  rows.sort(function (a, b) {
    return b.count - a.count || a.title.localeCompare(b.title);
  });

  sheet.getRange(1, 1, 1, numCols).merge()
    .setValue('BRIDGEWATER YOUNIVERSITY — Class Interest Tally')
    .setBackground(BRAND.navy).setFontColor(BRAND.white).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center');

  sheet.getRange(2, 1, 1, numCols).merge()
    .setValue('Total Classes With Registrations: ' + rows.length + '   |   Updated: ' + nowFormatted_())
    .setBackground(BRAND.gold).setFontColor(BRAND.white).setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange(3, 1, 1, numCols)
    .setValues([['Class Name', 'Registrants']])
    .setBackground(BRAND.cream).setFontColor(BRAND.navy).setFontWeight('bold');

  if (rows.length) {
    var values = rows.map(function (r) { return [r.title, r.count]; });
    sheet.getRange(4, 1, values.length, numCols).setValues(values);
    applyAlternatingRows_(sheet, 4, values.length, numCols);
  }

  var summaryRow = 4 + rows.length;
  sheet.getRange(summaryRow, 1, 1, numCols).merge()
    .setValue('TOTAL CLASSES WITH REGISTRATIONS: ' + rows.length)
    .setBackground(BRAND.gold).setFontColor(BRAND.white).setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 380);
  sheet.setColumnWidth(2, 140);
  sheet.setFrozenRows(3);
}

function writeClassRostersTab_(classOrder, classes) {
  var sheet = getOrCreateReportTab_('Class Rosters');
  sheet.clear();

  var numCols = 4;
  var titlesSorted = classOrder.slice().sort(function (a, b) { return a.localeCompare(b); });

  sheet.getRange(1, 1, 1, numCols).merge()
    .setValue('BRIDGEWATER YOUNIVERSITY — Class Rosters')
    .setBackground(BRAND.navy).setFontColor(BRAND.white).setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center');

  var row = 3;
  titlesSorted.forEach(function (title) {
    var registrants = classes[title].registrants;
    var people = Object.keys(registrants).map(function (k) { return registrants[k]; });
    people.sort(function (a, b) {
      return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    });

    sheet.getRange(row, 1, 1, numCols).merge()
      .setValue(title + '   |   ' + people.length + ' Registered')
      .setBackground(BRAND.gold).setFontColor(BRAND.white).setFontWeight('bold')
      .setHorizontalAlignment('left');
    row++;

    sheet.getRange(row, 1, 1, numCols)
      .setValues([['First Name', 'Last Name', 'Phone', 'Email']])
      .setBackground(BRAND.cream).setFontColor(BRAND.navy).setFontWeight('bold');
    row++;

    if (people.length) {
      var values = people.map(function (p) { return [p.firstName, p.lastName, p.phone, p.email]; });
      sheet.getRange(row, 1, values.length, numCols).setValues(values);
      applyAlternatingRows_(sheet, row, values.length, numCols);
      row += values.length;
    }

    row++;
  });

  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 240);
  sheet.setFrozenRows(1);
}
