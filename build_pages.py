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
    ("Calendar", "calendar.html", "palette"),
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

        <form name="volunteer-signup" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" data-netlify-recaptcha="true" action="forum-thank-you.html" class="volunteer-form">
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

          <div data-netlify-recaptcha="true"></div>

          <button type="submit" class="submit-button">Submit</button>
        </form>
        """

def build_teachers_body():
    return """
        <h2>Interested in Teaching a Class?</h2>
        <p>Bridgewater YOU is always looking for residents willing to
        share their knowledge and experience with their neighbors. If you have
        a class, seminar, or skill you'd like to teach, please complete the
        form below and a member of our Curriculum &amp; Instructor
        Coordination committee will be in touch.</p>
        <p class="signature">&mdash; Rick Schuette, Admin Coordinator</p>

        <form name="teacher-signup" method="POST" data-netlify="true" data-netlify-honeypot="bot-field" data-netlify-recaptcha="true" action="teachers-thank-you.html" class="volunteer-form">
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
            </div>
            <p class="field-error" id="format-error" hidden>Please select at least one class format.</p>
          </fieldset>

          <div data-netlify-recaptcha="true"></div>

          <button type="submit" class="submit-button">Submit</button>
        </form>

        <script>
        (function () {
          var form = document.forms["teacher-signup"];
          if (!form) return;
          form.addEventListener("submit", function (e) {
            var checked = form.querySelectorAll(\'input[name^="format-"]:checked\');
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
        """
        <div class="coming-soon">This page is coming soon.</div>
        """,
    ),
    (
        "calendar.html",
        "Calendar",
        "Upcoming classes and events",
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
  <h1>{title}</h1>
  <div class="subtitle">{subtitle}</div>
{body}
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
