import client, { types } from './client.js';

/**
 * Appends an entry to the patient_audit_log table.
 */
export async function logAudit({ patientId, actorId, actorName, action, entityType, entityId, changes, ip }) {
  const query = `
    INSERT INTO patient_audit_log
      (patient_id, event_at, event_id, actor_id, actor_name, action, entity_type, entity_id, changes, ip_address)
    VALUES (?, toTimestamp(now()), now(), ?, ?, ?, ?, ?, ?, ?)
  `;
  await client.execute(query, [
    patientId,
    actorId,
    actorName,
    action,
    entityType,
    entityId,
    typeof changes === 'string' ? changes : JSON.stringify(changes),
    ip,
  ]);
}
