# Campus Life Planner — Specification (M1)

## 1. Purpose
A single-page planner for students to track classes, assignments, study time, meetings,
sports and entertainment: what is due, how long it takes, and how it is tagged.
Data is saved in the browser (localStorage). Vanilla HTML, CSS and JavaScript (ES modules), no frameworks.

## 2. Sections
| Section    | Content |
|------------|---------|
| About      | Purpose of the app; contact links to GitHub (github.com/Olga-Igabe) and email |
| Dashboard  | Total tasks, total planned time, top tag, last-7-days chart, weekly cap status |
| Records    | Table on tablet/desktop, cards on mobile; sorting; live regex search; inline edit; delete with confirmation |
| Add / Edit | Form: title, due date, duration, tag; inline validation messages |
| Settings   | Display unit (minutes/hours), weekly cap, tag list, JSON import/export, clear data |

## 3. Data model
    {
      "id": "task_0001",
      "title": "Read chapter 4",
      "dueDate": "2026-10-14",
      "duration": 90,
      "tag": "Study",
      "createdAt": "2026-10-12T14:30:00.000Z",
      "updatedAt": "2026-10-12T14:30:00.000Z"
    }

| Field     | Rule |
|-----------|------|
| id        | `task_` + 4-digit number, unique |
| title     | no leading/trailing spaces, no double spaces |
| dueDate   | YYYY-MM-DD |
| duration  | whole number of minutes, at least 1 |
| tag       | letters, spaces, hyphens |
| createdAt | ISO timestamp, set once |
| updatedAt | ISO timestamp, updated on every edit |

Default tags: Class, Assignment, Groupwork, Study, Meeting, Sports, Entertainment.
Single words, so the `^@tag:\w+` search pattern matches them fully. Users can add their own tags in Settings.

Settings: `{ "unit": "minutes", "weeklyCapHours": 20, "tags": [...] }`
Storage keys: `clp:tasks`, `clp:settings`. Every change saves automatically.

## 4. Validation rules
| # | Field | Pattern | Valid | Invalid |
|---|-------|---------|-------|---------|
| 1 | title | `^\S(?:.*\S)?$` and no `\s{2,}` | `Gym session` | ` Gym`, `Gym  session` |
| 2 | duration | `^[1-9]\d*$` | `90`, `5` | `0`, `090`, `45.5`, `-5` |
| 3 | dueDate | `^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$` | `2026-10-14` | `2026-13-01`, `14/10/2026` |
| 4 | tag | `^[A-Za-z]+(?:[ -][A-Za-z]+)*$` | `Study`, `Club-Meeting` | `Study!`, `-Club` |
| 5 | title, advanced (back-reference) | `\b(\w+)\s+\1\b` | — | `Read the the notes` |

Duration is adapted from the brief's numeric pattern: decimals removed because planning in
fractions of a minute is not meaningful, and 0 removed because every task takes time.

## 5. Search patterns
| Pattern | Finds |
|---------|-------|
| `^@tag:\w+` | tasks with a tag, e.g. `@tag:Study` |
| `\b\d{2}:\d{2}\b` | time tokens in titles, e.g. `10:30` |
| `\b(\w+)\s+\1\b` | duplicated words |
| `exam\|quiz` | either keyword |
Invalid patterns are caught with try/catch and reported without breaking the page.

## 6. Units and weekly cap
- Durations are stored in minutes; Settings switches the display between minutes and hours (60 minutes = 1 hour).
- Weekly cap: whole number of hours. It counts tasks due in the current week (Monday to Sunday).
- Remaining time or overage is announced in an aria-live region: polite when under the cap, assertive when over.

## 7. Wireframes

### Mobile (~360px)
    +----------------------------+
    | Skip to content            |
    | Campus Life Planner   [=]  |
    +----------------------------+
    | DASHBOARD                  |
    | [Tasks 12]  [Time 18.5 h]  |
    | [Top tag: Study]           |
    | Cap 20 h: 1.5 h remaining  |
    | 7 days: | |:| ||| | :|     |
    +----------------------------+
    | RECORDS                    |
    | Search [regex_______] [Aa] |
    | Sort   [Due date v]        |
    | +------------------------+ |
    | | Read chapter 4         | |
    | | Due 14 Oct - 90 min    | |
    | | Study  [Edit][Delete]  | |
    | +------------------------+ |
    +----------------------------+
    | ADD TASK                   |
    | Title    [____________]    |
    | Due date [____________]    |
    | Duration [____________]    |
    | Tag      [____________]    |
    | [ Save ]                   |
    +----------------------------+
    | SETTINGS | ABOUT | footer  |
    +----------------------------+

### Tablet (~768px)
    +--------------------------------------------+
    | Campus Life Planner   Dash Records Add ... |
    +--------------------------------------------+
    | [Tasks] [Time] [Top tag] [Cap]             |
    | 7-day chart                                |
    +--------------------------------------------+
    | Search [________] [Aa]   Sort [v]          |
    | Title          | Due    | Duration | Tag   |
    | Read chapter 4 | 14 Oct | 90 min   | Study |
    +--------------------------------------------+

### Desktop (~1024px)
    +------------------------------------------------------+
    | Campus Life Planner        Dashboard Records Add ... |
    +------------------------------------------------------+
    | [Tasks] [Time] [Top tag] [Cap]  | 7-day chart        |
    +---------------------------------+--------------------+
    | Records table (sortable)        | Add / Edit form    |
    +---------------------------------+--------------------+
    | footer                                               |
    +------------------------------------------------------+

## 8. Accessibility plan
- Landmarks: header, nav, main, section (each with a heading), footer.
- One h1 (app name), one h2 per section.
- Skip-to-content link as the first focusable element.
- Every input has a `<label for>`; error messages linked with `aria-describedby`.
- Visible focus on every interactive element (`:focus-visible`, 3px outline).
- Status messages in `role="status"`; cap overage in `aria-live="assertive"`.
- Search highlights use `<mark>` inside text, so screen readers read whole words.
- Text contrast at least 4.5:1.
- Delete asks for confirmation; Escape cancels inline edit.
- Animations respect `prefers-reduced-motion`.

## 9. Keyboard map
| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Move between controls |
| Enter / Space | Activate a button or link |
| `/` | Focus the search box |
| Escape | Cancel inline edit |
| Enter (in edit row) | Save edit |

## 10. Breakpoints
Mobile-first: base (~360px), `min-width: 768px`, `min-width: 1024px`.

## 11. File structure
    index.html
    seed.json
    README.md
    .gitignore
    docs/spec.md
    styles/main.css
    scripts/main.js  storage.js  state.js  ui.js  validators.js  search.js  stats.js
    tests/tests.html
    assets/

## 12. Empty and error states
- No tasks yet: "No tasks yet. Add your first one in the form."
- Search finds nothing: "No tasks match this pattern."
- Invalid regex: "That search pattern is not valid regex."
- Import fails validation: a message naming the problem; existing data is not changed.