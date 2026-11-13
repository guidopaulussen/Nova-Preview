import {
  createInventory, approveFields, reviewSignal, buildSignalSummary
} from './packages/mortgage-inventory/domain.js';
import { createDemoSeed } from './demo-data.js';

const actor = { id: 'demo-adviseur', role: 'advisor' };
let inventory = createInventory(createDemoSeed());
let activeSection = 'inkomen';

const $ = id => document.getElementById(id);
const plain = value => value == null || value === '' ? 'Niet bekend' : String(value);
const format = (value) => plain(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function showError(error) {
  const box = $('ui-message');
  box.textContent = error?.message || String(error);
  box.hidden = false;
}
function clearError() { $('ui-message').hidden = true; $('ui-message').textContent = ''; }

const decisionLabel = { accepted: 'Geaccepteerd', dismissed: 'Niet relevant', needs_followup: 'Opvolging nodig' };

const statusLabel = {
  missing: ['Ontbreekt','missing'],
  unchanged: ['Ongewijzigd','unchanged'],
  proposed: ['Controleren','proposed'],
  approved: ['Goedgekeurd','approved'],
  rejected: ['Afgewezen','rejected']
};

function renderTabs() {
  $('section-tabs').innerHTML = inventory.sections.map(s =>
    `<button type="button" role="tab" data-section="${esc(s.id)}" aria-selected="${s.id === activeSection}" class="${s.id === activeSection ? 'selected' : ''}">${esc(s.title)}</button>`
  ).join('');
  $('section-tabs').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeSection = button.dataset.section;
    render();
  }));
}

function renderFields() {
  const section = inventory.sections.find(s => s.id === activeSection);
  $('section-caption').innerHTML = `<div><strong>${esc(section.title)}</strong><small>${esc(section.subtitle)}</small></div><span>${section.fields.length} velden</span>`;
  $('fields-body').innerHTML = section.fields.map(f => {
    const [label, cls] = statusLabel[f.status] || ['Onbekend', 'missing'];
    const value = f.proposed == null ? '<span class="muted">Nog te inventariseren</span>' :
      `<strong class="proposal-value">${esc(format(f.proposed))}</strong>`;
    return `<tr>
      <td><strong>${esc(f.label)}</strong></td>
      <td>${esc(format(f.current))}</td>
      <td>${value}</td>
      <td><span class="source-ref">${esc(f.sourceId || '—')}</span></td>
      <td><span class="field-status ${cls}">${label}</span></td>
      <td>${f.status === 'proposed' ? `<button type="button" class="field-approve" data-field="${esc(f.id)}" aria-label="Keur ${esc(f.label)} goed">✓</button>` : '—'}</td>
    </tr>`;
  }).join('');
  $('fields-body').querySelectorAll('[data-field]').forEach(button => button.addEventListener('click', () => {
    try {
      inventory = approveFields(inventory, activeSection, [button.dataset.field], actor);
      clearError();
      render();
    } catch (error) { showError(error); }
  }));
  const open = section.fields.filter(f => f.status === 'proposed').length;
  $('approve-section').disabled = open === 0;
  $('approve-section').textContent = open ? `Keur ${open} voorgestelde velden goed ✓` : 'Geen voorstellen in deze sectie';
}

function renderSignals() {
  const unreviewed = inventory.signals.filter(s => !s.review).length;
  $('signal-count').textContent = unreviewed + ' open';
  $('signals').innerHTML = inventory.signals.map(s => `<div class="signal-item">
    <div class="signal-head"><span class="signal-severity ${esc(s.severity)}"></span><strong>${esc(s.title)}</strong><span class="signal-tag">${s.review ? esc(decisionLabel[s.review.decision] || 'Beoordeeld') : 'Open'}</span></div>
    <p>${esc(s.finding)}</p>
    <div class="signal-actions"><small>Bron: ${esc(s.sourceId || 'Nog niet bevestigd')}</small>${!s.review ? `<button type="button" data-signal="${esc(s.id)}" aria-label="Markeer ${esc(s.title)} als opvolging nodig">Opvolging nodig →</button>` : '<span class="reviewed-mark">✓ Adviseur</span>'}</div>
  </div>`).join('');
  $('signals').querySelectorAll('[data-signal]').forEach(button => button.addEventListener('click', () => {
    try {
      inventory = reviewSignal(inventory, button.dataset.signal, actor, 'needs_followup');
      clearError();
      render();
    } catch (error) { showError(error); }
  }));
}
function renderDocuments() {
  $('documents').innerHTML = inventory.documents.map(d => `<div class="document-row"><div class="document-icon">▤</div><div><strong>${esc(d.name)}</strong><small>${esc(d.category)} · ${esc(d.received)}</small></div><span title="Documentmetadata, download niet beschikbaar">✓</span></div>`).join('');
}
function renderMetrics() {
  $('customer-name').textContent = inventory.customer.displayName;
  const fields = inventory.sections.flatMap(s => s.fields);
  const approved = fields.filter(f => f.status === 'approved').length;
  const unchanged = fields.filter(f => f.status === 'unchanged').length;
  const settled = approved + unchanged;
  const percentage = fields.length ? Math.round(settled / fields.length * 100) : 0;
  $('completion-percent').textContent = percentage + '%';
  $('progress-bar').style.width = percentage + '%';
  // 'Ongewijzigd' is niet door een medewerker gecontroleerd; daarom apart benoemd.
  $('hero-subtitle').textContent = `${approved} goedgekeurd · ${unchanged} ongewijzigd · ${fields.length} velden totaal`;
  $('metric-proposals').textContent = fields.filter(f => f.status === 'proposed').length;
  $('metric-signals').textContent = inventory.signals.filter(s => !s.review).length;
  $('metric-documents').textContent = inventory.documents.length;
}

function renderTimeline() {
  const entries = [
    ['Dossier en bronnen opgehaald','completed','Synthetische brongegevens geladen'],
    ['Klantkaart voorbereiden','current','Voorstellen worden per sectie beoordeeld'],
    ['Voorbereiding T − 45','future','Definitief rapport en signaleringschecklist'],
    ['Inventarisatiegesprek','future','Adviesbox via bestaande HBX-route'],
    ['Advey-verslag beoordelen','future','Redactie en expliciet akkoord adviseur'],
    ['Verslag opslaan, verzenden en taak afsluiten','future','Pas daarna inventarisatie gereed']
  ];
  $('timeline').innerHTML = entries.map(([title,status,detail], index) => `<li class="timeline-row ${status}"><span class="timeline-number">${index + 1}</span><div><strong>${title}</strong><small>${detail}</small></div></li>`).join('');
}
function showSummary() {
  const summary = buildSignalSummary(inventory);
  $('findings-content').innerHTML = `<div class="summary-count"><strong>${summary.signalCount} signaleringen</strong><span>${summary.reviewedCount} beoordeeld</span></div>` +
    summary.items.map(s => `<div class="summary-item"><strong>${esc(s.title)}</strong><p>${esc(s.finding)}</p><small>Bron: ${esc(s.sourceId || 'nog te bevestigen')} · ${s.review ? 'Beoordeeld' : 'Nog niet beoordeeld'}</small></div>`).join('') +
    '<p class="summary-disclaimer">Dit is geen hypotheekadvies en geen definitief procesrapport. Opslag in eBlinqx vereist expliciete goedkeuring en een geverifieerde API-route.</p>';
  $('findings-dialog').showModal();
}
function render() { renderTabs(); renderFields(); renderSignals(); renderDocuments(); renderMetrics(); renderTimeline(); }
$('approve-section').addEventListener('click', () => {
  try {
    const section = inventory.sections.find(s => s.id === activeSection);
    const fields = section.fields.filter(f => f.status === 'proposed').map(f => f.id);
    if (fields.length) inventory = approveFields(inventory, activeSection, fields, actor);
    clearError();
    render();
  } catch (error) { showError(error); }
});
$('summary-button').addEventListener('click', showSummary);
$('review-button').addEventListener('click', showSummary);
$('close-dialog').addEventListener('click', () => $('findings-dialog').close());
$('close-dialog-bottom').addEventListener('click', () => $('findings-dialog').close());
$('reset-demo').addEventListener('click', () => { inventory = createInventory(createDemoSeed(inventory.customer.displayName)); activeSection = 'inkomen'; clearError(); render(); });
document.querySelectorAll('[data-nav]').forEach(link => link.addEventListener('click', () => {
  if (link.dataset.nav === 'dashboard') return;
  document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('active', item === link));
}));
render();
