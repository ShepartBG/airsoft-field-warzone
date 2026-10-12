// „Поискай оферта“ – модален прозорец с бърза връзка: телефон, Viber, имейл.
// Текстът за Viber и имейла се попълва автоматично според избраната услуга.
import { sound } from './sound.js';

let CFG;
const modal = () => document.getElementById('quoteModal');

function messageFor(service, extra) {
  const lines = ['Здравейте!'];
  lines.push(service ? `Интересувам се от: ${service}.` : 'Интересувам се от оферта.');
  if (extra) lines.push(extra);
  return lines.join('\n');
}

function emailBody(service, extra) {
  return [
    messageFor(service, extra),
    '',
    'Желана дата: ',
    'Брой участници: ',
    'Локация (при вас / на терена): ',
    'Телефон за връзка: ',
    '',
  ].join('\n');
}

export function viberLink(text) {
  const n = encodeURIComponent(CFG.phone);
  return `viber://chat?number=${n}` + (text ? `&draft=${encodeURIComponent(text)}` : '');
}

export function mailLink(service, extra) {
  const subject = `Запитване: ${service || 'оферта'}`;
  return `mailto:${CFG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody(service, extra))}`;
}

export function openQuote(service = '', extra = '') {
  const dlg = modal();
  dlg.querySelector('[data-q-service]').textContent = service || 'По ваш избор';
  dlg.querySelector('[data-q-viber]').href = viberLink(messageFor(service, extra));
  dlg.querySelector('[data-q-mail]').href = mailLink(service, extra);
  sound.ui();
  dlg.showModal();
}

export function initForms(cfg) {
  CFG = cfg;
  const dlg = modal();
  dlg.querySelector('[data-q-tel]').href = `tel:${cfg.phone}`;
  dlg.querySelectorAll('[data-phone-display]').forEach((n) => (n.textContent = cfg.phoneDisplay));
  dlg.querySelector('[data-q-email-text]').textContent = cfg.email;
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quote]');
    if (b) { e.preventDefault(); openQuote(b.dataset.quote || ''); }
  });
}
