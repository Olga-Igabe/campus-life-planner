let tasks = [];
let lastNumber = 0;
const listeners = new Set();

function idNumber(id) {
  const match = /^task_(\d+)$/.exec(String(id));
  return match ? Number(match[1]) : 0;
}

function nextId() {
  lastNumber += 1;
  return `task_${String(lastNumber).padStart(4, '0')}`;
}

function notify() {
  const snapshot = getTasks();
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTasks() {
  return tasks.map((task) => ({ ...task }));
}

export function getTask(id) {
  const task = tasks.find((item) => item.id === id);
  return task ? { ...task } : null;
}

export function setTasks(list) {
  tasks = list.map((task) => ({ ...task }));
  lastNumber = tasks.reduce((max, task) => Math.max(max, idNumber(task.id)), 0);
  notify();
}

export function addTask({ title, dueDate, duration, tag }) {
  const now = new Date().toISOString();
  const task = {
    id: nextId(),
    title,
    dueDate,
    duration: Number(duration),
    tag,
    createdAt: now,
    updatedAt: now
  };
  tasks.push(task);
  notify();
  return { ...task };
}

export function updateTask(id, { title, dueDate, duration, tag }) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;
  tasks[index] = {
    ...tasks[index],
    title,
    dueDate,
    duration: Number(duration),
    tag,
    updatedAt: new Date().toISOString()
  };
  notify();
  return { ...tasks[index] };
}

export function deleteTask(id) {
  const before = tasks.length;
  tasks = tasks.filter((task) => task.id !== id);
  const removed = tasks.length !== before;
  if (removed) notify();
  return removed;
}

function compareTitles(a, b) {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
}

export function sortTasks(list, sortKey) {
  const [field, direction] = sortKey.split('-');
  const factor = direction === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    let result;
    if (field === 'duration') {
      result = a.duration - b.duration;
    } else if (field === 'title') {
      result = compareTitles(a, b);
    } else {
      result = a.dueDate.localeCompare(b.dueDate);
    }
    if (result === 0) return a.id.localeCompare(b.id);
    return result * factor;
  });
}
