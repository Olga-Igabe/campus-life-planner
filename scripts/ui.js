import { splitMatches, regexForField } from './search.js';
import { formatHours } from './stats.js';

export function setFieldError(input, message) {
  const error = document.getElementById(`${input.id}-error`);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
  } else {
    input.removeAttribute('aria-invalid');
  }
  if (error) error.textContent = message;
}

export function announce(id, message) {
  const region = document.getElementById(id);
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
}

export function formatDuration(minutes, unit = 'minutes') {
  if (unit === 'hours') {
    const hours = Math.round((minutes / 60) * 100) / 100;
    return `${hours} h`;
  }
  return `${minutes} min`;
}

function highlightInto(element, text, regex) {
  element.replaceChildren();
  splitMatches(text, regex).forEach((segment) => {
    if (segment.match) {
      const mark = document.createElement('mark');
      mark.textContent = segment.text;
      element.append(mark);
    } else {
      element.append(document.createTextNode(segment.text));
    }
  });
}

function createCell(label) {
  const cell = document.createElement('td');
  cell.setAttribute('role', 'cell');
  cell.dataset.label = label;
  return cell;
}

function createButton(text, action, ariaLabel, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn--small ${extraClass}`.trim();
  button.dataset.action = action;
  button.textContent = text;
  button.setAttribute('aria-label', ariaLabel);
  return button;
}

const EDIT_FIELDS = [
  { field: 'title', label: 'Title', inputmode: 'text' },
  { field: 'dueDate', label: 'Due date', inputmode: 'numeric' },
  { field: 'duration', label: 'Duration (minutes)', inputmode: 'numeric' },
  { field: 'tag', label: 'Tag', inputmode: 'text' }
];

const CELL_LABELS = {
  title: 'Title',
  dueDate: 'Due date',
  duration: 'Duration',
  tag: 'Tag'
};

function renderEditRow(row, task, draft) {
  row.classList.add('is-editing');
  EDIT_FIELDS.forEach(({ field, label, inputmode }) => {
    const cell = createCell(CELL_LABELS[field]);
    cell.classList.add('edit-cell');

    const inputId = `edit-${field}`;
    const labelEl = document.createElement('label');
    labelEl.className = 'visually-hidden';
    labelEl.htmlFor = inputId;
    labelEl.textContent = `${label} for ${task.title}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = inputId;
    input.dataset.field = field;
    input.autocomplete = 'off';
    input.inputMode = inputmode;
    input.value = draft[field];
    input.setAttribute('aria-describedby', `${inputId}-error`);
    if (field === 'tag') input.setAttribute('list', 'tag-options');

    const error = document.createElement('p');
    error.className = 'error';
    error.id = `${inputId}-error`;

    cell.append(labelEl, input, error);
    row.append(cell);
  });

  const actionsCell = createCell('Actions');
  const actions = document.createElement('div');
  actions.className = 'row-actions';
  actions.append(
    createButton('Save', 'save', `Save changes to ${task.title}`, 'btn--primary'),
    createButton('Cancel', 'cancel', `Cancel editing ${task.title}`)
  );
  actionsCell.append(actions);
  row.append(actionsCell);
}

function renderViewRow(row, task, search, unit) {
  ['title', 'dueDate'].forEach((field) => {
    const cell = createCell(CELL_LABELS[field]);
    highlightInto(cell, String(task[field]), regexForField(search, field));
    row.append(cell);
  });

  const durationCell = createCell(CELL_LABELS.duration);
  durationCell.textContent = formatDuration(task.duration, unit);
  row.append(durationCell);

  const tagCell = createCell(CELL_LABELS.tag);
  highlightInto(tagCell, task.tag, regexForField(search, 'tag'));
  row.append(tagCell);

  const actionsCell = createCell('Actions');
  const actions = document.createElement('div');
  actions.className = 'row-actions';
  actions.append(
    createButton('Edit', 'edit', `Edit ${task.title}`),
    createButton('Delete', 'delete', `Delete ${task.title}`, 'btn--danger')
  );
  actionsCell.append(actions);
  row.append(actionsCell);
}

export function renderTasks(tbody, tasks, { search, unit, editingId, draft }) {
  const rows = tasks.map((task) => {
    const row = document.createElement('tr');
    row.setAttribute('role', 'row');
    row.dataset.id = task.id;
    if (task.id === editingId && draft) {
      renderEditRow(row, task, draft);
    } else {
      renderViewRow(row, task, search, unit);
    }
    return row;
  });
  tbody.replaceChildren(...rows);
}

export function renderStats({ total, minutes, top, cap }, unit) {
  document.getElementById('stat-total').textContent = String(total);
  document.getElementById('stat-time').textContent = formatDuration(minutes, unit);
  document.getElementById('stat-top-tag').textContent = top ? `${top.tag} (${top.count})` : 'None yet';

  const capValue = document.getElementById('stat-cap');
  capValue.textContent = `${formatHours(cap.usedMinutes)} of ${formatHours(cap.capMinutes)}`;
  capValue.closest('.stat').classList.toggle('stat--over', cap.over);
}

export function renderChart(container, days) {
  if (container.children.length !== days.length) {
    const columns = days.map(() => {
      const column = document.createElement('div');
      column.className = 'chart-col';
      column.setAttribute('aria-hidden', 'true');

      const value = document.createElement('span');
      value.className = 'chart-value';
      const track = document.createElement('div');
      track.className = 'chart-track';
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const label = document.createElement('span');
      label.className = 'chart-label';

      track.append(bar);
      column.append(value, track, label);
      return column;
    });
    container.replaceChildren(...columns);
  }

  const max = Math.max(0, ...days.map((day) => day.minutes));
  days.forEach((day, index) => {
    const column = container.children[index];
    column.querySelector('.chart-value').textContent = day.minutes > 0 ? String(day.minutes) : '';
    column.querySelector('.chart-bar').style.height = max > 0 ? `${(day.minutes / max) * 100}%` : '0%';
    column.querySelector('.chart-label').textContent = day.label;
  });

  const summary = days.map((day) => `${day.longLabel}: ${day.minutes} minutes`).join('; ');
  container.setAttribute('aria-label', `Planned minutes for tasks due in the last 7 days. ${summary}.`);
}

export function renderTags(tags) {
  const datalist = document.getElementById('tag-options');
  datalist.replaceChildren(...tags.map((tag) => {
    const option = document.createElement('option');
    option.value = tag;
    return option;
  }));

  const list = document.getElementById('tag-manager');
  list.replaceChildren(...tags.map((tag) => {
    const item = document.createElement('li');
    item.className = 'tag-chip';
    const name = document.createElement('span');
    name.textContent = tag;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tag-remove';
    remove.dataset.tag = tag;
    remove.setAttribute('aria-label', `Remove tag ${tag}`);
    remove.textContent = '×';
    item.append(name, remove);
    return item;
  }));
}
