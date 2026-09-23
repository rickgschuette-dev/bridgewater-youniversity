#!/usr/bin/env python3
"""
Generates every static HTML page for the Bridgewater YOU site
from a single template, so the header/nav stays identical across pages.
Run this after editing PAGES or the TEMPLATE, then commit the generated
.html files (the .html files themselves are what gets deployed --
this script is a build helper, not something a browser loads).
"""

NAV_ITEMS = [
    ("Registration", "registration.html", "book"),
    ("Class Schedule", "class-schedule.html", "palette"),
    ("Info Updates", "info-updates.html", "music"),
    ("Teachers", "teachers.html", "coffee"),
    ("BW YOU News", "news.html", "dumbbell"),
    ("Forum", "forum.html", "speech"),
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
        <p>Thank you for agreeing to be part of the Bridgewater YOU framing
        committee to build on our successful start. Please review the
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
# automatically -- no code change or redeploy needed. Each class renders
# as its own uniquely-named checkbox (class__<slug>, value=<exact title>),
# the same one-field-per-option pattern already proven reliable by the
# Teacher form's Class Format checkboxes, grouped under its Category
# column. The Apps Script receiver (apps-script/BWU_Registration_WebhookReceiver.gs)
# never needs to know the class list in advance -- it just collects
# whichever "class__*" fields show up truthy in a submission.
#
# CLASSES_CSV_URL below must stay in sync with the "BWU Confirmed Classes"
# Sheet's own published-CSV link (File > Share > Publish to web, in that
# Sheet) -- it only changes if that sheet is ever unpublished/republished
# under a new link.
def build_registration_body():
    return r"""
        <h2>Winter &lsquo;27 Class Registration</h2>
        <p>Welcome to Bridgewater YOUniversity registration! Please fill in
        your information below, then select as many classes as you'd like
        to take this semester &mdash; one submission registers you for
        every class you check, so there's no need to submit the form more
        than once.</p>
        <p class="signature">&mdash; Rick Schuette, Admin Coordinator</p>

        <form name="student-registration" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" action="registration-thank-you.html" class="volunteer-form" id="registration-form">
          <input type="hidden" name="form-name" value="student-registration">
          <p class="hidden-field"><label>Don't fill this out if you're human: <input name="bot-field"></label></p>

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
            "Emerging Quantum Science": "10,000 Foot View of the Emerging Field of Quantum Science and Technology",
            "Surviving an Active Shooter": "How to Survive Active Shooter Incidents and Other Life Threatening Incidents",
            "Space History and Future": "Space History, Current Programs and the Future"
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

              if (!byCategory[category]) {
                byCategory[category] = [];
                categoryOrder.push(category);
              }
              byCategory[category].push({ title: title, format: format, instructor: instructor });
            }

            var html = "";
            categoryOrder.forEach(function (category) {
              html += '<div class="class-category">';
              html += '<h3 class="class-category-heading">' + escapeHTML(category) + '</h3>';
              byCategory[category].forEach(function (cls) {
                var slug = slugify(cls.title);
                var detailParts = [];
                if (cls.format) detailParts.push(cls.format);
                if (cls.instructor) detailParts.push(cls.instructor);
                var detail = detailParts.length ? ' <span class="class-detail">(' + escapeHTML(detailParts.join(" — ")) + ')</span>' : "";
                var original = ORIGINAL_TITLES[cls.title];
                var originalHTML = original ? '<div class="class-original-title">' + escapeHTML(original) + '</div>' : "";

                html += '<label class="class-option">';
                html += '<input type="checkbox" name="class__' + slug + '" value="' + escapeHTML(cls.title) + '">';
                html += '<span class="class-option-text"><span class="class-title">' + escapeHTML(cls.title) + '</span>' + detail + originalHTML + '</span>';
                html += '</label>';
              });
              html += '</div>';
            });

            categoriesEl.innerHTML = html;
          }

          form.addEventListener("submit", function (e) {
            var checked = form.querySelectorAll('input[name^="class__"]:checked');
            var classErrorEl = document.getElementById("class-error");
            if (checked.length === 0) {
              e.preventDefault();
              if (classErrorEl) {
                classErrorEl.hidden = false;
                classErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            } else if (classErrorEl) {
              classErrorEl.hidden = true;
            }
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
PAGES_WITHOUT_HEADING = {"teachers.html", "registration.html"}

# Each entry: (filename, page title, subtitle, body_html)
PAGES = [
    (
        "index.html",
        "Bridgewater YOU",
        "Connecting Friends &middot; Enriching Lives",
        """
        <p>Welcome to Bridgewater YOU &mdash; our neighborhood's home for
        classes, events, and connection. Use the menu above to find registration,
        the class calendar, instructor information, and community news.</p>
        <div class="coming-soon">
          <strong>This site is being rebuilt.</strong> Each section above will be
          filled in one at a time. Thank you for your patience while we get
          everything in place.
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
        """
        <div class="coming-soon">This page is coming soon.</div>
        """,
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
        build_teachers_body(),
    ),
    (
        "news.html",
        "BW YOU News",
        "The latest from Bridgewater YOU",
        """
        <div class="coming-soon">This page is coming soon.</div>
        """,
    ),
    (
        "forum.html",
        "Forum",
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
        <p><a href="forum.html">&larr; Back to the Forum</a></p>
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
        heading_html = f"""  <h1>{title}</h1>
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
