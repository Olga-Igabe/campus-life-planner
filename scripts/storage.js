import { validateTitle, validateDate, validateDuration, validateTag } from './validators.js';
import { DEFAULT_SETTINGS } from './state.js';

const TASKS_KEY = 'clp:tasks';
const SETTINGS_KEY = 'clp:settings';
const BACKUP_KEY = 'clp:tasks-backup';

const ID_PATTERN = /^task_\d{4,}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isTimestamp(value) {
  return typeof value === 'string' && ISO_TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value));
}

function isValidText(value, validate) {
  return typeof value === 'string' && validate(value) === '';
}

export function validateTaskList(data) {
  if (!Array.isArray(data)) {
    return { ok: false, error: 'The file must contain a list of tasks.' };
  }

  const seen = new Set();
  const tasks = [];

  for (let index = 0; index < data.length; index += 1) {
    const item = data[index];
    const where = `Task ${index + 1}`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: `${where} is not a task object.` };
    }
    if (typeof item.id !== 'string' || !ID_PATTERN.test(item.id)) {
      return { ok: false, error: `${where} has an invalid id. Ids look like task_0001.` };
    }
    if (seen.has(item.id)) {
      return { ok: false, error: `${where} repeats the id ${item.id}.` };
    }
    seen.add(item.id);

    if (!isValidText(item.title, validateTitle)) {
      return { ok: false, error: `${where} has an invalid title.` };
    }
    if (!isValidText(item.dueDate, validateDate)) {
      return { ok: false, error: `${where} has an invalid due date.` };
    }
    if (!Number.isInteger(item.duration) || validateDuration(String(item.duration)) !== '') {
      return { ok: false, error: `${where} has an invalid duration. It must be whole minutes, 1 or more.` };
    }
    if (!isValidText(item.tag, validateTag)) {
      return { ok: false, error: `${where} has an invalid tag.` };
    }
    if (!isTimestamp(item.createdAt) || !isTimestamp(item.updatedAt)) {
      return { ok: false, error: `${where} is missing a valid createdAt or updatedAt timestamp.` };
    }

    tasks.push({
      id: item.id,
      title: item.title,
      dueDate: item.dueDate,
      duration: item.duration,
      tag: item.tag,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    });
  }

  return { ok: true, tasks };
}

export function cleanSettings(data) {
  const settings = { ...DEFAULT_SETTINGS, tags: [...DEFAULT_SETTINGS.tags] };
  if (!data || typeof data !== 'object') return settings;

  if (data.unit === 'minutes' || data.unit === 'hours') settings.unit = data.unit;
  if (Number.isInteger(data.weeklyCapHours) && data.weeklyCapHours >= 1) {
    settings.weeklyCapHours = data.weeklyCapHours;
  }
  if (Array.isArray(data.tags)) {
    const tags = data.tags.filter((tag) => isValidText(tag, validateTag));
    settings.tags = [...new Set(tags)];
  }
  return settings;
}

export function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }
  return validateTaskList(data);
}

function readKey(key) {
  try {
    return { available: true, raw: localStorage.getItem(key) };
  } catch {
    return { available: false, raw: null };
  }
}

export function loadTasks() {
  const { available, raw } = readKey(TASKS_KEY);
  if (!available) {
    return { tasks: [], problem: 'Your browser is blocking saved data, so changes will not be kept after you close the page.' };
  }
  if (raw === null) return { tasks: [], problem: null };

  let result;
  try {
    result = validateTaskList(JSON.parse(raw));
  } catch {
    result = { ok: false };
  }
  if (result.ok) return { tasks: result.tasks, problem: null };

  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // The backup is optional; the planner still starts safely without it.
  }
  return {
    tasks: [],
    problem: 'Your saved tasks were damaged and could not be loaded, so the planner started empty. A copy was kept in your browser.'
  };
}

export function loadSettings() {
  const { raw } = readKey(SETTINGS_KEY);
  if (raw === null) return cleanSettings(null);
  try {
    return cleanSettings(JSON.parse(raw));
  } catch {
    return cleanSettings(null);
  }
}

export function saveAll(tasks, settings) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
