import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/historial?codigo=&sku=&lote=&usuario=&estado=
// Devuelve una línea de tiempo combinada de eventos de auditoría para búsquedas globales
router.get('/', (req, res) => {
  const { codigo, sku, lote, usuario } = req.query;

  let palletIds = null;
  if (codigo || sku || lote) {
    const clauses = [];
    const params = [];
    if (codigo) { clauses.push('pl.codigo LIKE ?'); params.push(`%${codigo}%`); }
    if (sku) { clauses.push('p.sku LIKE ?'); params.push(`%${sku}%`); }
    if (lote) { clauses.push('l.codigo_lote LIKE ?'); params.push(`%${lote}%`); }
    const rows = db.prepare(`
      SELECT pl.id FROM pallets pl
      JOIN products p ON p.id = pl.product_id
      LEFT JOIN lots l ON l.id = pl.lot_id
      WHERE ${clauses.join(' AND ')}
    `).all(...params);
    palletIds = rows.map(r => r.id);
    if (palletIds.length === 0) return res.json([]);
  }

  const clauses = ["a.entidad = 'pallet'"];
  const params = [];
  if (palletIds) {
    clauses.push(`a.entidad_id IN (${palletIds.map(() => '?').join(',')})`);
    params.push(...palletIds);
  }
  if (usuario) { clauses.push('u.nombre LIKE ?'); params.push(`%${usuario}%`); }

  const rows = db.prepare(`
    SELECT a.id, a.accion, a.valor_anterior, a.valor_nuevo, a.motivo, a.fecha,
           u.nombre AS usuario, pl.codigo AS pallet
    FROM audit_logs a
    LEFT JOIN users u ON u.id = a.usuario_id
    LEFT JOIN pallets pl ON pl.id = a.entidad_id AND a.entidad = 'pallet'
    WHERE ${clauses.join(' AND ')}
    ORDER BY a.fecha DESC
    LIMIT 200
  `).all(...params);

  res.json(rows);
});

export default router;
