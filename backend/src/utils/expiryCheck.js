import db from '../db/index.js';

const UMBRAL_DIAS = 30;

// Genera una notificación por cada pallet activo cuyo lote esté por vencer o vencido,
// evitando duplicar si ya se notificó ese pallet en las últimas 24 horas.
export function checkVencimientos() {
  const proximos = db.prepare(`
    SELECT pl.id AS pallet_id, pl.codigo, p.nombre AS producto, l.fecha_vencimiento,
           CAST(julianday(l.fecha_vencimiento) - julianday('now') AS INTEGER) AS dias_restantes
    FROM pallets pl
    JOIN products p ON p.id = pl.product_id
    JOIN lots l ON l.id = pl.lot_id
    WHERE l.fecha_vencimiento IS NOT NULL
      AND pl.estado NOT IN ('RECHAZADO', 'DESPACHADO')
      AND date(l.fecha_vencimiento) <= date('now', '+' || ? || ' days')
  `).all(UMBRAL_DIAS);

  const yaNotificado = db.prepare(`
    SELECT id FROM notifications
    WHERE mensaje LIKE ? AND fecha >= datetime('now', '-1 day')
  `);
  const insert = db.prepare(`INSERT INTO notifications (usuario_id, tipo, mensaje) VALUES (NULL, ?, ?)`);

  let creadas = 0;
  for (const p of proximos) {
    const vencido = p.dias_restantes < 0;
    const mensaje = vencido
      ? `Pallet ${p.codigo} (${p.producto}) está VENCIDO desde hace ${Math.abs(p.dias_restantes)} día(s)`
      : `Pallet ${p.codigo} (${p.producto}) vence en ${p.dias_restantes} día(s)`;
    const dup = yaNotificado.get(`%${p.codigo}%`);
    if (!dup) {
      insert.run(vencido ? 'ERROR' : 'WARNING', mensaje);
      creadas++;
    }
  }
  return { revisados: proximos.length, creadas };
}
