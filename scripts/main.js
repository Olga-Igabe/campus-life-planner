import { FIELD_VALIDATORS, validateCap } from './validators.js';
import {
  subscribe,
  getTasks,
  getTask,
  addTask,
  updateTask,
  deleteTask,
  sortTasks,
  getSettings,
  updateSettings
} from './state.js';
import { buildSearch, taskMatches } from './search.js';
import { totalMinutes, topTag, lastSevenDays, capStatus, formatHours } from './stats.js';
import { setFieldError, announce, renderTasks, renderStats, renderChart } from './ui.js';

const form = document.getElementById('task-form');
const searchInput = document.getElementById('search-input');
const caseToggle = document.getElementById('search-case');
const sortSelect = document.getElementById('sort-select');
const searchStatus = document.getElementById('search-status');
const table = document.querySelector('.records-table');
const tbody = document.getElementById('records-body');
const emptyMessage = document.getElementById('records-empty');
const chart = document.getElementById('trend-chart');
const capStatusRegion = document.getElementById('cap-status');
const capAlertRegion = document.getElementById('cap-alert');
const settingsForm = document.getElementById('settings-form');
const capInput = document.getElementById('cap-input');

const fieldIds = Object.keys(FIELD_VALIDATORS);
const touched = new Set();

const view = {
  editingId: null,
  draft: null
};

let lastCapMessage = '';

/* ===== Dashboard ===== */

function renderDashboard(all) {
  const { unit, weeklyCapHours } = getSettings();
  const cap = capStatus(all, weeklyCapHours);

  renderStats({
    total: all.length,
    minutes: totalMinutes(all),
    top: topTag(all),
    cap
  }, unit);
  renderChart(chart, lastSevenDays(all));

  const message = cap.over
    ? `Over your weekly cap by ${formatHours(-cap.remainingMinutes)}: ${formatHours(cap.usedMinutes)} planned this week against a ${weeklyCapHours} h cap.`
    : `${formatHours(cap.remainingMinutes)} left of your ${weeklyCapHours} h weekly cap this week.`;
  if (message === lastCapMessage) return;
  lastCapMessage = message;

  if (cap.over) {
    capStatusRegion.textContent = '';
    capAlertRegion.textContent = message;
  } else {
    capAlertRegion.textContent = '';
    capStatusRegion.textContent = message;
  }
}

/* ===== Rendering ===== */

function render() {
  const all = getTasks();
  const { unit } = getSettings();
  renderDashboard(all);
  const search = buildSearch(searchInput.value, caseToggle.checked);
  const visible = sortTasks(all.filter((task) => taskMatches(task, search)), sortSelect.value);

  renderTasks(tbody, visible, {
    search,
    unit,
    editingId: view.editingId,
    draft: view.draft
  });

  if (all.length === 0) {
    emptyMessage.textContent = 'No tasks yet. Add your first one in the form.';
  } else if (visible.length === 0) {
    emptyMessage.textContent = 'No tasks match this pattern.';
  }
  emptyMessage.hidden = visible.length > 0;
  table.hidden = visible.length === 0;

  if (!search.valid) {
    searchInput.setAttribute('aria-invalid', 'true');
    searchStatus.textContent = 'That search pattern is not valid regex.';
  } else {
    searchInput.removeAttribute('aria-invalid');
    searchStatus.textContent = search.active
      ? `${visible.length} of ${all.length} tasks match.`
      : '';
  }
}

function focusRowButton(id, action) {
  const button = tbody.querySelector(`tr[data-id="${id}"] button[data-action="${action}"]`);
  if (button) button.focus();
}

/* ===== Add form ===== */

function checkField(id) {
  const input = document.getElementById(id);
  const message = FIELD_VALIDATORS[id](input.value);
  setFieldError(input, message);
  return message;
}

fieldIds.forEach((id) => {
  const input = document.getElementById(id);
  input.addEventListener('blur', () => {
    touched.add(id);
    checkField(id);
  });
  input.addEventListener('input', () => {
    if (touched.has(id)) checkField(id);
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const invalid = fieldIds.filter((id) => {
    touched.add(id);
    return checkField(id) !== '';
  });

  if (invalid.length > 0) {
    const label = invalid.length === 1 ? 'field' : 'fields';
    announce('form-status', `Please fix ${invalid.length} ${label} before saving.`);
    document.getElementById(invalid[0]).focus();
    return;
  }

  const values = {};
  fieldIds.forEach((id) => {
    values[id] = document.getElementById(id).value;
  });
  const task = addTask(values);

  form.reset();
  touched.clear();
  fieldIds.forEach((id) => setFieldError(document.getElementById(id), ''));
  announce('form-status', `Task "${task.title}" added.`);
  document.getElementById('title').focus();
});

/* ===== Inline edit and delete ===== */

function startEdit(id) {
  const task = getTask(id);
  if (!task) return;
  view.editingId = id;
  view.draft = {
    title: task.title,
    dueDate: task.dueDate,
    duration: String(task.duration),
    tag: task.tag
  };
  render();
  document.getElementById('edit-title').focus();
}

function cancelEdit() {
  const id = view.editingId;
  view.editingId = null;
  view.draft = null;
  render();
  announce('records-status', 'Edit cancelled.');
  focusRowButton(id, 'edit');
}

function saveEdit() {
  const id = view.editingId;
  const invalid = [];
  fieldIds.forEach((field) => {
    const input = document.getElementById(`edit-${field}`);
    const message = FIELD_VALIDATORS[field](input.value);
    setFieldError(input, message);
    if (message) invalid.push(input);
  });

  if (invalid.length > 0) {
    const label = invalid.length === 1 ? 'field' : 'fields';
    announce('records-status', `Please fix ${invalid.length} ${label} before saving.`);
    invalid[0].focus();
    return;
  }

  const changes = { ...view.draft };
  view.editingId = null;
  view.draft = null;
  const task = updateTask(id, changes);
  announce('records-status', `Task "${task.title}" updated.`);
  focusRowButton(id, 'edit');
}

function removeTask(id) {
  const task = getTask(id);
  if (!task) return;
  const confirmed = window.confirm(`Delete "${task.title}"? This cannot be undone.`);
  if (!confirmed) {
    focusRowButton(id, 'delete');
    return;
  }
  if (view.editingId === id) {
    view.editingId = null;
    view.draft = null;
  }
  deleteTask(id);
  announce('records-status', `Task "${task.title}" deleted.`);
  searchInput.focus();
}

tbody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { id } = button.closest('tr').dataset;
  const { action } = button.dataset;
  if (action === 'edit') startEdit(id);
  if (action === 'delete') removeTask(id);
  if (action === 'save') saveEdit();
  if (action === 'cancel') cancelEdit();
});

tbody.addEventListener('input', (event) => {
  const input = event.target;
  if (!view.draft || !input.dataset.field) return;
  view.draft[input.dataset.field] = input.value;
  if (input.getAttribute('aria-invalid') === 'true') {
    setFieldError(input, FIELD_VALIDATORS[input.dataset.field](input.value));
  }
});

tbody.addEventListener('keydown', (event) => {
  if (!view.editingId) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  } else if (event.key === 'Enter' && event.target.dataset.field) {
    event.preventDefault();
    saveEdit();
  }
});

/* ===== Weekly cap setting ===== */

capInput.value = String(getSettings().weeklyCapHours);

capInput.addEventListener('blur', () => {
  setFieldError(capInput, validateCap(capInput.value));
});

capInput.addEventListener('input', () => {
  if (capInput.getAttribute('aria-invalid') === 'true') {
    setFieldError(capInput, validateCap(capInput.value));
  }
});

settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = validateCap(capInput.value);
  setFieldError(capInput, message);
  if (message) {
    announce('settings-status', 'Please fix the weekly cap before saving.');
    capInput.focus();
    return;
  }
  updateSettings({ weeklyCapHours: Number(capInput.value) });
  announce('settings-status', `Weekly cap set to ${capInput.value} h.`);
});

/* ===== Search, sort and shortcuts ===== */

searchInput.addEventListener('input', render);
caseToggle.addEventListener('change', render);
sortSelect.addEventListener('change', render);

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
  if (event.key === '/' && !typing) {
    event.preventDefault();
    searchInput.focus();
  }
});

subscribe(render);
render();
