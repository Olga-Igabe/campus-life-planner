import { splitMatches, regexForField } from './search.js';

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
