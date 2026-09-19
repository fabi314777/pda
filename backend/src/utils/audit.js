import db from '../db/index.js';

export function logAudit({ usuarioId, accion, entidad, entidadId, valorAnterior, valorNuevo, motivo }) {
  db.prepare(`INSERT INTO audit_logs (usuario_id, accion, entidad, entidad_id, valor_anterior, valor_nuevo, motivo)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    usuarioId ?? null,
    accion,
    entidad,
    entidadId ?? null,
    valorAnterior != null ? String(valorAnterior) : null,
    valorNuevo != null ? String(valorNuevo) : null,
    motivo ?? null
  );
}

export function notify(db_, { usuarioId, tipo, mensaje }) {
  db.prepare('INSERT INTO notifications (usuario_id, tipo, mensaje) VALUES (?, ?, ?)').run(usuarioId ?? null, tipo, mensaje);
}
