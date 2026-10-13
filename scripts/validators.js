export const PATTERNS = {
  title: /^\S(?:.*\S)?$/,
  doubleSpace: /\s{2,}/,
  duplicateWord: /\b(\w+)\s+\1\b/i,
  duration: /^[1-9]\d*$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/
};

export function findDuplicateWord(text) {
  const match = text.match(PATTERNS.duplicateWord);
  return match ? match[1] : null;
}

export function isRealDate(text) {
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function validateTitle(value) {
  if (value === '') return 'Title is required.';
  if (!PATTERNS.title.test(value)) return 'Remove the spaces at the start or end of the title.';
  if (PATTERNS.doubleSpace.test(value)) return 'Use single spaces between words.';
  const repeated = findDuplicateWord(value);
  if (repeated) return `The word "${repeated}" is repeated.`;
  return '';
}

export function validateDuration(value) {
  if (value === '') return 'Duration is required.';
  if (!PATTERNS.duration.test(value)) {
    return 'Enter whole minutes, 1 or more, with no decimals or leading zeros.';
  }
  return '';
}

export function validateDate(value) {
  if (value === '') return 'Due date is required.';
  if (!PATTERNS.date.test(value)) return 'Use the format YYYY-MM-DD, for example 2026-10-14.';
  if (!isRealDate(value)) return 'That date does not exist on the calendar.';
  return '';
}

export function validateTag(value) {
  if (value === '') return 'Tag is required.';
  if (!PATTERNS.tag.test(value)) {
    return 'Use letters only, with single spaces or hyphens between words.';
  }
  return '';
}

export function validateCap(value) {
  if (value === '') return 'Weekly cap is required.';
  if (!PATTERNS.duration.test(value)) return 'Enter whole hours, 1 or more.';
  return '';
}

export const FIELD_VALIDATORS = {
  title: validateTitle,
  dueDate: validateDate,
  duration: validateDuration,
  tag: validateTag
};

export function validateTask(task) {
  const errors = {};
  Object.entries(FIELD_VALIDATORS).forEach(([field, validate]) => {
    const message = validate(String(task[field] ?? ''));
    if (message) errors[field] = message;
  });
  return errors;
}
