/**
 * Nova Mortgage Inventarisatie: leverancier-onafhankelijke domeinlogica.
 * Geen API-, opslag-, mail- of CRM-side effects in deze module.
 */
export const APPROVAL_ROLES = Object.freeze(['advisor', 'backoffice']);
export const WORKFLOW_STATUSES = Object.freeze(['active', 'paused', 'blocked', 'completed']);

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return structuredClone(value);
}

/** Deterministische serialisatie: objectsleutels gesorteerd, zodat vergelijking niet van volgorde afhangt. */
export function canonical(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}

/**
 * Bindt een goedkeuring aan exact dit dossier, deze sectie, dit veld, deze CRM-sleutel,
 * deze bron en deze baseline/voorstelwaarde. Elke latere wijziging maakt de goedkeuring ongeldig.
 */
export function approvalBinding(inventoryId, sectionId, field) {
  return canonical({
    inventoryId, sectionId, fieldId: field.id, key: field.key, sourceId: field.sourceId,
    baseline: field.current ?? null, proposed: field.proposed ?? null
  });
}

export function createInventory(seed) {
  ensure(seed?.id && seed?.customer?.id && seed?.serviceId, 'Dossier, relatie en dienst moeten een ID hebben.');
  const sections = (seed.sections || []).map(section => ({
    id: section.id,
    title: section.title,
    fields: (section.fields || []).map(field => ({
      ...field,
      status: field.status || (
        field.proposed === undefined || field.proposed === null
          ? 'missing'
          : Object.is(field.current, field.proposed) ? 'unchanged' : 'proposed'
      ),
      approval: field.approval || null
    }))
  }));
  return {
    ...clone(seed),
    workflowStatus: seed.workflowStatus || 'active',
    sections,
    signals: (seed.signals || []).map(signal => ({ ...signal, review: signal.review || null })),
    documents: clone(seed.documents || []),
    advey: clone(seed.advey || { status: 'pending' }),
    completion: clone(seed.completion || { saved: false, sent: false, taskClosed: false }),
    audit: clone(seed.audit || []),
    archiveConfirmedAt: seed.archiveConfirmedAt || null
  };
}

export function requireApprover(actor) {
  ensure(actor?.id && APPROVAL_ROLES.includes(actor.role), 'Alleen bevoegde adviseur of binnendienst mag goedkeuren.');
}

export function approveFields(inventory, sectionId, fieldIds, actor, at = new Date().toISOString()) {
  requireApprover(actor);
  ensure(inventory.workflowStatus === 'active', 'Gepauzeerd of geblokkeerd dossier mag geen goedkeuringen ontvangen.');
  ensure(Array.isArray(fieldIds), 'Veld-ID\'s moeten als lijst worden aangeleverd.');
  const requested = new Set(fieldIds);
  ensure(requested.size > 0, 'Selecteer minimaal één veld.');
  ensure(requested.size === fieldIds.length, 'Dubbele veld-ID is niet toegestaan.');
  const next = clone(inventory);
  const section = next.sections.find(s => s.id === sectionId);
  ensure(section, 'Onbekende klantkaartsectie.');
  for (const id of requested) {
    const field = section.fields.find(f => f.id === id);
    ensure(field && field.status === 'proposed', 'Alleen bestaande, nog niet goedgekeurde voorstellen kunnen worden goedgekeurd.');
    ensure(field.sourceId && field.key, 'Elk voorstel vereist een veldsleutel en bron-ID.');
  }
  for (const field of section.fields) {
    if (!requested.has(field.id)) continue;
    field.status = 'approved';
    field.approval = {
      by: actor.id,
      role: actor.role,
      at,
      baseline: clone(field.current),
      proposed: clone(field.proposed),
      binding: approvalBinding(next.id, sectionId, field)
    };
    next.audit.push({ type: 'field.approved', sectionId, fieldId: field.id, actorId: actor.id, at });
  }
  return next;
}

export function rejectField(inventory, sectionId, fieldId, actor, reason, at = new Date().toISOString()) {
  requireApprover(actor);
  ensure(reason?.trim(), 'Reden voor afwijzing is vereist.');
  ensure(inventory.workflowStatus === 'active', 'Workflow is niet actief.');
  const next = clone(inventory);
  const field = next.sections.find(s => s.id === sectionId)?.fields.find(f => f.id === fieldId);
  ensure(field?.status === 'proposed', 'Alleen een open voorstel kan worden afgewezen.');
  field.status = 'rejected';
  field.review = { by: actor.id, reason: reason.trim(), at };
  next.audit.push({ type: 'field.rejected', fieldId, actorId: actor.id, at });
  return next;
}

export function reviewSignal(inventory, signalId, actor, decision, at = new Date().toISOString()) {
  requireApprover(actor);
  ensure(['accepted', 'dismissed', 'needs_followup'].includes(decision), 'Onbekende beoordeling.');
  ensure(inventory.workflowStatus === 'active', 'Workflow is niet actief.');
  const next = clone(inventory);
  const signal = next.signals.find(s => s.id === signalId);
  ensure(signal && !signal.review, 'Signaal ontbreekt of is reeds beoordeeld.');
  signal.review = { decision, by: actor.id, at };
  next.audit.push({ type: 'signal.reviewed', signalId, decision, actorId: actor.id, at });
  return next;
}

export function setWorkflowStatus(inventory, status, actorId = 'system', at = new Date().toISOString()) {
  ensure(WORKFLOW_STATUSES.includes(status), 'Onbekende workflowstatus.');
  // Afronding loopt uitsluitend via completeInventory; een afgerond dossier wordt niet heropend
  // (heropening = nieuwe procesinstantie, spec §3.2).
  ensure(status !== 'completed', 'Gebruik completeInventory voor afronding.');
  ensure(inventory.workflowStatus !== 'completed', 'Afgerond dossier kan niet van status wisselen; start een nieuwe instantie.');
  const next = clone(inventory);
  next.workflowStatus = status;
  next.audit.push({ type: 'workflow.status', status, actorId, at });
  return next;
}

export function completionCheck(inventory) {
  // Elk afsluitcriterium vereist naast de vlag ook een bewijsverwijzing (spec §1/§10: 'aantoonbaar').
  const c = inventory.completion || {};
  const checks = {
    adveyApproved: inventory.advey?.status === 'approved' && Boolean(inventory.advey?.approvedBy),
    reportSaved: c.saved === true && Boolean(c.savedDocumentId),
    reportSent: c.sent === true && Boolean(c.sentEvidenceId),
    taskClosed: c.taskClosed === true && Boolean(c.taskClosedEvidenceId)
  };
  return { ready: Object.values(checks).every(Boolean), checks };
}

export function completeInventory(inventory, actor, at = new Date().toISOString()) {
  requireApprover(actor);
  const readiness = completionCheck(inventory);
  ensure(inventory.workflowStatus === 'active' && readiness.ready, 'Inventarisatie pas klaar na Advey-akkoord, opslag, verzending en taakafsluiting.');
  const next = clone(inventory);
  next.workflowStatus = 'completed';
  next.audit.push({ type: 'inventory.completed', actorId: actor.id, at });
  return next;
}

export function confirmArchive(inventory, actor, archivedAt = new Date().toISOString(), now = new Date()) {
  requireApprover(actor);
  ensure(inventory.workflowStatus === 'completed', 'Archiveren kan pas na volledige afronding.');
  ensure(!inventory.archiveConfirmedAt, 'Archivering is al bevestigd.');
  const archivedMs = Date.parse(archivedAt);
  ensure(Number.isFinite(archivedMs), 'Ongeldige archiefdatum.');
  ensure(archivedMs <= new Date(now).getTime(), 'Archiefdatum mag niet in de toekomst liggen.');
  const next = clone(inventory);
  next.archiveConfirmedAt = archivedAt;
  next.audit.push({ type: 'inventory.archive_confirmed', actorId: actor.id, at: archivedAt });
  return next;
}

export function purgeDueAt(inventory) {
  if (!inventory.archiveConfirmedAt) return null;
  const time = Date.parse(inventory.archiveConfirmedAt);
  ensure(Number.isFinite(time), 'Ongeldige archiefdatum.');
  return new Date(time + 48 * 60 * 60 * 1000).toISOString();
}

export function buildSignalSummary(inventory) {
  return {
    inventoryId: inventory.id,
    customerId: inventory.customer.id,
    serviceId: inventory.serviceId,
    signalCount: inventory.signals.length,
    reviewedCount: inventory.signals.filter(s => s.review).length,
    items: inventory.signals.map(s => ({
      id: s.id,
      title: s.title,
      severity: s.severity,
      sourceId: s.sourceId,
      finding: s.finding,
      review: s.review
    }))
  };
}
