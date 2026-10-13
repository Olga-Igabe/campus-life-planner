import { FIELD_VALIDATORS } from './validators.js';
import { setFieldError, announce } from './ui.js';

const form = document.getElementById('task-form');
const fieldIds = Object.keys(FIELD_VALIDATORS);
const touched = new Set();

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

  announce('form-status', 'All fields are valid.');
});