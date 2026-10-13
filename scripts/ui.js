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