import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// GET /api/validaciones/pendientes
router.get('/pendientes', (req, res) => {
  const rows = db.prepare(`
    SELECT pl.id, pl.codigo, pl.cantidad, pl.peso, pl.fecha_ingreso,
           p.sku, p.nombre AS producto, l.codigo_lote AS lote, l.fecha_vencimiento,
           u.nombre AS usuario
    FROM pallets pl
    JOIN products p ON p.id = pl.product_id
    LEFT JOIN lots l ON l.id = pl.lot_id
    LEFT JOIN users u ON u.id = pl.usuario_ingreso_id
    WHERE pl.estado = 'PENDIENTE'
    ORDER BY pl.fecha_ingreso ASC
  `).all();
  res.json(rows);
});

// GET /api/validaciones/:codigo — comparar escaneo vs. registro
router.get('/:codigo', (req, res) => {
  const pallet = db.prepare(`
    SELECT pl.*, p.sku, p.nombre AS producto, l.codigo_lote AS lote, l.fecha_vencimiento
    FROM pallets pl JOIN products p ON p.id = pl.product_id
    LEFT JOIN lots l ON l.id = pl.lot_id
    WHERE pl.codigo = ?
  `).get(req.params.codigo);
  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });

  const entry = db.prepare('SELECT * FROM pallet_entries WHERE pallet_id = ? ORDER BY fecha DESC LIMIT 1').get(pallet.id);

  const comparacion = entry ? [
    { campo: 'Cantidad', escaneado: entry.cantidad_escaneada, registrado: pallet.cantidad, coincide: entry.cantidad_escaneada === pallet.cantidad },
    { campo: 'Lote', escaneado: entry.lote_escaneado, registrado: pallet.lote, coincide: entry.lote_escaneado === pallet.lote },
    { campo: 'Vencimiento', escaneado: entry.vencimiento_escaneado, registrado: pallet.fecha_vencimiento, coincide: entry.vencimiento_escaneado === pallet.fecha_vencimiento },
    { campo: 'SKU', escaneado: entry.sku_escaneado, registrado: pallet.sku, coincide: entry.sku_escaneado === pallet.sku },
  ] : [];

  res.json({ pallet, entry, comparacion });
});

// POST /api/validaciones/:codigo/validar
router.post('/:codigo/validar', requirePermission('pallets.validar'), (req, res) => {
  const pallet = db.prepare('SELECT * FROM pallets WHERE codigo = ?').get(req.params.codigo);
  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });
  if (pallet.estado !== 'PENDIENTE') return res.status(409).json({ error: 'El pallet no está pendiente de validación' });

  db.prepare(`UPDATE pallets SET estado = 'VALIDADO' WHERE id = ?`).run(pallet.id);
  db.prepare(`INSERT INTO pallet_validations (pallet_id, usuario_id, resultado) VALUES (?, ?, 'VALIDADO')`).run(pallet.id, req.user.id);
  logAudit({ usuarioId: req.user.id, accion: 'VALIDACION', entidad: 'pallet', entidadId: pallet.id, valorAnterior: 'PENDIENTE', valorNuevo: 'VALIDADO' });

  res.json({ mensaje: 'El ingreso fue validado correctamente.', estado: 'VALIDADO' });
});

// POST /api/validaciones/:codigo/rechazar  { motivo }
router.post('/:codigo/rechazar', requirePermission('pallets.validar'), (req, res) => {
  const { motivo } = req.body;
  if (!motivo) return res.status(400).json({ error: 'Debes indicar el motivo del rechazo' });

  const pallet = db.prepare('SELECT * FROM pallets WHERE codigo = ?').get(req.params.codigo);
  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });
  if (pallet.estado !== 'PENDIENTE') return res.status(409).json({ error: 'El pallet no está pendiente de validación' });

  db.prepare(`UPDATE pallets SET estado = 'RECHAZADO', motivo_rechazo = ? WHERE id = ?`).run(motivo, pallet.id);
  db.prepare(`INSERT INTO pallet_validations (pallet_id, usuario_id, resultado, motivo) VALUES (?, ?, 'RECHAZADO', ?)`).run(pallet.id, req.user.id, motivo);
  logAudit({ usuarioId: req.user.id, accion: 'RECHAZO', entidad: 'pallet', entidadId: pallet.id, valorAnterior: 'PENDIENTE', valorNuevo: 'RECHAZADO', motivo });

  res.json({ mensaje: 'El ingreso fue rechazado.', estado: 'RECHAZADO' });
});

export default router;
