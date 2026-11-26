// Tiny DOM helpers: escaped templates, dialogs with forms, toasts.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tagged template that escapes interpolations unless wrapped with raw(). */
export function html(strings, ...values) {
  return strings.reduce((out, string, index) => {
    if (index >= values.length) return out + string;
    const value = values[index];
    const text = Array.isArray(value)
      ? value.map((item) => (item instanceof Raw ? item.value : esc(item))).join('')
      : value instanceof Raw
        ? value.value
        : value === false || value === null || value === undefined
          ? ''
          : esc(value);
    return out + string + text;
  }, '');
}

class Raw {
  constructor(value) {
    this.value = value;
  }
}
// Idempotent: raw(raw(x)) is the same markup, so helpers can take either form.
export const raw = (value) => (value instanceof Raw ? value : new Raw(value ?? ''));
export const rhtml = (...args) => raw(html(...args));

export function badge(text, tone = 'grey') {
  return rhtml`<span class="badge ${tone}">${text}</span>`;
}

export function toast(message, kind = 'ok') {
  const container = document.querySelector('.toasts');
  const element = document.createElement('div');
  element.className = `toast ${kind === 'error' ? 'error' : ''}`;
  element.textContent = message;
  container.append(element);
  setTimeout(() => element.remove(), kind === 'error' ? 6000 : 3500);
}

export function empty(title, text, action = '') {
  return rhtml`<div class="empty"><strong>${title}</strong><p>${text}</p>${raw(action)}</div>`;
}

/**
 * Opens a dialog with a form. `onSubmit(data, form)` may throw an ApiError:
 * the message is shown inside the dialog and the form stays open.
 * Resolves with onSubmit's result, or null when cancelled.
 */
export function formDialog({ title, body, submitLabel = 'Salvar', danger = false, onSubmit, onOpen }) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = html`
      <div class="dialog-head">
        <h2>${title}</h2>
        <button type="button" class="close" aria-label="Fechar" data-close>×</button>
      </div>
      <div class="dialog-body">
        <form class="stacked" novalidate>
          <div class="form-error" hidden></div>
          ${raw(body)}
          <div class="dialog-foot">
            <button type="button" class="secondary" data-close>Voltar</button>
            <button type="submit" class="${danger ? 'danger' : ''}">${submitLabel}</button>
          </div>
        </form>
      </div>`;
    document.body.append(dialog);

    const form = dialog.querySelector('form');
    const error = dialog.querySelector('.form-error');
    const submit = form.querySelector('[type=submit]');
    let result = null;

    const close = () => dialog.close();
    dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', close));
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      if (!form.reportValidity()) return;
      submit.disabled = true;
      try {
        result = (await onSubmit(Object.fromEntries(new FormData(form)), form)) ?? true;
        close();
      } catch (exception) {
        error.textContent = exception.message;
        error.hidden = false;
        error.scrollIntoView({ block: 'nearest' });
      } finally {
        submit.disabled = false;
      }
    });

    dialog.showModal();
    onOpen?.(form);
    form.querySelector('input:not([type=hidden]), select, textarea')?.focus();
  });
}

export function confirmDialog({ title, text, confirmLabel, danger = true, onConfirm }) {
  return formDialog({
    title,
    body: html`<p>${text}</p>`,
    submitLabel: confirmLabel,
    danger,
    onSubmit: onConfirm,
  });
}

export function field({ name, label, type = 'text', value = '', required = false, hint, attrs = '', options }) {
  const id = `f-${name}-${Math.random().toString(36).slice(2, 7)}`;
  const control = options
    ? html`<select id="${id}" name="${name}" ${raw(required ? 'required' : '')} ${raw(attrs)}>
        ${options.map(([optionValue, optionLabel]) =>
          rhtml`<option value="${optionValue}" ${raw(String(optionValue) === String(value) ? 'selected' : '')}>${optionLabel}</option>`,
        )}
      </select>`
    : type === 'textarea'
      ? html`<textarea id="${id}" name="${name}" rows="3" ${raw(attrs)}>${value}</textarea>`
      : html`<input id="${id}" name="${name}" type="${type}" value="${value}" ${raw(required ? 'required' : '')} ${raw(attrs)}>`;
  return rhtml`<div class="field"><label for="${id}">${label}</label>${raw(control)}${hint ? rhtml`<span class="hint">${hint}</span>` : ''}</div>`;
}

/** Runs an action from a button, with a toast on success or error. */
export async function run(button, action, successMessage) {
  if (button) button.disabled = true;
  try {
    const result = await action();
    if (successMessage) toast(successMessage);
    return result;
  } catch (exception) {
    toast(exception.message, 'error');
    return undefined;
  } finally {
    if (button) button.disabled = false;
  }
}
