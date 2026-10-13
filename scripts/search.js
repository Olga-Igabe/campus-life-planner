const TAG_FILTER = /^@tag:(.*)$/;
export const SEARCH_FIELDS = ['title', 'tag', 'dueDate'];

export function compileRegex(source, flags = '') {
  try {
    return new RegExp(source, flags);
  } catch {
    return null;
  }
}

export function buildSearch(input, ignoreCase) {
  const inactive = { active: false, valid: true, field: null, regex: null };
  if (input === '') return inactive;

  const tagFilter = TAG_FILTER.exec(input);
  const field = tagFilter ? 'tag' : null;
  const source = tagFilter ? tagFilter[1] : input;
  if (source === '') return inactive;

  const regex = compileRegex(source, ignoreCase ? 'i' : '');
  if (!regex) return { active: true, valid: false, field, regex: null };
  return { active: true, valid: true, field, regex };
}

export function regexForField(search, field) {
  if (!search.active || !search.valid) return null;
  if (search.field && search.field !== field) return null;
  return search.regex;
}

export function taskMatches(task, search) {
  if (!search.active || !search.valid) return true;
  const fields = search.field ? [search.field] : SEARCH_FIELDS;
  return fields.some((field) => search.regex.test(String(task[field])));
}

export function splitMatches(text, regex) {
  if (!regex) return [{ text, match: false }];
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const global = new RegExp(regex.source, flags);
  const segments = [];
  let last = 0;
  let found = global.exec(text);

  while (found !== null) {
    if (found[0] === '') {
      global.lastIndex += 1;
    } else {
      if (found.index > last) {
        segments.push({ text: text.slice(last, found.index), match: false });
      }
      segments.push({ text: found[0], match: true });
      last = found.index + found[0].length;
    }
    found = global.exec(text);
  }

  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}
