NEET PG COMPANION — READ ME FIRST
=================================

WHAT IS THIS?
A private study app for your sister. 5 screens, runs on phone and laptop.

FOLDER STRUCTURE — DO NOT CHANGE NAMES OR MOVE FILES
  index.html      -> Today screen (app opens here)
  setup.html      -> create / regenerate study plan
  calendar.html   -> full plan, month by month
  stats.html      -> streak, hours, subject progress
  backup.html     -> save / restore / reset data
  css/style.css   -> design
  js/             -> the brain (7 files)

HOW TO RUN ON LAPTOP
1. Keep all files in the same folder structure.
2. Double-click index.html (opens in Chrome). Done.

HOW TO PUT IT ON HER PHONE (recommended)
1. Open  https://app.netlify.com/drop  in Chrome
2. Drag the WHOLE neetpg-companion folder into that page
3. Netlify gives you a private link (like https://xxxx.netlify.app)
4. Open the link on her phone -> Chrome menu (3 dots) -> "Add to Home screen"
It now opens like a real app with its own icon. Free, private (only people
with the link can open it).

HER DATA
Data is saved inside the browser itself — NOT inside these files.
- So: take a backup every Sunday from the Backup page (30 seconds).
- Restoring: Backup page -> Choose backup file.
- Updating the app later: just replace the old files. Data is safe.

COMMON PROBLEMS
- File opens as text / downloads instead of running:
  the name must end in .html (not .html.txt). In Windows File Explorer,
  enable View -> File name extensions to check.
- Blank page: you must open it with Chrome. Press F12 -> Console tab,
  and send any red error message to your brother.
- Design looks broken: the css folder must sit next to the html files.
- "No plan yet": open setup.html first and generate the plan.