/* Bridgewater YOU - Class Discussion and Seminar Discussion (teacher updates + classmate discussion).
 * One script serves both. A page marked data-kind="seminar" reads the three seminar tabs instead of the
 * three class tabs (same column headings), and uses seminar wording. Everything else is identical.
 * Reads three published Google Sheet tabs (CSV) in the visitor's browser:
 *   Teacher Index     : one row per class (teacher, class, format, category, schedule, form links)
 *   Public Notes      : teacher updates (Posted, Teacher, Class, Title, Update) - no passcode column
 *   Public Discussion : student messages (Posted, Class, Name, Message); messages hidden in the sheet are already removed
 * Nothing here is secret. To change a data source, edit the URLs below (class tabs, then seminar tabs).
 * Posted text is always inserted as plain text (never as HTML), so it cannot change the page.
 */
(function () {
  'use strict';

  var BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNHz_BHmBirYR9yELC-KnIHbwslG4YC1_7ZgKIf0WIi9lFDlsxqDlrSQkQSm950mwM2ozb50V-E3K6/pub';
  var appEl = document.getElementById('cd-app');
  var SEM = !!appEl && appEl.getAttribute('data-kind') === 'seminar';
  var GIDS = SEM
    ? { index: '1130850226', notes: '763731280', disc: '701980731' }
    : { index: '2033242745', notes: '14847692', disc: '802831052' };
  var INDEX_URL = BASE + '?gid=' + GIDS.index + '&single=true&output=csv';
  var NOTES_URL = BASE + '?gid=' + GIDS.notes + '&single=true&output=csv';
  var DISC_URL = BASE + '?gid=' + GIDS.disc + '&single=true&output=csv';
  var FILES_API = '/api/class-files';
  var DISC_SHOW = 25; // newest messages shown before "Show earlier messages"
  var HOME = SEM ? '/seminar-discussion' : '/class-discussion';
  // wording that differs between the two sections
  var WHO = SEM ? 'Seminar leader' : 'Teacher';
  var WHO_LIST = SEM ? 'seminar leaders' : 'teachers';
  var WHAT = SEM ? 'seminar' : 'class';
  var WHATS = SEM ? 'seminars' : 'classes';
  var SECTION = SEM ? 'Seminar Discussion' : 'Class Discussion';
  var SLUG_PREFIX = SEM ? 'sem-' : ''; // keeps seminar files apart from class files in storage

  // ---------- helpers ----------
  function parseCSV(text) {
    var rows = [], row = [], cur = '', q = false, i, c;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || (r[0] && r[0].trim() !== ''); });
  }

  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); });
      return o;
    });
  }

  function getCSV(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) {
      if (/^\s*<!doctype html|^\s*<html/i.test(t)) throw new Error('not CSV');
      return toObjects(parseCSV(t));
    });
  }

  function slugify(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim().toLowerCase(); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  // text with clickable http(s) links, built without innerHTML so posted text can never inject markup
  function addText(parent, text) {
    var re = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      parent.appendChild(el('a', { href: m[0], target: '_blank', rel: 'noopener noreferrer', text: m[0] }));
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function fmtDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s);
    if (!m) return s;
    var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function groupTeachers(index) {
    var by = {}, order = [];
    index.forEach(function (r) {
      if (!r.Teacher || !r.Class) return;
      var slug = slugify(r.Teacher);
      if (!by[slug]) { by[slug] = { name: r.Teacher, slug: slug, classes: [] }; order.push(slug); }
      by[slug].classes.push(r);
    });
    return order.map(function (s) { return by[s]; });
  }

  function status(msg) { return el('p', { 'class': 'cd-status', role: 'status', text: msg }); }

  // ---------- landing page ----------
  function renderIndex(root) {
    root.textContent = '';
    root.appendChild(status('Loading ' + WHO_LIST + '…'));
    getCSV(INDEX_URL).then(function (index) {
      root.textContent = '';
      var teachers = groupTeachers(index);
      if (!teachers.length) { root.appendChild(status('No ' + WHATS + ' are listed yet. Please check back soon.')); return; }
      var ul = el('ul', { 'class': 'cd-grid' });
      teachers.forEach(function (t) {
        var kids = [el('b', { text: t.name })];
        t.classes.forEach(function (c) { kids.push(el('small', { text: c.Class })); });
        ul.appendChild(el('li', null, [el('a', { 'class': 'cd-card', href: HOME + '/' + t.slug }, kids)]));
      });
      root.appendChild(ul);
    }).catch(function () {
      root.textContent = '';
      root.appendChild(status('The list of ' + WHO_LIST + ' could not be loaded. Please refresh the page in a moment.'));
    });
  }

  // ---------- teacher page ----------
  function slugFromPath() {
    var p = decodeURIComponent(location.pathname).replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
    var parts = p.split('/');
    return parts.length > 1 ? slugify(parts[parts.length - 1]) : '';
  }

  function notesFor(rows, cls) {
    var key = norm(cls);
    return rows.filter(function (n) { return norm(n.Class) === key; });
  }

  function fillNotes(box, list, ok) {
    box.textContent = '';
    if (!ok) { box.appendChild(el('p', { 'class': 'cd-empty', text: 'Updates could not be loaded just now. Please refresh the page in a moment.' })); return; }
    if (!list.length) { box.appendChild(el('p', { 'class': 'cd-empty', text: 'No updates have been posted yet.' })); return; }
    list.forEach(function (n) {
      var p = el('p');
      addText(p, n.Update);
      box.appendChild(el('div', { 'class': 'cd-note' }, [
        el('h4', { text: n.Title || 'Update' }),
        el('time', { text: fmtDate(n.Posted) }),
        p
      ]));
    });
  }

  function msgNode(m) {
    var p = el('p');
    addText(p, m.Message);
    return el('div', { 'class': 'cd-msg' }, [
      el('div', { 'class': 'cd-msg-head' }, [el('b', { text: m.Name || 'Student' }), el('time', { text: fmtDate(m.Posted) })]),
      p
    ]);
  }

  // The newest message is always shown; older ones sit inside a collapsible "See full discussion" box.
  function fillDiscussion(box, list, ok, limit) {
    var prev = box.querySelector('details');
    var wasOpen = !!(prev && prev.open);
    box.textContent = '';
    if (!ok) { box.appendChild(el('p', { 'class': 'cd-empty', text: 'Discussion could not be loaded just now. Please refresh the page in a moment.' })); return; }
    if (!list.length) { box.appendChild(el('p', { 'class': 'cd-empty', text: 'No messages yet. Be the first to say hello.' })); return; }
    box.appendChild(msgNode(list[0]));
    if (list.length < 2) return;
    var older = list.length - 1;
    var body = el('div', { 'class': 'cd-box-body' });
    list.slice(1, Math.max(limit, 2)).forEach(function (m) { body.appendChild(msgNode(m)); });
    if (list.length > limit) {
      var more = el('button', { 'class': 'cd-link', type: 'button', text: 'Show earlier messages (' + (list.length - limit) + ')' });
      more.addEventListener('click', function () { fillDiscussion(box, list, ok, limit + DISC_SHOW); });
      body.appendChild(more);
    }
    var det = el('details', { 'class': 'cd-box cd-older' }, [
      el('summary', { text: 'See full discussion (' + older + (older === 1 ? ' earlier message)' : ' earlier messages)') }),
      body
    ]);
    if (wasOpen) det.open = true;
    box.appendChild(det);
  }


  // ---------- class files (PDF / Word) ----------
  var FILE_MAX = 4 * 1024 * 1024;

  function classSlug(name) { return (SLUG_PREFIX + slugify(name)).slice(0, 80); }

  function fmtSize(n) {
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function fmtIso(s) {
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function postFiles(fields) {
    var fd = new FormData();
    Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });
    return fetch(FILES_API, { method: 'POST', body: fd }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, body: j }; }, function () { return { ok: false, body: { error: 'Something went wrong. Please try again.' } }; });
    }, function () { return { ok: false, body: { error: 'Could not reach the server. Please check your connection and try again.' } }; });
  }

  // The "Files" list for one class. Hidden until the class has at least one file.
  function filesSection(slug) {
    var list = el('div', { 'class': 'cd-files' });
    var sec = el('div', { 'class': 'cd-filesec', hidden: 'hidden' }, [
      el('div', { 'class': 'cd-head' }, [el('h3', { text: 'Files' })]),
      list
    ]);
    function load() {
      return fetch(FILES_API + '?class=' + encodeURIComponent(slug)).then(function (r) { return r.json(); }).then(function (j) {
        draw(j.files || []);
      }, function () { /* leave the list as it was */ });
    }
    function draw(files) {
      list.textContent = '';
      sec.hidden = !files.length;
      files.forEach(function (f) {
        var status = el('span', { 'class': 'cd-rm-msg', role: 'status' });
        var pass = el('input', { type: 'text', 'class': 'cd-input', autocomplete: 'off', 'aria-label': WHO + ' passcode', placeholder: WHO + ' passcode' });
        var go = el('button', { type: 'button', 'class': 'cd-btn', text: 'Remove file' });
        var no = el('button', { type: 'button', 'class': 'cd-link', text: 'Cancel' });
        var rm = el('div', { 'class': 'cd-rm', hidden: 'hidden' }, [pass, go, no, status]);
        var open = el('button', { type: 'button', 'class': 'cd-link cd-rm-open', text: 'Remove' });
        open.addEventListener('click', function () { rm.hidden = false; open.hidden = true; pass.focus(); });
        no.addEventListener('click', function () { rm.hidden = true; open.hidden = false; status.textContent = ''; pass.value = ''; });
        go.addEventListener('click', function () {
          status.textContent = 'Removing…';
          postFiles({ action: 'remove', passcode: pass.value, 'class': slug, id: f.id }).then(function (res) {
            if (res.ok) load(); else status.textContent = res.body.error || 'Could not remove the file.';
          });
        });
        list.appendChild(el('div', { 'class': 'cd-file' }, [
          el('a', { href: f.url, target: '_blank', rel: 'noopener', text: f.name }),
          el('span', { 'class': 'cd-file-meta', text: [f.type, fmtSize(f.size), fmtIso(f.uploaded)].filter(Boolean).join(' · ') }),
          open, rm
        ]));
      });
    }
    return { node: sec, reload: load };
  }

  // The teacher's "add a file" box.
  function fileBox(slug, cls, onAdded) {
    var pass = el('input', { type: 'text', id: 'cdp-' + slug, 'class': 'cd-input', autocomplete: 'off' });
    var file = el('input', { type: 'file', id: 'cdf-' + slug, 'class': 'cd-input', accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    var send = el('button', { type: 'button', 'class': 'cd-btn', text: 'Send file' });
    var status = el('p', { 'class': 'cd-upmsg', role: 'status' });
    var body = el('div', { 'class': 'cd-box-body' }, [
      el('p', { 'class': 'cd-hint', text: 'Choose a PDF or Word file (4 MB or smaller), type the ' + WHO.toLowerCase() + ' passcode, then click Send file. Please do not include student names, phone numbers or email addresses.' }),
      el('div', { 'class': 'cd-field' }, [el('label', { 'for': 'cdp-' + slug, text: WHO + ' passcode' }), pass]),
      el('div', { 'class': 'cd-field' }, [el('label', { 'for': 'cdf-' + slug, text: 'File' }), file]),
      send, status
    ]);
    send.addEventListener('click', function () {
      status.className = 'cd-upmsg';
      var f = file.files && file.files[0];
      if (!f) { status.textContent = 'Please choose a file first.'; return; }
      if (f.size > FILE_MAX) { status.textContent = 'That file is too large. The limit is 4 MB. Please choose a smaller file.'; return; }
      if (!/\.(pdf|docx?)$/i.test(f.name)) { status.textContent = 'Only PDF and Word files (.pdf, .doc, .docx) can be added.'; return; }
      send.disabled = true; status.textContent = 'Sending…';
      postFiles({ action: 'upload', passcode: pass.value, 'class': slug, file: f }).then(function (res) {
        send.disabled = false;
        if (res.ok) {
          status.className = 'cd-upmsg cd-upok';
          status.textContent = 'Your file has been added.';
          file.value = '';
          onAdded();
        } else {
          status.textContent = res.body.error || 'The file could not be added.';
        }
      });
    });
    return el('details', { 'class': 'cd-box' }, [el('summary', { text: WHO + ': add a file' }), body]);
  }

  function formURL(u) { return /^https:\/\/docs\.google\.com\/forms\//.test(u || '') ? u : ''; }

  // a collapsible box that loads its Google form only when first opened
  function formBox(summaryText, hintText, url, frameTitle, extraClass, afterNote) {
    var body = el('div', { 'class': 'cd-box-body ' + (extraClass || '') });
    if (hintText) body.appendChild(el('p', { 'class': 'cd-hint', text: hintText }));
    var det = el('details', { 'class': 'cd-box' }, [el('summary', { text: summaryText }), body]);
    det.addEventListener('toggle', function () {
      if (det.open && !body.querySelector('iframe') && url) {
        // Google's thank-you screen cannot hold a button, so the way back sits just above the form
        body.appendChild(el('p', { 'class': 'cd-backwrap' }, [el('a', { 'class': 'cd-backbtn', href: '/winter-semester.html', text: 'Back to Winter Semester ’27' })]));
        body.appendChild(el('iframe', { src: url, title: frameTitle, loading: 'lazy' }));
        var kids = [el('a', { href: url.replace(/&embedded=true/, ''), target: '_blank', rel: 'noopener', text: 'Form not showing? Open it in its own page.' })];
        if (afterNote) kids.push(document.createTextNode(afterNote));
        body.appendChild(el('p', { 'class': 'cd-fallback' }, kids));
      }
    });
    return det;
  }

  function renderTeacher(root) {
    var slug = slugFromPath();
    if (!slug) { location.replace(HOME); return; }
    root.textContent = '';
    root.appendChild(status('Loading…'));
    Promise.all([
      getCSV(INDEX_URL),
      getCSV(NOTES_URL).then(function (n) { return { ok: true, rows: n }; }, function () { return { ok: false, rows: [] }; }),
      getCSV(DISC_URL).then(function (n) { return { ok: true, rows: n }; }, function () { return { ok: false, rows: [] }; })
    ]).then(function (res) {
      var t = groupTeachers(res[0]).filter(function (x) { return x.slug === slug; })[0];
      var notes = res[1], disc = res[2];
      root.textContent = '';
      if (!t) {
        document.title = 'Page not found | Bridgewater YOU';
        root.appendChild(el('h1', { text: 'We could not find that page' }));
        root.appendChild(el('p', null, [
          document.createTextNode('Please check the address, or '),
          el('a', { href: HOME, text: 'choose from the list' }),
          document.createTextNode('.')
        ]));
        return;
      }
      document.title = t.name + ' | ' + SECTION + ' | Bridgewater YOU';
      root.appendChild(el('a', { 'class': 'cd-back', href: HOME, text: '← Back to all ' + WHO_LIST + ' page' }));
      root.appendChild(el('h1', { text: t.name }));
      root.appendChild(el('div', { 'class': 'subtitle', text: t.classes.length === 1 ? '1 ' + WHAT + ' this semester' : t.classes.length + ' ' + WHATS + ' this semester' }));

      var boxes = [], dboxes = [];
      t.classes.forEach(function (c) {
        var meta = el('p', { 'class': 'cd-meta' });
        if (c.Category) meta.appendChild(el('span', { 'class': 'cd-chip', text: c.Category }));
        meta.appendChild(document.createTextNode([c.Format, c.Schedule].filter(Boolean).join(' · ')));

        var url = formURL(c['Update form link']);
        var det = url ? formBox(WHO + ': post an update',
          'Enter the ' + WHO.toLowerCase() + ' passcode, then your update. Click directly on the line beneath each question to type. Please do not include student names, phone numbers or email addresses.',
          url, 'Post an update for ' + c.Class, '', '') : null;

        var dUrl = formURL(c['Discussion form link']);
        var dDet = dUrl ? formBox((SEM ? 'Attendees' : 'Students') + ': join the discussion', '', dUrl, 'Join the discussion for ' + c.Class, 'cd-disc',
          ' New messages can take a few minutes to appear below.') : null;
        if (dDet) dDet.className = 'cd-box cd-join';

        var box = el('div');
        var dbox = el('div');
        var refresh = el('button', { 'class': 'cd-link', type: 'button', text: 'Refresh updates' });
        var dRefresh = el('button', { 'class': 'cd-link', type: 'button', text: 'Refresh discussion' });
        var slug = classSlug(c.Class);
        var files = filesSection(slug);
        var fBox = fileBox(slug, c.Class, files.reload);
        var sec = el('section', { 'class': 'cd-class', 'aria-label': c.Class }, [
          el('h2', { text: c.Class }), meta, det, fBox,
          el('div', { 'class': 'cd-head' }, [el('h3', { text: 'Updates' }), refresh]),
          box,
          files.node,
          el('div', { 'class': 'cd-head cd-disc-head' }, [el('h3', { text: 'Discussion' }), dRefresh]),
          dDet,
          dbox
        ]);
        boxes.push({ box: box, cls: c.Class, btn: refresh });
        dboxes.push({ box: dbox, cls: c.Class, btn: dRefresh });
        fillNotes(box, notesFor(notes.rows, c.Class), notes.ok);
        files.reload();
        fillDiscussion(dbox, notesFor(disc.rows, c.Class), disc.ok, DISC_SHOW);
        refresh.addEventListener('click', function () {
          boxes.forEach(function (b) { b.btn.textContent = 'Refreshing…'; });
          getCSV(NOTES_URL).then(function (rows) { notes = { ok: true, rows: rows }; }, function () { notes = { ok: false, rows: [] }; })
            .then(function () {
              boxes.forEach(function (b) { fillNotes(b.box, notesFor(notes.rows, b.cls), notes.ok); b.btn.textContent = 'Refresh updates'; });
            });
        });
        dRefresh.addEventListener('click', function () {
          dboxes.forEach(function (b) { b.btn.textContent = 'Refreshing…'; });
          getCSV(DISC_URL).then(function (rows) { disc = { ok: true, rows: rows }; }, function () { disc = { ok: false, rows: [] }; })
            .then(function () {
              dboxes.forEach(function (b) { fillDiscussion(b.box, notesFor(disc.rows, b.cls), disc.ok, DISC_SHOW); b.btn.textContent = 'Refresh discussion'; });
            });
        });
        root.appendChild(sec);
      });
    }).catch(function () {
      root.textContent = '';
      root.appendChild(status('This page could not be loaded. Please refresh in a moment.'));
    });
  }

  var root = appEl;
  if (!root) return;
  if (root.getAttribute('data-page') === 'index') renderIndex(root);
  else renderTeacher(root);
})();
