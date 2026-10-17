/**
 * BWU Winter '27 - Seat Count Feed, version 2 (READ-ONLY)
 *
 * Replaces the entire contents of Code.gs in the Apps Script project
 * attached to the sheet "BWU Winter 27 Registrants".
 *
 * What it does: reads the existing registration sheet
 * "BW YOU Winter 27 Class Registration" (tab Sheet1) and returns, as JSON,
 * how many people are registered for each class. It NEVER writes to that
 * sheet and NEVER returns names, phones or emails.
 *
 * Each registration row counts once: rows are de-duplicated by their
 * Submission ID (column "Submission ID"), so a repeated row cannot inflate
 * a count.
 */

var REG_SHEET_ID = '1kIgiwfR0OZMovRl5sLm5x5ndI_7g0sARnx2IBzm7aJI';
var REG_TAB_NAME = 'Sheet1';
var CACHE_SECONDS = 60;   // counts may lag by up to this many seconds

// Class titles are matched ignoring capitals and punctuation, so
// "Oh, My Aching Hips" and "Oh My Aching Hips" count as the same class.
// The registration page must use exactly the same rule.
function norm_(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Old or misspelled titles already in the registration sheet, mapped to the
// current class title. Both sides are written in normalized form
// (lowercase, no punctuation). Add a line here only if a title is changed
// AFTER people have registered under the old wording.
var ALIASES = {
  'got dough lets make bread': 'got flour lets make bread',
  'home dyi': 'home diy'
};

function classKey_(raw) {
  var n = norm_(raw);
  return ALIASES[n] || n;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function build_(sheetId, tabName) {
  var sh = SpreadsheetApp.openById(sheetId).getSheetByName(tabName);
  if (!sh) throw new Error('Tab not found: ' + tabName);
  var values = sh.getDataRange().getValues();
  if (values.length < 1) throw new Error('Sheet is empty');

  var header = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iClass = header.indexOf('class registered for');
  var iId = header.indexOf('submission id');
  var iEmail = header.indexOf('email');
  if (iClass === -1) throw new Error('Column "Class Registered For" not found');

  var seen = {};
  var counts = {};
  var submissions = {};
  var rows = 0;
  for (var r = 1; r < values.length; r++) {
    var title = classKey_(values[r][iClass]);
    if (!title) continue;
    var id = iId > -1 ? String(values[r][iId]).trim() : '';
    var key = id ? id : ((iEmail > -1 ? norm_(values[r][iEmail]) : '') + '|' + title);
    if (seen[key]) continue;
    seen[key] = true;
    rows++;
    counts[title] = (counts[title] || 0) + 1;
    if (id) submissions[id.split('::')[0]] = true;
  }
  return {
    ok: true,
    counts: counts,
    totalRows: rows,
    submissions: Object.keys(submissions).length,
    updated: new Date().toISOString()
  };
}

function doGet() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('feed');
  if (hit) {
    return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
  }
  var out;
  try {
    out = build_(REG_SHEET_ID, REG_TAB_NAME);
    cache.put('feed', JSON.stringify(out), CACHE_SECONDS);
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return json_(out);
}

// ---- Test helpers: run from the editor; the website never calls these ----

function testFeed() {
  Logger.log(JSON.stringify(build_(REG_SHEET_ID, REG_TAB_NAME)));
}

// Negative test: asking for a tab that does not exist must be refused,
// not return counts.
function testBadTab() {
  try {
    build_(REG_SHEET_ID, 'No Such Tab');
    Logger.log('FAIL: a missing tab was accepted');
  } catch (err) {
    Logger.log('PASS - refused as expected: ' + err);
  }
}
