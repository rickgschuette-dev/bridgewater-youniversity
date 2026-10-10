#!/usr/bin/env python3
"""
Generates every static HTML page for the Bridgewater YOU site
from a single template, so the header/nav stays identical across pages.
Run this after editing PAGES or the TEMPLATE, then commit the generated
.html files (the .html files themselves are what gets deployed --
this script is a build helper, not something a browser loads).
"""

# ---------------------------------------------------------------------------
# Watch Live page: YouTube channel setting.
# Paste the Bridgewater Live channel's ID (24 characters, starting with "UC")
# between the quotes below, then rebuild. While it is empty, the Watch Live
# page shows a "coming soon" box instead of the player.
# ---------------------------------------------------------------------------
YOUTUBE_CHANNEL_ID = "UCsV0kfrNoQiOhHoGyDmNRlw"


def build_watch_live_body():
    if not YOUTUBE_CHANNEL_ID:
        return """
        <div class="coming-soon"><strong>Live streaming coming soon.</strong></div>
        """
    cid = YOUTUBE_CHANNEL_ID
    return f"""
        <p>Watch our classes and events live from home. When a broadcast is
        on, it appears in the player below automatically.</p>
        <div class="video-frame">
          <iframe src="https://www.youtube.com/embed/live_stream?channel={cid}"
                  title="Bridgewater YOU live broadcast"
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  referrerpolicy="strict-origin-when-cross-origin"
                  allowfullscreen></iframe>
        </div>
        <p class="video-note">If the player says the video is unavailable, no
        broadcast is on right now. Check the
        <a href="class-schedule.html">Class Schedule</a> for upcoming sessions,
        or <a href="https://www.youtube.com/channel/{cid}/live"
        target="_blank" rel="noopener">open the broadcast on YouTube</a>.</p>
        """


NAV_ITEMS = [
    ("Home", "index.html", "home"),
    ("Class Registration", "registration.html", "book"),
    ("Class Schedule", "class-schedule.html", "palette"),
    ("Your Teachers", "teachers.html", "coffee"),
    ("Info Updates", "info-updates.html", "music"),
    ("Watch Live", "watch-live.html", "video"),
    ("Join Our Admin", "forum.html", "speech"),
]

# Framing Committee volunteer sign-up: committee name -> list of responsibilities
COMMITTEES = [
    (
        "Registrar",
        [
            "Maintain the official credit database",
            "Track attendance and completion",
            "Verify credits and process degree applications",
            "Issue official credit records and completion certificates",
            "Maintain historical records (teachers, student lists, admin notes, etc.)",
        ],
    ),
    (
        "Communications &amp; Marketing",
        [
            "Create and manage all external and internal messaging",
            "Facebook posts, HOA newsletters, flyers, website content",
            "Promote upcoming classes and recognition",
            "Publish calendar of class schedule and room locations",
            "Coordinate with HOA communications channels",
        ],
    ),
    (
        "Curriculum &amp; Instructor Coordination",
        [
            "Recruit and support instructors",
            "Develop new course proposals",
            "Assign credit values to new classes",
            "Collect course descriptions and lesson plans",
            "Maintain the course catalog",
        ],
    ),
    (
        "Operations &amp; Logistics",
        [
            "Room scheduling and set up",
            "Technology support (TV, projectors, sound)",
            "Supplies and materials coordination",
            "Class evaluation / feedback surveys",
            "Coordinate with amenities staff for room set up",
        ],
    ),
    (
        "Events &amp; Recognition",
        [
            "Plans &amp; executes recognition events",
            "Designs and produces completion certificates",
            "Coordinates teacher receptions and student celebrations",
            "Manage graduate lists and photo opportunities",
            "Coordinates with Marketing &amp; Promotions",
        ],
    ),
    (
        "Tech &amp; Video Production",
        [
            "Livestream and record classes and events on the Bridgewater Live YouTube channel",
            "Set up and test cameras, microphones, and streaming equipment",
            "Help instructors with technology for their classes",
            "Edit and publish class recordings and video highlights",
            "Maintain the Watch Live page and video library with Communications &amp; Marketing",
        ],
    ),
]


def build_committee_block(name):
    heading, duties = name
    duties_html = "\n".join(f"          <li>{d}</li>" for d in duties)
    return f"""      <div class="committee-option">
        <label class="committee-label">
          <input type="radio" name="committee" value="{heading.replace('&amp;', 'and')}" required>
          <span class="committee-title">{heading}</span>
        </label>
        <ol class="committee-duties">
{duties_html}
        </ol>
      </div>"""


def build_forum_body():
    committee_blocks = "\n".join(build_committee_block(c) for c in COMMITTEES)
    return f"""
        <p>Want to be part of what Bridgewater YOU is all about? Join us as
        we start preparing for next semester. Please review the
        committee platforms on this form and submit the form with your
        selection for the committee you would find most interesting. You can
        be part of more than one committee, but please submit a separate form
        for each committee you select. Thank you.</p>
        <p class="signature">&mdash; Rick Schuette, Admin Coordinator</p>

        <form name="volunteer-signup" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" action="forum-thank-you.html" class="volunteer-form">
          <input type="hidden" name="form-name" value="volunteer-signup">
          <p class="hidden-field"><label>Don't fill this out if you're human: <input name="bot-field"></label></p>

          <div class="form-two-col form-three-col">
            <div class="form-row">
              <label for="volunteer-name">Full Name</label>
              <input type="text" id="volunteer-name" name="name" required>
            </div>

            <div class="form-row">
              <label for="volunteer-email">Email</label>
              <input type="email" id="volunteer-email" name="email" required>
            </div>

            <div class="form-row">
              <label for="volunteer-phone">Phone / Text Number</label>
              <input type="tel" id="volunteer-phone" name="phone" autocomplete="tel" required>
            </div>
          </div>

          <fieldset class="committee-fieldset">
            <legend>Please select only one committee. Thank you.</legend>
{committee_blocks}
          </fieldset>

          <div class="form-row">
            <label for="volunteer-message">Anything else you'd like us to know?</label>
            <textarea id="volunteer-message" name="message" rows="4"></textarea>
          </div>

          <button type="submit" class="submit-button">Submit</button>
        </form>
        """

def build_teachers_body():
    return """
        <h2>Interested in Leading a Class, Discussion or Activity?</h2>
        <p>Bridgewater YOU is always looking for residents willing to
        share their knowledge and experience with their neighbors. If you have
        a class, seminar, or skill you'd like to teach, please complete the
        form below and a member of our Curriculum &amp; Instructor
        Coordination committee will be in touch.</p>
        <p class="signature">&mdash; Rick Schuette, Admin Coordinator</p>

        <form name="teacher-signup" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" action="teachers-thank-you.html" class="volunteer-form">
          <input type="hidden" name="form-name" value="teacher-signup">
          <p class="hidden-field"><label>Don't fill this out if you're human: <input name="bot-field"></label></p>

          <div class="form-two-col">
            <div class="form-row">
              <label for="teacher-first-name">First Name</label>
              <input type="text" id="teacher-first-name" name="first-name" required>
            </div>

            <div class="form-row">
              <label for="teacher-last-name">Last Name</label>
              <input type="text" id="teacher-last-name" name="last-name" required>
            </div>
          </div>

          <div class="form-two-col">
            <div class="form-row">
              <label for="teacher-email">Email</label>
              <input type="email" id="teacher-email" name="email" required>
            </div>

            <div class="form-row">
              <label for="teacher-phone">Phone Number</label>
              <input type="tel" id="teacher-phone" name="phone" required>
            </div>
          </div>

          <div class="form-row">
            <label for="teacher-class">Proposed Class to Teach</label>
            <textarea id="teacher-class" name="proposed-class" rows="3" required></textarea>
          </div>

          <fieldset class="format-fieldset">
            <legend>Class Format <span aria-hidden="true">*</span> <span class="format-hint">(select all that apply)</span></legend>
            <div class="format-options">
              <label class="format-label">
                <input type="checkbox" name="format-1x-seminar" value="Yes">
                <span>1x Seminar</span>
              </label>
              <label class="format-label">
                <input type="checkbox" name="format-3-week-series" value="Yes">
                <span>3-Week Series</span>
              </label>
              <label class="format-label">
                <input type="checkbox" name="format-6-week-series" value="Yes">
                <span>6-Week Series</span>
              </label>
              <label class="format-label">
                <input type="checkbox" name="format-other" id="teacher-format-other" value="Yes">
                <span>Other</span>
              </label>
            </div>
            <div class="form-row format-other-detail" id="format-other-detail" hidden>
              <label for="teacher-format-other-text">Please specify</label>
              <input type="text" id="teacher-format-other-text" name="format-other-detail">
            </div>
            <p class="field-error" id="format-error" hidden>Please select at least one class format.</p>
          </fieldset>

          <button type="submit" class="submit-button">Submit</button>
        </form>

        <script>
        (function () {
          var form = document.forms["teacher-signup"];
          if (!form) return;

          var otherCheckbox = document.getElementById("teacher-format-other");
          var otherDetail = document.getElementById("format-other-detail");
          if (otherCheckbox && otherDetail) {
            otherCheckbox.addEventListener("change", function () {
              otherDetail.hidden = !otherCheckbox.checked;
              if (otherCheckbox.checked) {
                document.getElementById("teacher-format-other-text").focus();
              }
            });
          }

          form.addEventListener("submit", function (e) {
            var checked = form.querySelectorAll('input[name^="format-"]:checked');
            var errorEl = document.getElementById("format-error");
            if (checked.length === 0) {
              e.preventDefault();
              if (errorEl) {
                errorEl.hidden = false;
                errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            } else if (errorEl) {
              errorEl.hidden = true;
            }
          });
        })();
        </script>
        """


# Student Class Registration: reads the "BWU Confirmed Classes" Google
# Sheet live (published to the web as CSV) via client-side JavaScript, so
# adding a new confirmed class to that sheet makes it appear on this page
# automatically -- no code change or redeploy needed. Grouped under its
# Category column.
#
# IMPORTANT -- Netlify Forms only stores fields that were present in the
# site's static HTML at the deploy-time crawl. Since classes come from a
# live sheet, each checkbox's exact name can't be known until the page
# loads in the browser, so individually-named "class__<slug>" checkboxes
# (the pattern the Teacher form's Class Format checkboxes use, where the
# option list IS known at build time) get silently dropped by Netlify.
# Instead, the checkboxes here carry no "name" attribute at all -- they're
# UI-only -- and a single static hidden field ("classes", always present
# in the built HTML) is populated by JavaScript with a JSON array of the
# checked titles right before the native form submit fires. The Apps
# Script receiver (apps-script/BWU_Registration_WebhookReceiver.gs) reads
# and JSON.parses that one "classes" field.
#
# CLASSES_CSV_URL below must stay in sync with the "BWU Confirmed Classes"
# Sheet's own published-CSV link (File > Share > Publish to web, in that
# Sheet) -- it only changes if that sheet is ever unpublished/republished
# under a new link.
def build_registration_body():
    return r"""
        <h2>Winter &lsquo;27 Class Registration</h2>
        <p>Welcome to Bridgewater YOU registration! Please fill in
        your information below, then select as many classes as you'd like
        to take this semester &mdash; one submission registers you for
        every class you check, so there's no need to submit the form more
        than once.</p>
        <p class="signature">&mdash; Rick Schuette, Admin Coordinator</p>

        <form name="student-registration" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" action="registration-thank-you.html" class="volunteer-form" id="registration-form">
          <input type="hidden" name="form-name" value="student-registration">
          <p class="hidden-field"><label>Don't fill this out if you're human: <input name="bot-field"></label></p>
          <input type="hidden" name="classes" id="classes-field" value="">

          <p class="form-note-large">All classes are scheduled for 50 minutes, unless otherwise indicated in the class registration field.</p>

          <div class="form-two-col">
            <div class="form-row">
              <label for="reg-first-name">First Name</label>
              <input type="text" id="reg-first-name" name="first-name" required>
            </div>

            <div class="form-row">
              <label for="reg-last-name">Last Name</label>
              <input type="text" id="reg-last-name" name="last-name" required>
            </div>
          </div>

          <div class="form-two-col">
            <div class="form-row">
              <label for="reg-phone">Phone Number</label>
              <input type="tel" id="reg-phone" name="phone" required>
            </div>

            <div class="form-row">
              <label for="reg-email">Email</label>
              <input type="email" id="reg-email" name="email" required>
            </div>
          </div>

          <fieldset class="class-fieldset">
            <legend>Select Your Classes <span aria-hidden="true">*</span> <span class="format-hint">(select all that apply)</span></legend>
            <div id="class-list-loading">Loading the current class list&hellip;</div>
            <p class="field-error" id="class-list-error" hidden>We couldn't load the class list just now. Please refresh this page, or contact Rick if this keeps happening.</p>
            <div id="class-categories"></div>
            <p class="field-error" id="class-error" hidden>Please select at least one class.</p>
          </fieldset>

          <button type="submit" class="submit-button">Submit Registration</button>
        </form>

        <script>
        (function () {
          var CLASSES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRV3GKy9tjkjrG9nH7fhyIL7Ydfu3TDVM5hhT8ppEncFE_HKYvmGbBrGnQDESKNuHzArjFiUC_LZeRl/pub?output=csv";

          // Where a class title was shortened from the Teacher Proposals
          // sheet's original wording, show that original wording in small
          // gray text underneath the short title, so registrants still
          // get the fuller description. Keyed on the exact CURRENT
          // (short) class title as it appears in the Confirmed Classes
          // sheet today.
          var ORIGINAL_TITLES = {
          };

          var form = document.forms["student-registration"];
          if (!form) return;

          var loadingEl = document.getElementById("class-list-loading");
          var errorEl = document.getElementById("class-list-error");
          var categoriesEl = document.getElementById("class-categories");

          fetch(CLASSES_CSV_URL)
            .then(function (res) {
              if (!res.ok) throw new Error("HTTP " + res.status);
              return res.text();
            })
            .then(function (text) {
              renderClasses(parseCSV(text));
            })
            .catch(function (err) {
              console.error("Failed to load class list: " + err.message);
              loadingEl.hidden = true;
              errorEl.hidden = false;
            });

          function renderClasses(rows) {
            loadingEl.hidden = true;
            if (!rows.length) {
              errorEl.hidden = false;
              return;
            }

            var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
            var titleIdx = header.indexOf("class title");
            var formatIdx = header.indexOf("format");
            var categoryIdx = header.indexOf("category");
            var instructorIdx = header.indexOf("instructor");
            var scheduleIdx = header.indexOf("day, time & room");

            if (titleIdx === -1 || categoryIdx === -1) {
              errorEl.hidden = false;
              return;
            }

            var byCategory = {};
            var categoryOrder = [];

            for (var i = 1; i < rows.length; i++) {
              var row = rows[i];
              if (!row.length || !row[titleIdx]) continue;

              var title = row[titleIdx].trim();
              var category = (row[categoryIdx] || "").trim() || "Other";
              var format = formatIdx > -1 ? (row[formatIdx] || "").trim() : "";
              var instructor = instructorIdx > -1 ? (row[instructorIdx] || "").trim() : "";
              var schedule = scheduleIdx > -1 ? (row[scheduleIdx] || "").trim() : "";

              if (!byCategory[category]) {
                byCategory[category] = [];
                categoryOrder.push(category);
              }
              byCategory[category].push({ title: title, format: format, instructor: instructor, schedule: schedule });
            }

            // Show categories alphabetically rather than in sheet order.
            categoryOrder.sort(function (a, b) { return a.localeCompare(b); });

            var html = "";
            categoryOrder.forEach(function (category) {
              html += '<div class="class-category">';
              html += '<h3 class="class-category-heading">' + escapeHTML(category) + '</h3>';
              byCategory[category].forEach(function (cls) {
                var detailParts = [];
                if (cls.format) detailParts.push(cls.format);
                if (cls.instructor) detailParts.push(cls.instructor);
                var detail = detailParts.length ? ' <span class="class-detail">(' + escapeHTML(detailParts.join(" — ")) + ')</span>' : "";
                var original = ORIGINAL_TITLES[cls.title];
                var originalHTML = original ? '<div class="class-original-title">' + escapeHTML(original) + '</div>' : "";
                var scheduleHTML = cls.schedule ? '<div class="class-schedule">' + escapeHTML(cls.schedule) + '</div>' : "";

                html += '<label class="class-option">';
                html += '<input type="checkbox" class="class-checkbox" value="' + escapeHTML(cls.title) + '">';
                html += '<span class="class-option-text"><span class="class-title">' + escapeHTML(cls.title) + '</span>' + detail + scheduleHTML + originalHTML + '</span>';
                html += '</label>';
              });
              html += '</div>';
            });

            categoriesEl.innerHTML = html;
          }

          form.addEventListener("submit", function (e) {
            var checked = form.querySelectorAll('input.class-checkbox:checked');
            var classErrorEl = document.getElementById("class-error");
            if (checked.length === 0) {
              e.preventDefault();
              if (classErrorEl) {
                classErrorEl.hidden = false;
                classErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              return;
            }
            if (classErrorEl) classErrorEl.hidden = true;

            // Netlify Forms only stores fields present in the site's
            // static HTML at deploy-time crawl. The class checkboxes
            // above are rendered dynamically at runtime, so submitting
            // them by name would be silently dropped -- instead, copy
            // every checked class's exact title into this one static,
            // always-present hidden field as a JSON array right before
            // the native form submission proceeds.
            var selectedTitles = [];
            checked.forEach(function (box) { selectedTitles.push(box.value); });
            var classesField = document.getElementById("classes-field");
            if (classesField) classesField.value = JSON.stringify(selectedTitles);
          });

          // Minimal CSV parser: handles quoted fields, embedded commas,
          // and escaped double-quotes ("" inside a quoted field). Good
          // enough for a Google Sheets "Publish to web as CSV" export.
          function parseCSV(text) {
            text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            var rows = [];
            var row = [];
            var field = "";
            var inQuotes = false;

            for (var i = 0; i < text.length; i++) {
              var c = text[i];

              if (inQuotes) {
                if (c === '"') {
                  if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                  } else {
                    inQuotes = false;
                  }
                } else {
                  field += c;
                }
              } else if (c === '"') {
                inQuotes = true;
              } else if (c === ",") {
                row.push(field);
                field = "";
              } else if (c === "\n") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
              } else {
                field += c;
              }
            }
            if (field.length || row.length) {
              row.push(field);
              rows.push(row);
            }
            return rows.filter(function (r) { return r.length > 1 || r[0] !== ""; });
          }

          function slugify(text) {
            return text
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
          }

          function escapeHTML(text) {
            var div = document.createElement("div");
            div.textContent = text;
            return div.innerHTML;
          }
        })();
        </script>
        """

# Pages that should NOT render the generic <h1>{title}</h1> / subtitle block
# in build_page() -- their body supplies its own opening heading instead.
PAGES_WITHOUT_HEADING = {"registration.html"}

# Each entry: (filename, page title, subtitle, body_html)

SCHEDULE_YEAR = 2027


def _sched_date(label):
    import datetime as _dt
    month, day = label.split()
    months = ["Jan", "Feb", "Mar", "Apr"]
    return _dt.date(SCHEDULE_YEAR, months.index(month) + 1, int(day))


def _weekly(weekday, start, end):
    import datetime as _dt
    d = _sched_date(start)
    last = _sched_date(end)
    assert d.weekday() == weekday, f"{start} is not weekday {weekday}"
    assert last.weekday() == weekday, f"{end} is not weekday {weekday}"
    out = []
    while d <= last:
        out.append(d)
        d += _dt.timedelta(days=7)
    return out


def _once(weekday, label):
    d = _sched_date(label)
    assert d.weekday() == weekday, f"{label} is not weekday {weekday}"
    return [d]


# Each entry: (list of dates, (hour24, minute), time label, title, room, note)
# Weekdays: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat. Every start and end date is
# checked against its weekday when the page is built.
def _schedule_sessions():
    # Reconciled 2026-10-07 to the Registration page (the "Day, Time & Room"
    # column of the Confirmed Classes sheet). Registration is the authority:
    # every class listed there appears here, and nothing else does.
    S = []
    # ---- Monday ----
    S.append((_weekly(0, "Jan 18", "Feb 1"), (12, 0), "12:00 noon", "Crockpot Cooking For Men", "Kitchen", ""))
    S.append((_weekly(0, "Jan 11", "Feb 15"), (13, 0), "1:00 p.m.", "Fundamentals of AI", "Cafe", ""))
    S.append((_weekly(0, "Jan 11", "Feb 15"), (14, 0), "2:00 p.m.", "Beginning Creative Poetry", "Library", ""))
    # Seminars that repeat on Thursday evening (Monday date, Thursday date).
    for title, mon, thu in [
        ("How to Read Your Lab Results", "Jan 18", "Jan 21"),
        ("Your Kidneys and You", "Feb 1", "Feb 4"),
        ("The 3 Amigos: Saving Kidneys, Hearts and Lives", "Feb 8", "Feb 11"),
        ("Preventing Ovarian Cancer", "Feb 15", "Feb 18"),
    ]:
        S.append((_once(0, mon), (14, 0), "2:00 p.m.", title, "Cafe", ""))
        S.append((_once(3, thu), (18, 0), "6:00 p.m.", title, "Cafe", "Repeat of the Monday seminar"))
    # Registration lists no Thursday repeat for this seminar.
    S.append((_once(0, "Jan 25"), (14, 0), "2:00 p.m.", "Oh, My Aching Hips", "Cafe", ""))
    S.append((_weekly(0, "Jan 11", "Feb 15"), (15, 0), "3:00 p.m.", "US History: The Roaring 20s to WW2", "Cafe", ""))
    S.append((_once(0, "Jan 11"), (18, 0), "6:00 p.m.", "Emerging Quantum Science", "Cafe", ""))
    S.append((_weekly(0, "Jan 25", "Feb 8"), (18, 0), "6:00 p.m.", "Got Flour? Let's Make Bread", "Kitchen", ""))
    S.append((_once(0, "Feb 8"), (14, 0), "2:00 &ndash; 4:00 p.m.", "Valentine Cookie Decorating", "Kitchen", ""))
    S.append((_once(0, "Jan 18"), (19, 0), "7:00 p.m.", "Secrets to Taking the Grandkids to Disney", "Cafe", ""))
    # ---- Tuesday ----
    S.append((_weekly(1, "Jan 12", "Feb 16"), (10, 0), "10:00 a.m.", "What's the Punchline: Low- and High-Class Poetry", "Library", ""))
    S.append((_once(1, "Feb 2"), (11, 0), "11:00 a.m.", "Space History", "Cafe", ""))
    S.append((_once(1, "Feb 9"), (11, 0), "11:00 a.m.", "Space Future", "Cafe", ""))
    S.append((_once(1, "Feb 16"), (11, 0), "11:00 a.m.", "Introduction to Environmental Disasters", "Cafe", ""))
    S.append((_weekly(1, "Jan 12", "Jan 26"), (16, 0), "4:00 p.m.", "Ping Pong 101", "Aerobics Room", ""))
    S.append((_weekly(1, "Jan 19", "Feb 2"), (17, 30), "5:30 p.m.", "Holistic Medicine", "Cafe", ""))
    S.append((_weekly(1, "Feb 9", "Mar 2"), (18, 0), "6:00 p.m.", "Home DIY", "TBD", ""))
    S.append((_once(1, "Feb 2"), (19, 0), "7:00 p.m.", "Live Visual Astronomy", "Veranda", ""))
    S.append((_weekly(1, "Jan 19", "Feb 2"), (19, 30), "7:30 p.m.", "Surviving an Active Shooter", "Cafe", ""))
    # ---- Wednesday ----
    S.append((_weekly(2, "Jan 13", "Feb 17"), (10, 0), "10:00 a.m.", "Fundamentals of Western Art History", "Cafe", ""))
    S.append((_weekly(2, "Feb 3", "Feb 24"), (10, 0), "10:00 a.m.", "Ecology, Geology and Early Explorers of the Grand Canyon", "Ballroom A", ""))
    S.append((_weekly(2, "Jan 13", "Feb 17"), (11, 0), "11:00 a.m.", "Comparative Religions", "Cafe", ""))
    S.append((_weekly(2, "Jan 20", "Feb 3"), (11, 0), "11:00 a.m.", "Navigating Changes in the Second Half of Life", "Craft Room", ""))
    S.append((_once(2, "Feb 17"), (11, 0), "11:00 a.m.", "Introduction to Bagpipes", "Ballroom A", ""))
    S.append((_weekly(2, "Feb 10", "Feb 24"), (12, 0), "12:00 &ndash; 1:30 p.m.", "CyberGenerations: Keeping Yourself Safe Online", "Cafe", ""))
    S.append((_weekly(2, "Jan 13", "Feb 17"), (16, 0), "4:00 &ndash; 6:00 p.m.", "Beginning Bocce", "Bocce Courts", ""))
    # ---- Thursday ----
    S.append((_weekly(3, "Jan 14", "Jan 28"), (9, 0), "9:00 a.m.", "Balance 2", "Ballroom A", ""))
    S.append((_weekly(3, "Jan 14", "Feb 18"), (10, 0), "10:00 a.m.", "Basic Dog Obedience Training", "Amphitheater", ""))
    S.append((_weekly(3, "Jan 21", "Feb 25"), (15, 0), "3:00 p.m.", "Learn to Knit", "Cafe", ""))
    S.append((_weekly(3, "Jan 14", "Jan 21"), (16, 0), "4:00 p.m.", "Ping Pong 101", "Aerobics Room", ""))
    S.append((_weekly(3, "Jan 14", "Feb 4"), (16, 0), "4:00 &ndash; 7:00 p.m.", "Beginning Watercolor", "Craft Room", ""))
    S.append((_weekly(3, "Feb 11", "Mar 4"), (16, 0), "4:00 &ndash; 7:00 p.m.", "Intermediate Watercolor", "Craft Room", ""))
    S.append((_once(3, "Feb 4"), (19, 0), "7:00 p.m.", "I'm Dead. Now What?", "Cafe", ""))
    S.append((_once(3, "Feb 11"), (19, 0), "7:00 p.m.", "Protecting Yourself From Financial Scams that Target Seniors", "Cafe", ""))
    S.append((_once(3, "Feb 18"), (19, 0), "7:00 p.m.", "FAIR (Financial Awareness in Retirement)", "Cafe", ""))
    # ---- Friday ----
    S.append((_weekly(4, "Jan 22", "Feb 19"), (10, 0), "10:00 a.m.", "Math Made Easy", "Craft Room", ""))
    # ---- Saturday ----
    S.append((_once(5, "Jan 23"), (9, 0), "9:00 a.m.", "Birds in Our Backyards", "Cafe", ""))
    S.append((_once(5, "Jan 16"), (10, 0), "10:00 a.m.", "Introduction to Astronomy", "Cafe", ""))
    S.append((_once(5, "Jan 23"), (10, 0), "10:00 a.m.", "Florida Fishing", "Cafe", ""))
    S.append((_weekly(5, "Jan 16", "Feb 20"), (10, 0), "10:00 a.m.", "Intermediate Pickleball", "Pickleball Courts", ""))
    S.append((_weekly(5, "Feb 6", "Feb 13"), (10, 0), "10:00 a.m.", "Introduction to Cosmology", "Cafe", ""))
    S.append((_weekly(5, "Feb 6", "Feb 20"), (11, 0), "11:00 a.m.", "Learn Your Smartphone", "Cafe", ""))
    S.append((_weekly(5, "Jan 16", "Feb 20"), (11, 30), "11:30 a.m.", "Self-Defense for All", "Aerobics Room", ""))
    return S


# Every class on the Registration page now has a day, time and room, so none
# is left unscheduled. Add a title here only if the Confirmed Classes sheet
# lists a class whose "Day, Time & Room" cell is blank.
SCHEDULE_UNSCHEDULED = []


def build_schedule_body():
    import html as _html
    import datetime as _dt
    by_date = {}
    for dates, key, label, title, room, note in _schedule_sessions():
        for d in dates:
            by_date.setdefault(d, []).append((key, label, title, room, note))
    # Group dates into Monday-to-Sunday weeks.
    weeks = {}
    for d in sorted(by_date):
        monday = d - _dt.timedelta(days=d.weekday())
        weeks.setdefault(monday, []).append(d)

    def short(d):
        return f"{d:%B} {d.day}"

    week_html = []
    for i, (monday, days) in enumerate(sorted(weeks.items())):
        sunday = monday + _dt.timedelta(days=6)
        if monday.month == sunday.month:
            title = f"{short(monday)} &ndash; {sunday.day}"
        else:
            title = f"{short(monday)} &ndash; {short(sunday)}"
        total = sum(len(by_date[d]) for d in days)
        date_blocks = []
        for d in days:
            rows = []
            for key, label, ctitle, room, note in sorted(by_date[d], key=lambda r: (r[0], r[2])):
                note_html = f' &middot; <em>{note}</em>' if note else ""
                rows.append(
                    f'''              <li class="sched-item">
                <span class="sched-time">{label}</span>
                <span class="sched-info">
                  <span class="sched-title">{_html.escape(ctitle)}</span>
                  <span class="sched-meta"><strong>{room}</strong>{note_html}</span>
                </span>
              </li>'''
                )
            rows_html = "\n".join(rows)
            date_blocks.append(
                f'''          <div class="sched-date">
            <h3>{d:%A}, {short(d)}</h3>
            <ul class="sched-list">
{rows_html}
            </ul>
          </div>'''
            )
        blocks_html = "\n".join(date_blocks)
        open_attr = " open" if i == 0 else ""
        week_html.append(
            f'''      <details class="sched-week"{open_attr}>
        <summary><span class="sched-week-title">Week of {title}</span><span class="sched-week-count">{total} session{"" if total == 1 else "s"}</span></summary>
        <div class="sched-dates">
{blocks_html}
        </div>
      </details>'''
        )
    weeks_html = "\n".join(week_html)
    tbd_html = ""
    if SCHEDULE_UNSCHEDULED:
        tbd_items = "\n".join(
            f"            <li>{_html.escape(t)}</li>" for t in SCHEDULE_UNSCHEDULED
        )
        tbd_html = f"""      <details class="sched-week sched-tbd">
        <summary><span class="sched-week-title">Classes Yet To Be Scheduled</span><span class="sched-week-count">{len(SCHEDULE_UNSCHEDULED)} classes</span></summary>
        <div class="sched-tbd-body">
          <p>The day, time and room for each of these classes will be posted here once it is scheduled.</p>
          <ul class="sched-tbd-list">
{tbd_items}
          </ul>
        </div>
      </details>
"""
    return f"""
  <div class="sched-page">
    <p class="form-note-large">All classes are scheduled for 50 minutes, unless otherwise indicated in the schedule times.</p>
    <p class="sched-intro">Winter &lsquo;27 classes by calendar date, with the
    time and room for each. Select a week to open or close it.</p>
    <div class="sched-controls">
      <button type="button" id="sched-expand">Open all weeks</button>
      <button type="button" id="sched-collapse">Close all weeks</button>
    </div>

{weeks_html}
{tbd_html}  </div>

  <script>
    (function () {{
      var weeks = document.querySelectorAll(".sched-week");
      document.getElementById("sched-expand").addEventListener("click", function () {{
        weeks.forEach(function (w) {{ w.open = true; }});
      }});
      document.getElementById("sched-collapse").addEventListener("click", function () {{
        weeks.forEach(function (w) {{ w.open = false; }});
      }});
    }})();
  </script>
"""


# ---------------------------------------------------------------------------
# Winter 2027 Class Catalogue (shown on teachers.html).
# Source: Google Doc "Class Catalogue Winter 2027". Text inside **double
# asterisks** becomes the bold class title. To change the catalogue, edit the
# entries below and re-run:  python build_pages.py
# ---------------------------------------------------------------------------
CATALOGUE_INTRO = (
    "One of the best things about Bridgewater is all the fantastic knowledge "
    "we have to share. This catalogue offers the following free classes for "
    "the winter session of Bridgewater YOU."
)

CATALOGUE = [
    ("Health and Safety Classes", [
        "Why not use the local medical expertise? Kim, after 40+ years of practice as a PA, is here to teach you **How to Read Your Lab Results** so you can sound like an expert at your next medical appointment!",
        "Greg, retired Brevard 911 supervisor and Air Force SWAT team leader, uses his experience to show us about what to do in an **Active Shooter Emergency**.",
        "Wendy, our fantastic volunteer yoga instructor, is leading her incredibly well-received **Balance 201** class. Even if you took the summer class, she still has more to teach you and you know how fantastic her classes are!",
        "After 15 years of doing orthopedic surgery, Kim is dying to share her knowledge in **Oh my Aching Hips** to show you what is normal, what is not and how surgeons fix a broken hip.",
        "Janice, retired psychology professor and certified sage-ing leader (CSL), is here to help us **Navigate Changes in the 2<sup>nd</sup> Half of Life**.",
        "Kim has spent the last 25 years in nephrology. Did you know everyone loses kidney function as they age? Learn this and many other useful (?) facts during **Your Kidneys and You**.",
        "We are all of the age where we remember the environment of the 1960s. Join Gary, an experienced environmental engineer and instructor, for **Introduction to Environmental Disasters**.",
        "As the newly described cardio-kidney-metabolic disease (quite a mouthful) is found in 98% of seniors, let Kim teach you about the new guidelines. She&rsquo;ll show you what you can do to decrease your risk in **The 3 Amigos; Saving kidneys, hearts and lives**.",
        "Heather is a retired police officer who has taught self-defense for years. Now she offers **Self-Defense for Seniors** to keep everyone safe and happy.",
        "There are brand-new guidelines for ovarian cancer but few medical people (<em>outside of OB/GYN</em>) know them. Come to **Preventing Ovarian Cancer** and Kim will tell you how to protect yourself and your daughters/granddaughters.",
        "Terri Barcus is a national board certified/state licensed doctor of Oriental medicine who is offering **Natural Wellness**, an approachable, acupuncture-inspired course designed to help participants reconnect with their bodies through simple, practical tools they can use every day. There will be 3 foundational areas of health: nervous-system balance and sleep, musculoskeletal tension and pain, and digestive and gut-brain wellness, using acupressure, essential oils, breathwork, gentle movement, food therapy, and natural home remedies.",
    ]),
    ("History and Culture Classes", [
        "After her incredibly popular US Constitution class this summer, Phyllis, our favorite history teacher, returns with **The Roaring 20s**. We will cover the time from after WWI to Vietnam and the 1960s.",
        "Join Rick for his first love (apologies to his wife!) for a discussion of art history, late antiquity through impressionism in **Fundamentals of Western Art History**. Whoever said an art degree would be useless in the future, didn&rsquo;t know about Bridgewater YOU.",
        "Our erudite neighbor, Betsy, is putting her humanities and law degrees to use in **What&rsquo;s the Punchline**. Join her for a fascinating look at both high- and low-class poetry.",
        "If ever you have been curious about religions, now is your chance to discuss Buddhism, Hinduism, Judaism, Christianity and Islam. Rick has spent years working with multiple religious and non-profits and can speak as an authority on **Comparative Religions**.",
        "Susan is teaching **Ecology, Geology and early Explorers of the Grand Canyon** based on a book she wrote. Come hear about the early explorers in Arizona and Nevada.",
    ]),
    ("Finances and Computers", [
        "Lee is thrilled to offer an Air/Space Force program on scams, online security for the &lsquo;older&rsquo; adult! Lee is a retired Air Force techie leading **CyberGenerations: Keeping Yourself Safe Online**.",
        "For those of you without local kids to program your phones, we have Rick who spent years training others in multiple platforms. Join Rick as he walks us through **Learn Your Smartphone**.",
        "John, a financial planner with 30 years of experience leading seminars, is offering **I&rsquo;m Dead. Now What?** For those of us who plan ahead (Me! Me!)",
        "John, who is a financial planner of 30 years duration, is offering **Financial Scams that Target Seniors**. This one-hour class will open your eyes!",
        "John is leading a class on **Financial Awareness in Retirement (FAIR)**. He has 30 years of experience in the topic and offering us his expertise for free!",
    ]),
    ("Hobbies and Interest Classes", [
        "Sandy is a retired high school art teacher. After 40 years of teaching teens, she finds she loves teaching adults (who can blame her?!). Join her **Beginning Watercolor** class.",
        "Sandy, our favorite art teacher, is offering **Intermediate Watercolor**. This is for her beginning students from the summer 2026 session and those who just finished the beginning watercolor class in Jan.",
        "If you have ever wished you could knit, let Laura teach you in **Intro to Knitting**. Presently she teaches for a residential disabled group and realized she&rsquo;s really good at teaching!",
        "Just in time for Valentine&rsquo;s Day, Pat is teaching **Cookie Decorating**. Be one of the first 10 participants to join her and surprise your Valentine (or yourself!) for the holiday.",
        "Sue and Hal are returning with **Fun, Easy Card Games**. This was so popular during the summer, we are offering it again! Learn new games for all those winter get-togethers&hellip;",
        "Christine, retired poetry and English teacher, is offering **Beginning Creative Poetry**. Come stretch those writing muscles!",
        "Join Greg, fix-it man extraordinaire, who offers **Simple Home Fixes and Easy Do-It Yourself Projects** for your house. As many of your neighbors can attest, he knows of what he teaches!",
        "If you want to be known as the greatest grandparents in the world, join Stephanie for **Secrets to Taking the Grandkids to Disney**. There are obsessive fans of Disney and then there is Stephanie. I am sure you have seen her Disney Christmas decorations&hellip; Let her tell you tricks to visiting Disney parks without losing your mind.",
        "Grace, a fantastic home cook, is offering **Got Flour? Let&rsquo;s make Bread** to any and all. We&rsquo;ll be in the kitchen and in the evening so as to maximize the number of participants for this delicious class!",
        "We are thrilled to offer Jackie&rsquo;s **Basic Dog Obedience** training. Jackie has trained service dogs for over 30+ years and still teaches locally. But, if you are one of the first 8 to sign up, you can get her expertise for free!",
        "Betsy, a founding member of the culinary club, is offering **Crockpot Cooking For Men** so they do not starve to death!",
        "We live in one of the most environmentally rich areas of the country. Rick spends much time working with the landscaping committee and studying the birds of Florida. Join him as he teaches us **Birds in Our Backyards**.",
    ]),
    ("Science Classes", [
        "For those who are space junkies (aren&rsquo;t we all?!), Gary is offering **Space History**. Gary is a lifelong space enthusiast and has spent the last four years volunteering at Cape Canaveral rocket launches and working for the Space Launch Delta 45 commander on Patrick.",
        "For something new and fascinating, Dan has worked in the quantum field for a number of years. Now he wants to (at our level!) share the information with us in **10,000 Foot View of Quantum Science**.",
        "Join Carl, astrophysicist and astrophotographer, for a tour through the cosmos in **Introduction to the Cosmos**. This class will include a nighttime viewing from the veranda.",
        "**Space in FL** is a look at the current space programs and newcomers&hellip; in 2027 and the near future. Join Gary, our resident space &lsquo;junkie&rsquo;, for a fascinating update of what we are seeing now.",
        "Carl, who has spent years as an astronomer, wants you to know your astronomy and is using his vast knowledge of the topic in **Introduction to Astronomy**. This class will include a nighttime viewing from the veranda.",
        "It&rsquo;s in the news, in our daily feeds and on every TV channel. Rick has trained (and certified!) on multiple AI platforms and now wants to teach you about **Foundation and Fundamentals of Artificial Intelligence**.",
        "Eric has spent 30 years teaching math to teenagers (<em>and survived!</em>) and now he wants to share his knowledge with us. Come to **Math made Easy** and ask him what you want to know!",
    ]),
    ("Sports Classes", [
        "Jim&rsquo;s simple 1-step target methodology has been taught in Senior Centers all across the US. **Ping Pong 101** will have you teaching your own grandchildren in no time. This is brain training with a safe physical workout in a non-intimidating environment.",
        "Join Steve, our resident Bocce coordinator/&lsquo;boss man&rsquo; for **Beginning Bocce**. You get a chance to meet many of the local bocce players too!",
    ]),
]


def build_catalogue_body():
    import re
    parts = [f'        <h2 class="catalogue-title">Winter 2027 Class Catalogue</h2>',
             f'        <p>{CATALOGUE_INTRO}</p>']
    for heading, entries in CATALOGUE:
        parts.append('        <section class="catalogue-category">')
        parts.append(f'          <h3 class="class-category-heading">{heading}</h3>')
        parts.append('          <div class="catalogue-grid">')
        for text in entries:
            text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
            parts.append(f'            <article class="catalogue-entry"><p>{text}</p></article>')
        parts.append('          </div>')
        parts.append('        </section>')
    return "\n".join(parts) + "\n"


PAGES = [
    (
        "index.html",
        "Bridgewater YOU",
        "Connecting Friends &middot; Enriching Lives",
        """
        <div class="home-landing">
          <h2>Welcome to Bridgewater YOU</h2>
          <p class="home-lead">Classes and conversation, taught by residents for
          residents &mdash; with no tests, no grades, and no pressure. Whether you
          wish to learn something new, share a lifetime of expertise, or simply
          meet the neighbors beside you, there is a seat for you.</p>
          <p class="home-semester">Winter &lsquo;27 Semester &middot; January 11
          through early March 2027</p>
          <div class="home-buttons">
            <a class="home-btn home-btn-gold" href="registration.html">Register for Classes</a>
            <a class="home-btn home-btn-navy" href="class-schedule.html">View the Class Schedule</a>
          </div>
          <div class="home-buttons home-buttons-addphone">
            <a class="home-btn home-btn-outline" href="add-to-home-screen.html">Add Bridgewater YOU to your phone</a>
          </div>
        </div>
        """,
    ),
    (
        "watch-live.html",
        "Watch Live",
        "Join our classes and events from home",
        build_watch_live_body(),
    ),
    (
        "registration.html",
        "Registration",
        "Sign up for classes",
        build_registration_body(),
    ),
    (
        "class-schedule.html",
        "Class Schedule",
        "Class Schedule and Room Locations",
        build_schedule_body(),
    ),
    (
        "info-updates.html",
        "Info Updates",
        "Announcements and news",
        """
        <div class="coming-soon">This page is coming soon.</div>
        """,
    ),
    (
        "teachers.html",
        "Your Teachers",
        "Meet our instructors",
        build_catalogue_body(),
    ),
    (
        "add-to-home-screen.html",
        "Add to Your Phone",
        "Put Bridgewater YOU one tap away",
        """
        <p>Add Bridgewater YOU to your phone&rsquo;s home screen and it opens
        like an app, with no typing of a web address. Choose your phone
        below.</p>
        <div class="a2hs-grid">
          <section class="a2hs-card">
            <h2>Add to Your iPhone</h2>
            <p class="a2hs-note">Use the Safari browser.</p>
            <ol>
              <li>Open Bridgewater YOU in Safari.</li>
              <li>Tap the <strong>Share</strong> button (a square with an arrow pointing up) at the bottom of your screen.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
          </section>
          <section class="a2hs-card">
            <h2>Add to Your Android Phone</h2>
            <p class="a2hs-note">Use the Chrome browser.</p>
            <ol>
              <li>Open Bridgewater YOU in Chrome.</li>
              <li>Tap the <strong>menu</strong> button (three dots) in the top right corner.</li>
              <li>Tap <strong>Add to Home screen</strong> (on some phones it reads <strong>Install app</strong>).</li>
              <li>Tap <strong>Add</strong> (or <strong>Install</strong>) to confirm.</li>
            </ol>
          </section>
        </div>
        <p class="a2hs-after">The Bridgewater YOU icon will now appear on your
        home screen. Tap it any time to open the site.</p>
        <p><a href="index.html">&larr; Back to Home</a></p>
        """,
    ),
    (
        "forum.html",
        "Join Our Admin",
        "Start building the connection",
        build_forum_body(),
    ),
    (
        "forum-thank-you.html",
        "Thank You",
        "Framing Committee volunteer sign-up",
        """
        <div class="coming-soon">
          <strong>Thank you for volunteering!</strong> Your committee
          sign-up has been received. A member of the Framing Committee will
          be in touch with you soon.
        </div>
        <p><a href="forum.html">&larr; Back to Join Our Admin</a></p>
        """,
    ),
    (
        "teachers-thank-you.html",
        "Thank You",
        "Teacher sign-up received",
        """
        <div class="coming-soon">
          <strong>Thank you for stepping up to teach!</strong> Your class
          proposal has been received. A member of the Curriculum &amp;
          Instructor Coordination committee will be in touch with you soon.
        </div>
        <p><a href="teachers.html">&larr; Back to Teachers</a></p>
        """,
    ),
    (
        "registration-thank-you.html",
        "Thank You",
        "Class registration received",
        """
        <div class="coming-soon">
          <strong>Thank you for registering!</strong> Your class selections
          have been received. Watch your email for confirmation and
          scheduling details.
        </div>
        <p><a href="registration.html">&larr; Back to Registration</a></p>
        """,
    ),
]


def build_nav(current_file):
    items = []
    for label, href, icon in NAV_ITEMS:
        # The Home tab is redundant on the Home page itself, so omit it there.
        if href == "index.html" and current_file == "index.html":
            continue
        active = " active" if href == current_file else ""
        items.append(
            f'''      <li>
        <a class="nav-link{active}" href="{href}">
          <img src="assets/icons/{icon}.png" alt="" aria-hidden="true">
          <span>{label}</span>
        </a>
      </li>'''
        )
    return "\n".join(items)


def build_page(filename, title, subtitle, body):
    nav_html = build_nav(filename)
    post_html = ""
    if filename in PAGES_WITHOUT_HEADING:
        heading_html = ""
    else:
        pre = ""
        if filename == "index.html":
            post_html = '  <p class="home-ff"><img src="assets/friends-forum-logo.png" alt="" aria-hidden="true"><span>A Bridgewater Friends Forum Program</span></p>\n'
        sub = "" if filename == "index.html" else f'  <div class="subtitle">{subtitle}</div>\n'
        h1_text = ("Designed by Bridgewater Neighbors&nbsp;- For Bridgewater Neighbors"
                   if filename == "index.html" else title)
        heading_html = f"""{pre}  <h1>{h1_text}</h1>
{sub}"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Bridgewater YOU</title>
<link rel="stylesheet" href="assets/style.css">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<meta name="theme-color" content="#0B2A5C">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Bridgewater YOU">
</head>
<body>

<a href="index.html">
  <img class="banner-image" src="assets/banner-top.jpg" alt="Bridgewater YOU - Connecting Friends, Enriching Lives">
</a>

<nav class="site-nav" aria-label="Main navigation">
  <ul>
{nav_html}
  </ul>
</nav>

<main>
{heading_html}{body}{post_html}
</main>

<footer>
  <p>&copy; 2026 Bridgewater YOU &mdash; <a href="index.html">Home</a></p>
</footer>

</body>
</html>
"""


if __name__ == "__main__":
    for filename, title, subtitle, body in PAGES:
        html = build_page(filename, title, subtitle, body)
        with open(filename, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"wrote {filename}")
