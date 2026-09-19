import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/reportes/vencimientos?dias=30
// Pallets almacenados/validados/pendientes cuyo lote vence dentro de N días (o ya vencido)
router.get('/vencimientos', (req, res) => {
  const dias = Number(req.query.dias) || 30;
  const rows = db.prepare(`
    SELECT pl.codigo, p.sku, p.nombre AS producto, l.codigo_lote AS lote,
           l.fecha_vencimiento, pl.cantidad, pl.estado, pos.codigo AS posicion,
           CAST(julianday(l.fecha_vencimiento) - julianday('now') AS INTEGER) AS dias_restantes
    FROM pallets pl
    JOIN products p ON p.id = pl.product_id
    JOIN lots l ON l.id = pl.lot_id
    LEFT JOIN positions pos ON pos.id = pl.position_id
    WHERE l.fecha_vencimiento IS NOT NULL
      AND pl.estado NOT IN ('RECHAZADO', 'DESPACHADO')
      AND date(l.fecha_vencimiento) <= date('now', '+' || ? || ' days')
    ORDER BY l.fecha_vencimiento ASC
  `).all(dias);
  res.json(rows);
});

export default router;
