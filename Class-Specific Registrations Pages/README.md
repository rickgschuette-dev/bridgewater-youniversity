# Class-Specific Registration Pages

One registration page and one thank-you page per promoted class. Each registration page submits to the same Netlify form as the main registration page (`student-registration`), so every registration lands in the same Google Sheet and sends the same emails, with no change to the Apps Script.

## Current pages

| Class | Registration page | Thank-you page |
|---|---|---|
| Fundamentals of Art History | /art-history | /art-history-thank-you |
| What's the Punchline: Low- and High-Class Poetry | /punchline | /punchline-thank-you |

## To add another class (copy and change)

1. Copy `art-history.html` and `art-history-thank-you.html` and rename them for the new class (for example `learn-to-knit.html`).
2. In the registration page, change these items:
   - `CLASS_TITLE` near the top of the script (must match the Class Title in the BWU Confirmed Classes sheet; capitals and punctuation are ignored when matching).
   - The class name in the header (`header-title`) and in the card heading (`card-title`).
   - The `<title>` and the three `og:` lines in the head (title, description, url).
   - The description paragraph.
   - The form `action` (the new thank-you address).
3. In the thank-you page, change the class name in the header and in the message.
4. In `netlify.toml` (top of the site folder), add two redirect rules for the new pair, copying the Art History rules.
5. Keep the `<meta name="robots" content="noindex">` line in both pages (it asks search engines not to list them; it does not affect Facebook link previews).
6. Keep the form name `student-registration` and all field names unchanged.
7. Test with one registration, then delete the test row from the sheet.

Day, time, room, format, instructor and the "Class Full" check come from the Confirmed Classes sheet and the seat-count feed automatically.
