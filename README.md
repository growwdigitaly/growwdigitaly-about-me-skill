# About Me

Answer 21 questions about your life, career and writing voice, add your case studies and experiments, and download a Claude skill file (`SKILL.md`) that helps Claude write in your voice instead of generic AI language.

**Try it:** https://about-me-skill.netlify.app/

## How it works

- A static website: plain HTML, CSS and JavaScript. No backend, no database, no login, no AI model and no API keys.
- Your answers are saved only in your own browser (localStorage), so you can close the page and continue later.
- Nothing is sent to any server, and there is no analytics or tracking.
- Optional voice input uses your browser's built-in speech recognition. Some browsers process speech through their own online service.
- The skill file is built in your browser from a template, using your answers word for word.

## Files

- `index.html`: the page
- `styles.css`: the design
- `questions.js`: the questions
- `app.js`: the app, the skill file template and the .zip download

## Run it locally

Open `index.html` in a browser, or serve the folder with any static file server.
