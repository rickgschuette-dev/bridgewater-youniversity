/**
 * BWU Waiting List Enrollment (NEW FILE)
 *
 * Add this as a NEW script file inside the SAME Apps Script project as
 * BWU_Registration_WebhookReceiver.gs (the project opened from the sheet
 * "BW_YOU_Winter_27_Class_Registration" via Extensions > Apps Script).
 * It does not change that file. It reuses SHEET_ID, WAITLIST_SHEET_NAME,
 * getSheet_ and rebuildReportTabs_ from it.
 *
 * What it does, every 5 minutes once installWaitlistWatcher() has been run:
 *  1. Reads "Maximum Students" for every class on the sheet
 *     "BWU Confirmed Classes" (tab "Approved by all instructors").
 *  2. For each class whose limit is HIGHER than the last limit it recorded,
 *     works out the open seats: new limit minus the number of different
 *     people already in Sheet1 for that class.
 *  3. Enrolls that many people from the "Waiting List" tab, earliest first.
 *     For each person: adds a row to Sheet1 (same Submission ID as the
 *     waiting-list row), copies the row to the "Waitlist Archive" tab,
 *     emails the person, and only then removes the row from "Waiting List".
 *  4. Rebuilds the report tabs once if anyone was enrolled.
 *
 * It only READS the Confirmed Classes sheet. It never edits class limits,
 * the registration form, or the seat-count feed.
 */

var WL_CONFIRMED_SHEET_ID = '17rk6A_mMc2XgF4CN08f0-IGTSYq0nSFnggNaoX1_FDU';
var WL_CONFIRMED_TAB_NAME = 'Approved by all instructors';
var WL_ARCHIVE_TAB_NAME = 'Waitlist Archive';
var WL_ARCHIVE_HEADERS = ['Timestamp', 'First Name', 'Last Name', 'Phone', 'Email',
  'Class Waitlisted For', 'Raw Submission', 'Submission ID',
  'Enrolled At', 'Enrolled Class', 'Email Sent'];
var WL_LAST_LIMITS_KEY = 'WL_LAST_LIMITS';
var WL_WATCH_FUNCTION = 'checkClassLimitsForWaitlist';

// Same old-title mapping the seat-count feed uses (normalized wording).
var WL_ALIASES = {
  'got dough lets make bread': 'got flour lets make bread',
  'home dyi': 'home diy'
};

// ---------- small helpers ----------

function wlNorm_(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wlKey_(s) {
  var n = wlNorm_(s);
  return WL_ALIASES[n] || n;
}

// One person = one email address; with no email, phone + name.
function wlPersonKey_(row) {
  var email = String(row[4] || '').trim().toLowerCase();
  if (email) return 'e:' + email;
  var phone = String(row[3] || '').replace(/\D+/g, '').slice(-10);
  return 'p:' + phone + '|' + wlNorm_(row[1]) + '|' + wlNorm_(row[2]);
}

// Waiting List phone cells can show "#ERROR!" (a "+" number read as a formula).
// If so, recover the phone from the saved form data in the Raw Submission cell.
// A leading "+" is dropped so the value is stored as a plain number, the same
// way the Sheet1 rows already look.
function wlCleanPhone_(phone, rawSubmission) {
  var p = String(phone == null ? '' : phone).trim();
  if (/^#[A-Z0-9\/!?]+$/.test(p)) {
    p = '';
    try {
      var parsed = JSON.parse(String(rawSubmission || ''));
      var sub = (parsed && parsed.payload) ? parsed.payload : parsed;
      var data = (sub && sub.data) || {};
      p = String(data.phone || data['phone-number'] || '').trim();
    } catch (err) { p = ''; }
  }
  return p.replace(/^\+/, '');
}

function wlGetArchiveSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(WL_ARCHIVE_TAB_NAME);
  if (!sheet) sheet = ss.insertSheet(WL_ARCHIVE_TAB_NAME);
  ensureHeaders_(sheet, WL_ARCHIVE_HEADERS);
  return sheet;
}

// Returns { classKey: { title, max (number or null), schedule } }
function wlReadLimits_() {
  var sh = SpreadsheetApp.openById(WL_CONFIRMED_SHEET_ID).getSheetByName(WL_CONFIRMED_TAB_NAME);
  if (!sh) throw new Error('Tab not found on the Confirmed Classes sheet: ' + WL_CONFIRMED_TAB_NAME);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error('Confirmed Classes tab is empty');

  var header = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iTitle = header.indexOf('class title');
  var iSched = header.indexOf('day, time & room');
  var iMax = -1;
  header.forEach(function (h, k) { if (iMax === -1 && /^max/.test(h)) iMax = k; });
  if (iTitle === -1 || iMax === -1) {
    throw new Error('Column "Class Title" or "Maximum Students" not found on the Confirmed Classes tab');
  }

  var out = {};
  for (var r = 1; r < values.length; r++) {
    var title = String(values[r][iTitle] || '').trim();
    if (!title) continue;
    var raw = String(values[r][iMax] == null ? '' : values[r][iMax]).trim();
    var max = (/^\d+$/.test(raw) && parseInt(raw, 10) > 0) ? parseInt(raw, 10) : null;
    out[wlKey_(title)] = {
      title: title,
      max: max,
      schedule: iSched > -1 ? String(values[r][iSched] || '').replace(/\s+/g, ' ').trim() : ''
    };
  }
  return out;
}

function wlStoreLimits_(limits) {
  var store = {};
  Object.keys(limits).forEach(function (k) { store[k] = limits[k].max; });
  PropertiesService.getScriptProperties().setProperty(WL_LAST_LIMITS_KEY, JSON.stringify(store));
}

// Different people already in Sheet1 for this class: { personKey: true }
function wlEnrolledPeople_(regSheet, classKey) {
  var people = {};
  var last = regSheet.getLastRow();
  if (last < 2) return people;
  var rows = regSheet.getRange(2, 1, last - 1, 8).getValues();
  rows.forEach(function (r) {
    if (wlKey_(r[5]) === classKey) people[wlPersonKey_(r)] = true;
  });
  return people;
}

function wlSendEnrolledEmail_(row, cls) {
  var email = String(row[4] || '').trim();
  if (!email) return 'no - no email address';
  try {
    var first = String(row[1] || '').trim() || 'there';
    var body =
      'Hi ' + first + ',\n\n' +
      'Good news! A seat has opened in the class below, and you have been moved from the waiting list into the class:\n\n' +
      '  ' + cls.title + '\n' +
      (cls.schedule ? '  ' + cls.schedule + '\n' : '') +
      '\nNo further action is needed. If anything looks incorrect, just reply to this email and let us know.\n\n' +
      'We look forward to seeing you in class!\n\n' +
      '— Bridgewater YOUniversity';
    MailApp.sendEmail({
      to: email,
      subject: 'You\'re now enrolled: ' + cls.title,
      body: body,
      name: 'Bridgewater YOUniversity'
    });
    return 'yes';
  } catch (err) {
    console.error('wlSendEnrolledEmail_ failed for ' + email + ': ' + err.message);
    return 'FAILED: ' + err.message;
  }
}

// Enrolls waiting-list people for ONE class, up to its open seats.
// Returns how many people were enrolled.
function wlProcessClass_(cls, classKey, regSheet, waitSheet, archSheet) {
  if (cls.max === null) return 0;

  var people = wlEnrolledPeople_(regSheet, classKey);
  var open = cls.max - Object.keys(people).length;

  var last = waitSheet.getLastRow();
  if (last < 2) return 0;
  var rows = waitSheet.getRange(2, 1, last - 1, 8).getValues();

  var enrolled = 0;
  var rowNumsToDelete = [];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (wlKey_(r[5]) !== classKey) continue;

    var pk = wlPersonKey_(r);
    var archiveTail;

    if (people[pk]) {
      // Already enrolled in this class: no seat, no email; just tidy the waiting list.
      archiveTail = [new Date(), cls.title, 'no - already enrolled'];
    } else {
      if (open <= 0) break;
      try {
        regSheet.appendRow([r[0], r[1], r[2], wlCleanPhone_(r[3], r[6]), r[4], cls.title, r[6], r[7]]);
      } catch (err) {
        console.error('Could not add to Sheet1, left on waiting list: ' + err.message);
        continue;
      }
      people[pk] = true;
      open--;
      enrolled++;
      archiveTail = [new Date(), cls.title, wlSendEnrolledEmail_(r, cls)];
    }

    try {
      archSheet.appendRow(r.slice(0, 8).concat(archiveTail));
    } catch (err) {
      // Archive failed: do NOT remove the waiting-list row, so no record is lost.
      console.error('Could not write archive row, waiting-list row kept: ' + err.message);
      continue;
    }
    rowNumsToDelete.push(i + 2);
  }

  // Remove from the bottom up so row numbers stay correct.
  rowNumsToDelete.sort(function (a, b) { return b - a; });
  rowNumsToDelete.forEach(function (n) { waitSheet.deleteRow(n); });

  return enrolled;
}

// ---------- the 5-minute check ----------

function checkClassLimitsForWaitlist() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    console.log('Another run is in progress; skipped this one.');
    return;
  }
  try {
    var limits = wlReadLimits_();
    var props = PropertiesService.getScriptProperties();
    var last = JSON.parse(props.getProperty(WL_LAST_LIMITS_KEY) || '{}');

    var regSheet = getSheet_();
    var waitSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(WAITLIST_SHEET_NAME);
    if (!waitSheet) throw new Error('Tab not found: ' + WAITLIST_SHEET_NAME);
    var archSheet = wlGetArchiveSheet_();

    var total = 0;
    Object.keys(limits).forEach(function (key) {
      var cls = limits[key];
      if (cls.max === null) return;
      if (!(key in last)) return;          // class not seen before: just record it
      var before = last[key];              // may be null (had no limit)
      if (before === null || cls.max > before) {
        total += wlProcessClass_(cls, key, regSheet, waitSheet, archSheet);
      }
    });

    wlStoreLimits_(limits);
    if (total > 0) rebuildReportTabs_(regSheet);
    console.log('Limit check finished. People enrolled from the waiting list: ' + total);
  } finally {
    lock.releaseLock();
  }
}

// ---------- one-time setup and rollback (run from the editor) ----------

// Run ONCE. Records today's limits as the starting point (nobody is enrolled
// by this step), creates the archive tab, and starts the 5-minute timer.
function installWaitlistWatcher() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === WL_WATCH_FUNCTION) ScriptApp.deleteTrigger(t);
  });
  var limits = wlReadLimits_();
  wlStoreLimits_(limits);
  wlGetArchiveSheet_();
  ScriptApp.newTrigger(WL_WATCH_FUNCTION).timeBased().everyMinutes(5).create();
  Logger.log('Installed. Starting limits recorded for ' + Object.keys(limits).length +
    ' classes. The check will run every 5 minutes.');
}

// Rollback: stops the timer. Waiting List, Sheet1 and the archive are untouched.
function removeWaitlistWatcher() {
  var n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === WL_WATCH_FUNCTION) { ScriptApp.deleteTrigger(t); n++; }
  });
  Logger.log('Removed ' + n + ' timer(s).');
}

// Manual use (run from the editor): enroll waiting-list people for ONE class
// up to its current limit, whether or not the limit just changed. Change the
// title between the quotes, then Run.
function enrollWaitlistForClassNow() {
  var TITLE = 'Navigating Changes in the Second Half of Life';
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var limits = wlReadLimits_();
    var key = wlKey_(TITLE);
    if (!limits[key]) throw new Error('Class not found on the Confirmed Classes tab: ' + TITLE);
    var regSheet = getSheet_();
    var waitSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(WAITLIST_SHEET_NAME);
    if (!waitSheet) throw new Error('Tab not found: ' + WAITLIST_SHEET_NAME);
    var n = wlProcessClass_(limits[key], key, regSheet, waitSheet, wlGetArchiveSheet_());
    if (n > 0) rebuildReportTabs_(regSheet);
    Logger.log('People enrolled from the waiting list for "' + TITLE + '": ' + n);
  } finally {
    lock.releaseLock();
  }
}
