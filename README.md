# Campus Life Planner

A responsive, accessible planner for students to track classes, assignments, study time, meetings,
sports and entertainment: what is due, how long it takes, and how full the week is.
Built with vanilla HTML, CSS and JavaScript (ES modules), with no frameworks.

**Theme:** Campus Life Planner
**Live site:** https://olga-igabe.github.io/campus-life-planner/
**Author:** Olga Igabe · [github.com/Olga-Igabe](https://github.com/Olga-Igabe) · o.igabe@alustudent.com

## Features

- **Add tasks** with a title, due date, duration in minutes and tag; every field is checked with regex as you type.
- **Task list** shown as a table on tablet and desktop and as cards on phones.
- **Sorting** by due date, title (A to Z or Z to A) and duration (shortest or longest first).
- **Live regex search** across title, tag and due date, with a case-sensitivity toggle, `@tag:` filtering,
  invalid patterns caught safely, and matches highlighted with `<mark>`.
- **Inline edit** inside each row (Enter saves, Escape cancels) and **delete with confirmation**;
  `updatedAt` changes on every edit.
- **Dashboard:** total tasks, total planned time, top tag, and a bar chart of minutes due on each of the last 7 days.
- **Weekly cap:** set a limit in hours; time left is announced politely, and going over is announced assertively.
- **Units:** show durations in minutes or hours (60 minutes = 1 hour).
- **Tags:** seven default tags (Class, Assignment, Groupwork, Study, Meeting, Sports, Entertainment);
  add or remove your own in Settings.
- **Saving:** every change is saved to `localStorage` automatically. Damaged saved data is detected,
  backed up, and the planner starts safely instead of crashing.
- **JSON export and import:** imports are validated record by record before anything is replaced,
  and errors name the task that failed.
- **Sample data:** `seed.json` (12 tasks) can be loaded with the **Load sample tasks** button or imported as a file.

## Running locally

The app uses ES modules, so it must be served, not opened by double-clicking `index.html`.

1. Clone the repository: `git clone https://github.com/Olga-Igabe/campus-life-planner.git`
2. Open the folder in VS Code and install the **Live Server** extension.
3. Click **Go Live**. The app opens at `http://127.0.0.1:5500/`.

## Running the tests

Open `tests/tests.html` through the local server (`http://127.0.0.1:5500/tests/tests.html`)
or on the live site (`/tests/tests.html`). The page runs 108 assertions and shows a pass/fail summary,
grouped by area: validation rules, the back-reference rule, regex search, highlighting, task state
and sorting, dashboard statistics, weekly cap, JSON import validation, settings clean-up and `seed.json`.

## Data model

```json
{
  "id": "task_0001",
  "title": "Read chapter 4",
  "dueDate": "2026-10-14",
  "duration": 90,
  "tag": "Study",
  "createdAt": "2026-10-12T14:30:00.000Z",
  "updatedAt": "2026-10-12T14:30:00.000Z"
}
```

Tasks are saved under the `localStorage` key `clp:tasks`; settings (unit, weekly cap, tags) under `clp:settings`.

## Regex catalog

### Validation rules

| Field | Pattern | Accepts | Rejects |
|---|---|---|---|
| Title | `^\S(?:.*\S)?$` plus no `\s{2,}` | `Gym session` | ` Gym`, `Gym `, `Gym  session` |
| Title (advanced, back-reference) | `\b(\w+)\s+\1\b` (case-insensitive) | `Read the notes` | `Read the the notes`, `The the plan` |
| Duration | `^[1-9]\d*$` | `90`, `1` | `0`, `090`, `45.5`, `-5` |
| Due date | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` | `2026-10-14`, `2028-02-29` | `2026-13-01`, `14/10/2026` |
| Tag | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | `Study`, `Club-Meeting`, `Self Study` | `Study!`, `-Club`, `Study2` |
| Weekly cap | `^[1-9]\d*$` | `20` | `0`, `2.5` |

- The duration rule is adapted from the brief's numeric pattern: decimals are removed because planning
  in fractions of a minute is not meaningful, and `0` is removed because every task takes time.
- After the date pattern passes, a calendar check rejects days that do not exist, such as `2026-02-30`
  and `2026-02-29` (2026 is not a leap year).
- The back-reference `\1` repeats whatever the first group `(\w+)` captured, so it only matches
  a word written twice in a row. `\b` stops it matching inside words, so `the theory` passes.

### Search patterns to try

| Pattern | Finds |
|---|---|
| `exam\|quiz` | titles containing either word |
| `@tag:Study` | only tasks whose tag matches `Study` |
| `\b\d{2}:\d{2}\b` | time tokens in titles, such as `10:30` |
| `\b(\w+)\s+\1\b` | a duplicated word |
| `^2026-10` | tasks due in October 2026 |
| `(` | an invalid pattern: the app shows a message instead of breaking |

Patterns are compiled inside `try/catch`. Highlights are built as text nodes and `<mark>` elements,
never with `innerHTML`, so typed HTML is shown as text.

## Keyboard map

| Key | Action |
|---|---|
| Tab / Shift+Tab | Move between links, fields and buttons |
| Enter / Space | Activate the focused button or link |
| Enter (first Tab on the page) | Use the "Skip to content" link |
| `/` | Jump to the search box (when not typing in a field) |
| Enter (in an edit row) | Save the edit |
| Escape (in an edit row) | Cancel the edit |
| Enter (in "New tag") | Add the tag |

## Accessibility notes

- Landmarks: `header`, `nav`, `main`, one `section` per area, and `footer`; one `h1` and an `h2` per section.
- A skip-to-content link is the first focusable element.
- Every input has a bound `<label>`; hints and errors are linked with `aria-describedby`,
  and invalid fields get `aria-invalid="true"`.
- Form, search, record and settings messages use `role="status"`. The weekly cap uses a polite region
  while under the cap and an assertive region once it is exceeded.
- Every interactive element shows a 3px focus outline (`:focus-visible`).
- The chart is hidden from screen readers and replaced by a text summary of all seven days.
- The table keeps table roles on phones, where rows are shown as cards.
- Text colours meet at least 4.5:1 contrast against their backgrounds.
- Animations (new-row highlight, chart bars, skip link) are switched off for users who prefer reduced motion.

## Responsive breakpoints

Mobile-first CSS with Flexbox: base styles for about 360px, then `min-width: 768px`
(table layout, stats in one row) and `min-width: 1024px` (form beside the task list).

## Project structure

```
index.html          the app
seed.json           12 sample tasks with edge cases
docs/spec.md        specification, wireframes and accessibility plan
styles/main.css     mobile-first styles
scripts/main.js     connects the page: events, rendering, settings
scripts/state.js    task list, settings, ids, timestamps, sorting
scripts/storage.js  localStorage, import validation, settings clean-up
scripts/validators.js  regex validation rules
scripts/search.js   safe regex compiler, @tag filter, highlight splitting
scripts/stats.js    totals, top tag, 7-day chart data, weekly cap
scripts/ui.js       renders rows, edit inputs, stats, chart and tags
tests/tests.html    browser test page
```
