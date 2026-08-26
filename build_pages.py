#!/usr/bin/env python3
"""
Generates every static HTML page for the Bridgewater YOUniversity site
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

# Each entry: (filename, page title, subtitle, body_html)
PAGES = [
    (
        "index.html",
        "Bridgewater YOUniversity",
        "Connecting Friends &middot; Enriching Lives",
        """
        <p>Welcome to Bridgewater YOUniversity &mdash; our neighborhood's home for
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
        """
        <div class="coming-soon">This page is coming soon.</div>
        """,
    ),
    (
        "news.html",
        "BW YOU News",
        "The latest from Bridgewater YOUniversity",
        """
        <div class="coming-soon">This page is coming soon.</div>
        """,
    ),
    (
        "forum.html",
        "Forum",
        "Connect with your neighbors",
        """
        <div class="coming-soon">This page is coming soon.</div>
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
<title>{title} | Bridgewater YOUniversity</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>

<a href="index.html">
  <img class="banner-image" src="assets/banner-top.jpg" alt="Bridgewater YOUniversity - Connecting Friends, Enriching Lives">
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
  <p>&copy; 2026 Bridgewater YOUniversity &mdash; <a href="index.html">Home</a></p>
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
