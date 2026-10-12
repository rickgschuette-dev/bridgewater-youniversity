/* Bridgewater YOU - Class Discussion (teacher updates + classmate discussion).
 * Reads three published Google Sheet tabs (CSV) in the visitor's browser:
 *   Teacher Index     : one row per class (teacher, class, format, category, schedule, form links)
 *   Public Notes      : teacher updates (Posted, Teacher, Class, Title, Update) - no passcode column
 *   Public Discussion : student messages (Posted, Class, Name, Message); messages hidden in the sheet are already removed
 * Nothing here is secret. To change a data source, edit the three URLs below.
 * Posted text is always inserted as plain text (never as HTML), so it cannot change the page.
 */
(function () {
  'use strict';

  var BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRNHz_BHmBirYR9yELC-KnIHbwslG4YC1_7ZgKIf0WIi9lFDlsxqDlrSQkQSm950mwM2ozb50V-E3K6/pub';
  var INDEX_URL = BASE + '?gid=2033242745&single=true&output=csv';
  var NOTES_URL = BASE + '?gid=14847692&single=true&output=csv';
  var DISC_URL = BASE + '?gid=802831052&single=true&output=csv';
  var DISC_SHOW = 25; // newest messages shown before "Show earlier messages"
  var HOME = '/class-discussion';

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
    root.appendChild(status('Loading teachers…'));
    getCSV(INDEX_URL).then(function (index) {
      root.textContent = '';
      var teachers = groupTeachers(index);
      if (!teachers.length) { root.appendChild(status('No classes are listed yet. Please check back soon.')); return; }
      var ul = el('ul', { 'class': 'cd-grid' });
      teachers.forEach(function (t) {
        var kids = [el('b', { text: t.name })];
        t.classes.forEach(function (c) { kids.push(el('small', { text: c.Class })); });
        ul.appendChild(el('li', null, [el('a', { 'class': 'cd-card', href: HOME + '/' + t.slug }, kids)]));
      });
      root.appendChild(ul);
    }).catch(function () {
      root.textContent = '';
      root.appendChild(status('The teacher list could not be loaded. Please refresh the page in a moment.'));
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

  function fillDiscussion(box, list, ok, limit) {
    box.textContent = '';
    if (!ok) { box.appendChild(el('p', { 'class': 'cd-empty', text: 'Discussion could not be loaded just now. Please refresh the page in a moment.' })); return; }
    if (!list.length) { box.appendChild(el('p', { 'class': 'cd-empty', text: 'No messages yet. Be the first to say hello.' })); return; }
    list.slice(0, limit).forEach(function (m) {
      var p = el('p');
      addText(p, m.Message);
      box.appendChild(el('div', { 'class': 'cd-msg' }, [
        el('div', { 'class': 'cd-msg-head' }, [el('b', { text: m.Name || 'Student' }), el('time', { text: fmtDate(m.Posted) })]),
        p
      ]));
    });
    if (list.length > limit) {
      var more = el('button', { 'class': 'cd-link', type: 'button', text: 'Show earlier messages (' + (list.length - limit) + ')' });
      more.addEventListener('click', function () { fillDiscussion(box, list, ok, limit + DISC_SHOW); });
      box.appendChild(more);
    }
  }

  function formURL(u) { return /^https:\/\/docs\.google\.com\/forms\//.test(u || '') ? u : ''; }

  // a collapsible box that loads its Google form only when first opened
  function formBox(summaryText, hintText, url, frameTitle, extraClass, afterNote) {
    var body = el('div', { 'class': 'cd-box-body ' + (extraClass || '') });
    if (hintText) body.appendChild(el('p', { 'class': 'cd-hint', text: hintText }));
    var det = el('details', { 'class': 'cd-box' }, [el('summary', { text: summaryText }), body]);
    det.addEventListener('toggle', function () {
      if (det.open && !body.querySelector('iframe') && url) {
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
          el('a', { href: HOME, text: 'choose a teacher from the list' }),
          document.createTextNode('.')
        ]));
        return;
      }
      document.title = t.name + ' | Class Discussion | Bridgewater YOU';
      root.appendChild(el('a', { 'class': 'cd-back', href: HOME, text: '← All teachers' }));
      root.appendChild(el('h1', { text: t.name }));
      root.appendChild(el('div', { 'class': 'subtitle', text: t.classes.length === 1 ? '1 class this semester' : t.classes.length + ' classes this semester' }));

      var boxes = [], dboxes = [];
      t.classes.forEach(function (c) {
        var meta = el('p', { 'class': 'cd-meta' });
        if (c.Category) meta.appendChild(el('span', { 'class': 'cd-chip', text: c.Category }));
        meta.appendChild(document.createTextNode([c.Format, c.Schedule].filter(Boolean).join(' · ')));

        var url = formURL(c['Update form link']);
        var det = url ? formBox('Teacher: post an update',
          'Enter the teacher passcode, then your update. Click directly on the line beneath each question to type. Please do not include student names, phone numbers or email addresses.',
          url, 'Post an update for ' + c.Class, '', '') : null;

        var dUrl = formURL(c['Discussion form link']);
        var dDet = dUrl ? formBox('Students: join the discussion', '', dUrl, 'Join the discussion for ' + c.Class, 'cd-disc',
          ' New messages can take a few minutes to appear below.') : null;
        if (dDet) dDet.className = 'cd-box cd-join';

        var box = el('div');
        var dbox = el('div');
        var refresh = el('button', { 'class': 'cd-link', type: 'button', text: 'Refresh updates' });
        var dRefresh = el('button', { 'class': 'cd-link', type: 'button', text: 'Refresh discussion' });
        var sec = el('section', { 'class': 'cd-class', 'aria-label': c.Class }, [
          el('h2', { text: c.Class }), meta, det,
          el('div', { 'class': 'cd-head' }, [el('h3', { text: 'Updates' }), refresh]),
          box,
          el('div', { 'class': 'cd-head cd-disc-head' }, [el('h3', { text: 'Discussion' }), dRefresh]),
          dDet,
          dbox
        ]);
        boxes.push({ box: box, cls: c.Class, btn: refresh });
        dboxes.push({ box: dbox, cls: c.Class, btn: dRefresh });
        fillNotes(box, notesFor(notes.rows, c.Class), notes.ok);
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

  var root = document.getElementById('cd-app');
  if (!root) return;
  if (root.getAttribute('data-page') === 'index') renderIndex(root);
  else renderTeacher(root);
})();
