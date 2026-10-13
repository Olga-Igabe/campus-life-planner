function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sumMinutes(tasks) {
  return tasks.reduce((sum, task) => sum + task.duration, 0);
}

export function totalMinutes(tasks) {
  return sumMinutes(tasks);
}

export function topTag(tasks) {
  const counts = new Map();
  tasks.forEach((task) => counts.set(task.tag, (counts.get(task.tag) || 0) + 1));

  let best = null;
  counts.forEach((count, tag) => {
    const better = !best || count > best.count ||
      (count === best.count && tag.localeCompare(best.tag) < 0);
    if (better) best = { tag, count };
  });
  return best;
}

export function lastSevenDays(tasks, today = new Date()) {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const iso = toISODate(date);
    days.push({
      date: iso,
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      longLabel: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
      minutes: sumMinutes(tasks.filter((task) => task.dueDate === iso))
    });
  }
  return days;
}

export function weekRange(today = new Date()) {
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const start = addDays(today, -daysSinceMonday);
  return { start: toISODate(start), end: toISODate(addDays(start, 6)) };
}

export function capStatus(tasks, capHours, today = new Date()) {
  const { start, end } = weekRange(today);
  const usedMinutes = sumMinutes(tasks.filter((task) => task.dueDate >= start && task.dueDate <= end));
  const capMinutes = capHours * 60;
  return {
    usedMinutes,
    capMinutes,
    remainingMinutes: capMinutes - usedMinutes,
    over: usedMinutes > capMinutes
  };
}

export function formatHours(minutes) {
  return `${Math.round((minutes / 60) * 100) / 100} h`;
}
