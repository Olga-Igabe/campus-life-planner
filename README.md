# Campus Life Planner

Individual ALU assignment: a vanilla HTML/CSS/JS planner for campus tasks and events.

**Theme:** Campus Life Planner
**Status:** M6 — Saving, Import/Export & Settings

See [docs/spec.md](docs/spec.md) for the data model, regex rules, wireframes and accessibility plan.

**Live site:** https://olga-igabe.github.io/campus-life-planner/

## Running locally
The app uses ES modules, so it must be served, not opened as a file.
In VS Code, install the Live Server extension and click **Go Live**.

## Tests
Open `tests/tests.html` through the local server (or on the live site at `/tests/tests.html`).
It checks the validators, the regex search, highlighting, task state, sorting, dashboard statistics, JSON import validation and `seed.json`, and shows a pass/fail summary.
