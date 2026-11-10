THEMADHOOD MUSIC - VOTING PAGE
================================

LOCATION
Copy the Vote directory to your repository at:
    Music/Vote/

PUBLIC URL
    https://themadhood.github.io/Music/Vote/

SETUP
1. Put your two actual MP3 files in Music/Vote/ alongside index.html.
2. Open config.json and change each track's file to the exact MP3 filename (including spaces/case).
3. Set googleForm.url to your Google Form's public responder/viewform URL.
   Examples:
     https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform
     https://docs.google.com/forms/d/YOUR_FORM_ID/viewform
   The page automatically adds embedded=true.
   IMPORTANT: In Google Forms, use Send/Share > embed HTML to verify that embedding is supported,
   and ensure the form accepts responses from your intended audience.
4. Change the titles/descriptions as desired.
5. Commit Music/Vote/ to GitHub. No existing files need to be changed.

INCLUDED
    index.html  - Independent webpage
    style.css   - Page-specific styling
    script.js   - Page logic, two audio players, Google Forms embed
    config.json - Editable text, filenames, and Google Form address
    README.txt  - Setup instructions

NOT INCLUDED
    MP3 files (not provided)
    Existing shared /GlobalAssets and /Music/Assets files (reused from site)

NOTES
- Uses the existing /GlobalAssets/JS/HeaderFooter.js and OpenJsons.js.
- Existing music branch Settings.json supplies colors, navigation, logo, header, and footer.
- Plays only one MP3 at once, so starting the other pauses the first.
- On a missing Google Form URL, a setup placeholder appears instead of a broken iframe.
- Google Forms handles submission/storage; this static page does not count votes by itself.
- Test through GitHub Pages or a local HTTP server, not file://, because modules/fetch need HTTP.
