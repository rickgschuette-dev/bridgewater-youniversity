#!/usr/bin/env python3
"""
Generates every static HTML page for the Bridgewater YOU site
from a single template, so the header/nav stays identical across pages.
Run this after editing PAGES or the TEMPLATE, then commit the generated
.html files (the .html files themselves are what gets deployed --
this script is a build helper, not something a browser loads).
"""

NAV_ITEMS = [
    ("Home", "index.html", "home"),
    ("Class Registration", "registration.html", "book"),
    ("Class Schedule", "class-schedule.html", "palette"),
    ("Teachers", "teachers.html", "coffee"),
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

          <div class="form-two-col">
            <div class="form-row">
              <label for="volunteer-name">Full Name</label>
              <input type="text" id="volunteer-name" name="name" required>
            </div>

            <div class="form-row">
              <label for="volunteer-email">Email</label>
              <input type="email" id="volunteer-email" name="email" required>
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
    nums = [
        ("How to Read Your Lab Results", "Jan 18", "Jan 21"),
        ("Oh My Aching Hips", "Jan 25", "Jan 28"),
        ("Your Kidneys and You", "Feb 1", "Feb 4"),
        ("The 3 Amigos: Saving Kidneys, Hearts and Lives", "Feb 8", "Feb 11"),
        ("Preventing Ovarian Cancer", "Feb 15", "Feb 18"),
    ]
    S = []
    # Monday
    S.append((_weekly(0, "Jan 18", "Feb 1"), (12, 0), "12:00 noon", "Crockpot Cooking For Men", "Kitchen", ""))
    S.append((_weekly(0, "Jan 11", "Feb 15"), (13, 0), "1:00 p.m.", "Fundamentals of AI", "Cafe", ""))
    S.append((_weekly(0, "Jan 11", "Feb 15"), (14, 0), "2:00 p.m.", "Beginning Creative Poetry", "Library", ""))
    for title, mon, thu in nums:
        S.append((_once(0, mon), (14, 0), "2:00 p.m.", title, "Cafe", ""))
        S.append((_once(3, thu), (18, 0), "6:00 p.m.", title, "Cafe", "Repeat of the Monday seminar"))
    S.append((_weekly(0, "Jan 11", "Feb 15"), (15, 0), "3:00 p.m.", "US History: The Roaring 20s to WW2", "Cafe", ""))
    S.append((_once(0, "Jan 11"), (18, 0), "6:00 p.m.", "Emerging Quantum Science", "Cafe", ""))
    S.append((_weekly(0, "Jan 25", "Feb 8"), (18, 0), "6:00 p.m.", "Got Flour? Let's Make Bread", "Kitchen", ""))
    S.append((_once(0, "Feb 8"), (14, 0), "2:00 &ndash; 4:00 p.m.", "Valentine Cookie Decorating", "Kitchen", ""))
    S.append((_once(0, "Jan 18"), (19, 0), "7:00 p.m.", "Secrets to Taking the Grandkids to Disney", "Cafe", ""))
    # Tuesday
    S.append((_weekly(1, "Jan 12", "Feb 16"), (10, 0), "10:00 a.m.", "What's the Punchline: Low- and High-Class Poetry", "Library", ""))
    S.append((_weekly(1, "Feb 9", "Feb 23"), (11, 0), "11:00 a.m.", "Introduction to Environmental Disasters", "Cafe", ""))
    S.append((_once(1, "Feb 2"), (11, 0), "11:00 a.m.", "Space History and Future", "Cafe", ""))
    S.append((_weekly(1, "Jan 19", "Feb 2"), (17, 30), "5:30 p.m.", "Holistic Medicine", "Cafe", ""))
    S.append((_weekly(1, "Jan 19", "Feb 2"), (19, 30), "7:30 p.m.", "Surviving an Active Shooter", "Cafe", ""))
    S.append((_weekly(1, "Jan 12", "Jan 26"), (19, 0), "7:00 p.m.", "Introduction to Astronomy", "Veranda", ""))
    S.append((_weekly(1, "Feb 2", "Feb 16"), (19, 0), "7:00 p.m.", "Introduction to the Cosmos", "Veranda", ""))
    # Wednesday
    S.append((_weekly(2, "Jan 13", "Feb 17"), (10, 0), "10:00 a.m.", "Fundamentals of Western Art History", "Cafe", ""))
    S.append((_weekly(2, "Jan 13", "Feb 17"), (11, 0), "11:00 a.m.", "Comparative Religions", "Cafe", ""))
    S.append((_weekly(2, "Jan 20", "Feb 3"), (11, 0), "11:00 a.m.", "Navigating Changes in the Second Half of Life", "Craft Room", ""))
    S.append((_weekly(2, "Feb 10", "Feb 24"), (12, 0), "12:00 &ndash; 1:30 p.m.", "CyberGenerations: Keeping Yourself Safe Online", "Cafe", ""))
    S.append((_weekly(2, "Jan 13", "Feb 17"), (14, 0), "2:00 p.m.", "Firearm Safety with Range Practice", "Cafe, gun range", ""))
    S.append((_weekly(2, "Jan 13", "Feb 17"), (16, 0), "4:00 &ndash; 6:00 p.m.", "Beginning Bocce", "Bocce Courts", ""))
    # Thursday
    S.append((_weekly(3, "Jan 14", "Jan 28"), (9, 0), "9:00 a.m.", "Balance 2", "Ballroom A", ""))
    S.append((_weekly(3, "Jan 14", "Feb 18"), (10, 0), "10:00 a.m.", "Basic Dog Obedience Training", "Amphitheater", ""))
    S.append((_weekly(3, "Jan 21", "Feb 25"), (15, 0), "3:00 p.m.", "Learn to Knit", "Cafe", ""))
    S.append((_weekly(3, "Jan 14", "Feb 4"), (16, 0), "4:00 &ndash; 7:00 p.m.", "Beginning Watercolor", "Craft Room", ""))
    S.append((_weekly(3, "Feb 11", "Mar 4"), (16, 0), "4:00 &ndash; 7:00 p.m.", "Intermediate Watercolor", "Craft Room", ""))
    # Friday
    S.append((_weekly(4, "Jan 22", "Feb 12"), (10, 0), "10:00 a.m.", "Math Made Easy", "Craft Room", ""))
    S.append((_weekly(4, "Jan 15", "Jan 29"), (10, 0), "10:00 a.m.", "Fun and Easy Card Games", "Cafe", ""))
    S.append((_once(4, "Feb 19"), (10, 0), "10:00 a.m.", "Introduction to Bagpipes", "Aerobics Room", ""))
    # Saturday
    S.append((_once(5, "Jan 16"), (9, 0), "9:00 a.m.", "Birds in Our Backyards", "Cafe", ""))
    S.append((_once(5, "Jan 16"), (10, 0), "10:00 a.m.", "Florida Fishing", "Cafe", ""))
    S.append((_weekly(5, "Feb 6", "Feb 20"), (10, 0), "10:00 a.m.", "Learn Your Smartphone", "Cafe", ""))
    S.append((_weekly(5, "Jan 16", "Feb 20"), (10, 0), "10:00 a.m.", "Intermediate Pickleball", "Pickleball Courts", ""))
    return S


# Classes in the Confirmed Classes sheet whose "Day, Time & Room" cell is blank.
SCHEDULE_UNSCHEDULED = [
    "Ping Pong 101",
    "Home DIY",
    "Self-Defense for All",
    "I'm Dead. Now What?",
    "Protecting Yourself From Financial Scams that Target Seniors",
    "FAIR (Financial Awareness in Retirement)",
    "Ecology, Geology and Early Explorers of the Grand Canyon",
]


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
          <p class="home-note">All classes are scheduled for 50 minutes unless
          otherwise indicated.</p>
        </div>
        """,
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
        "Teachers",
        "Meet our instructors",
        """
        <div class="coming-soon"><strong>Teachers, Presenters and Facilitator profiles coming soon.</strong></div>
        """,
    ),
    (
        "watch-live.html",
        "Watch Live",
        "Join our classes and events from home",
        """
        <div class="coming-soon"><strong>Live streaming coming soon.</strong></div>
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
    if filename in PAGES_WITHOUT_HEADING:
        heading_html = ""
    else:
        pre = ('  <p class="home-ff">A Bridgewater Friends Forum Program</p>\n'
               if filename == "index.html" else "")
        heading_html = f"""{pre}  <h1>{title}</h1>
  <div class="subtitle">{subtitle}</div>
"""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Bridgewater YOU</title>
<link rel="stylesheet" href="assets/style.css">
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
{heading_html}{body}
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
