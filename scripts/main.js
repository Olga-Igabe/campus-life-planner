import { FIELD_VALIDATORS, validateCap, validateTag } from './validators.js';
import {
  subscribe,
  getTasks,
  getTask,
  setTasks,
  addTask,
  updateTask,
  deleteTask,
  sortTasks,
  getSettings,
  updateSettings
} from './state.js';
import { buildSearch, taskMatches } from './search.js';
import { totalMinutes, topTag, lastSevenDays, capStatus, formatHours, toISODate } from './stats.js';
import { loadTasks, loadSettings, saveAll, parseImport, validateTaskList } from './storage.js';
import {
  setFieldError,
  announce,
  renderTasks,
  renderStats,
  renderChart,
  renderTags
} from './ui.js';

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
const unitRadios = document.querySelectorAll('input[name="unit"]');
const newTagInput = document.getElementById('new-tag');
const tagManager = document.getElementById('tag-manager');
const importInput = document.getElementById('import-file');

const fieldIds = Object.keys(FIELD_VALIDATORS);
const touched = new Set();

const view = {
  editingId: null,
  draft: null
};

let lastCapMessage = '';

function count(number, word) {
  return `${number} ${word}${number === 1 ? '' : 's'}`;
}
let saveWarningShown = false;

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
    ? `Over your weekly cap by ${formatHours(-cap.remainingMinutes)}: ${formatHours(cap.usedMinutes)} planned this week against your ${weeklyCapHours} h cap.`
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
  const settings = getSettings();
  renderDashboard(all);
  renderTags(settings.tags);

  const search = buildSearch(searchInput.value, caseToggle.checked);
  const visible = sortTasks(all.filter((task) => taskMatches(task, search)), sortSelect.value);

  renderTasks(tbody, visible, {
    search,
    unit: settings.unit,
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
      ? `${visible.length} of ${count(all.length, 'task')} match.`
      : '';
  }
}

function persist() {
  const saved = saveAll(getTasks(), getSettings());
  if (!saved && !saveWarningShown) {
    saveWarningShown = true;
    announce('settings-status', 'Changes could not be saved in this browser. Export your tasks to keep a copy.');
  }
}

function focusRowButton(id, action) {
  const button = tbody.querySelector(`tr[data-id="${id}"] button[data-action="${action}"]`);
  if (button) button.focus();
}

function stopEditing() {
  view.editingId = null;
  view.draft = null;
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
  const newRow = tbody.querySelector(`tr[data-id="${task.id}"]`);
  if (newRow) newRow.classList.add('is-new');

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
  stopEditing();
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
  stopEditing();
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
  if (view.editingId === id) stopEditing();
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

/* ===== Settings: units and weekly cap ===== */

unitRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    updateSettings({ unit: radio.value });
    announce('settings-status', `Durations are now shown in ${radio.value}.`);
  });
});

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

/* ===== Settings: tags ===== */

function addTag() {
  const value = newTagInput.value;
  let message = validateTag(value);
  const { tags } = getSettings();
  if (!message && tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
    message = 'That tag already exists.';
  }
  setFieldError(newTagInput, message);
  if (message) {
    newTagInput.focus();
    return;
  }
  updateSettings({ tags: [...tags, value] });
  newTagInput.value = '';
  announce('settings-status', `Tag "${value}" added.`);
}

document.getElementById('add-tag').addEventListener('click', addTag);

newTagInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag();
  }
});

newTagInput.addEventListener('input', () => {
  if (newTagInput.getAttribute('aria-invalid') === 'true') setFieldError(newTagInput, '');
});

tagManager.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-tag]');
  if (!button) return;
  const { tag } = button.dataset;
  updateSettings({ tags: getSettings().tags.filter((item) => item !== tag) });
  announce('settings-status', `Tag "${tag}" removed. Tasks that already use it keep it.`);
  newTagInput.focus();
});

/* ===== Settings: data ===== */

function replaceTasks(tasks, sourceName) {
  const current = getTasks().length;
  if (current > 0) {
    const confirmed = window.confirm(
      `Replace your ${count(current, 'current task')} with ${count(tasks.length, 'task')} from ${sourceName}?`
    );
    if (!confirmed) {
      announce('settings-status', 'Nothing was changed.');
      return;
    }
  }
  stopEditing();
  setTasks(tasks);
  announce('settings-status', `Loaded ${count(tasks.length, 'task')} from ${sourceName}.`);
}

document.getElementById('export-btn').addEventListener('click', () => {
  const tasks = getTasks();
  if (tasks.length === 0) {
    announce('settings-status', 'There are no tasks to export yet.');
    return;
  }
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campus-life-planner-${toISODate(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce('settings-status', `Exported ${count(tasks.length, 'task')} as JSON.`);
});

importInput.addEventListener('change', async () => {
  const [file] = importInput.files;
  if (!file) return;
  try {
    const result = parseImport(await file.text());
    if (!result.ok) {
      announce('settings-status', `Import failed: ${result.error} Your tasks were not changed.`);
      return;
    }
    replaceTasks(result.tasks, file.name);
  } catch {
    announce('settings-status', 'Import failed: the file could not be read. Your tasks were not changed.');
  } finally {
    importInput.value = '';
  }
});

document.getElementById('sample-btn').addEventListener('click', async () => {
  try {
    const response = await fetch('seed.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = validateTaskList(await response.json());
    if (!result.ok) throw new Error(result.error);
    replaceTasks(result.tasks, 'the sample file');
  } catch {
    announce('settings-status', 'The sample tasks could not be loaded. Run the app through a local server or the live site.');
  }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  const total = getTasks().length;
  if (total === 0) {
    announce('settings-status', 'There are no tasks to delete.');
    return;
  }
  if (!window.confirm(`Delete all ${count(total, 'task')}? This cannot be undone. Export first if you want a copy.`)) {
    announce('settings-status', 'Nothing was deleted.');
    return;
  }
  stopEditing();
  setTasks([]);
  announce('settings-status', `Deleted ${count(total, 'task')}.`);
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

/* ===== Start-up ===== */

const savedSettings = loadSettings();
const savedTasks = loadTasks();
updateSettings(savedSettings);
setTasks(savedTasks.tasks);

capInput.value = String(savedSettings.weeklyCapHours);
unitRadios.forEach((radio) => {
  radio.checked = radio.value === savedSettings.unit;
});

subscribe(persist);
subscribe(render);
render();

if (savedTasks.problem) announce('settings-status', savedTasks.problem);
