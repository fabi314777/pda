import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

const BASE_SELECT = `
  SELECT pl.id, pl.codigo, pl.cantidad, pl.peso, pl.estado, pl.fecha_ingreso, pl.motivo_rechazo,
         p.sku, p.nombre AS producto, l.codigo_lote AS lote, l.fecha_vencimiento,
         pos.codigo AS posicion,
         u.nombre AS usuario_ingreso
  FROM pallets pl
  JOIN products p ON p.id = pl.product_id
  LEFT JOIN lots l ON l.id = pl.lot_id
  LEFT JOIN positions pos ON pos.id = pl.position_id
  LEFT JOIN users u ON u.id = pl.usuario_ingreso_id
`;

// GET /api/pallets  — listado con filtros y paginación
router.get('/', (req, res) => {
  const { search, estado, page = 1, pageSize = 20 } = req.query;
  const clauses = [];
  const params = [];
  if (estado) { clauses.push('pl.estado = ?'); params.push(estado); }
  if (search) {
    clauses.push('(pl.codigo LIKE ? OR p.sku LIKE ? OR p.nombre LIKE ? OR l.codigo_lote LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) c FROM (${BASE_SELECT} ${where})`).get(...params).c;
  const offset = (Number(page) - 1) * Number(pageSize);
  const rows = db.prepare(`${BASE_SELECT} ${where} ORDER BY pl.fecha_ingreso DESC LIMIT ? OFFSET ?`)
    .all(...params, Number(pageSize), offset);
  res.json({ data: rows, total, page: Number(page), pageSize: Number(pageSize) });
});

// GET /api/pallets/:codigo — detalle + movimientos + historial
router.get('/:codigo', (req, res) => {
  const pallet = db.prepare(`${BASE_SELECT} WHERE pl.codigo = ?`).get(req.params.codigo);
  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });
  const palletId = db.prepare('SELECT id FROM pallets WHERE codigo = ?').get(req.params.codigo).id;

  const movimientos = db.prepare(`
    SELECT m.id, m.fecha, m.motivo, u.nombre AS usuario,
           pa.codigo AS posicion_anterior, pn.codigo AS posicion_nueva
    FROM pallet_movements m
    LEFT JOIN positions pa ON pa.id = m.position_anterior_id
    LEFT JOIN positions pn ON pn.id = m.position_nueva_id
    JOIN users u ON u.id = m.usuario_id
    WHERE m.pallet_id = ? ORDER BY m.fecha DESC
  `).all(palletId);

  const validaciones = db.prepare(`
    SELECT v.id, v.resultado, v.motivo, v.fecha, u.nombre AS usuario
    FROM pallet_validations v JOIN users u ON u.id = v.usuario_id
    WHERE v.pallet_id = ? ORDER BY v.fecha DESC
  `).all(palletId);

  const auditoria = db.prepare(`
    SELECT a.id, a.accion, a.valor_anterior, a.valor_nuevo, a.motivo, a.fecha, u.nombre AS usuario
    FROM audit_logs a LEFT JOIN users u ON u.id = a.usuario_id
    WHERE a.entidad = 'pallet' AND a.entidad_id = ? ORDER BY a.fecha DESC
  `).all(palletId);

  res.json({ pallet, movimientos, validaciones, auditoria });
});

// POST /api/pallets/ingreso — registrar ingreso (escaneado o manual)
router.post('/ingreso', requirePermission('pallets.crear'), (req, res) => {
  const { codigo, sku, lote, cantidad, peso, vencimiento, metodo = 'MANUAL' } = req.body;

  if (!codigo || !sku || !cantidad) {
    return res.status(400).json({ error: 'Código, SKU y cantidad son obligatorios' });
  }

  const existing = db.prepare('SELECT id FROM pallets WHERE codigo = ?').get(codigo);
  if (existing) {
    return res.status(409).json({ error: `Ya existe un pallet con el código ${codigo}` });
  }

  const product = db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
  if (!product) {
    return res.status(422).json({ error: `El SKU ${sku} no existe en el maestro de productos` });
  }

  let lotId = null;
  if (lote) {
    let lotRow = db.prepare('SELECT id FROM lots WHERE codigo_lote = ? AND product_id = ?').get(lote, product.id);
    if (!lotRow) {
      const r = db.prepare('INSERT INTO lots (codigo_lote, product_id, fecha_vencimiento) VALUES (?, ?, ?)')
        .run(lote, product.id, vencimiento || null);
      lotId = r.lastInsertRowid;
    } else {
      lotId = lotRow.id;
    }
  }

  const info = db.prepare(`INSERT INTO pallets (codigo, product_id, lot_id, cantidad, peso, estado, usuario_ingreso_id)
    VALUES (?, ?, ?, ?, ?, 'PENDIENTE', ?)`).run(codigo, product.id, lotId, cantidad, peso || null, req.user.id);
  const palletId = info.lastInsertRowid;

  db.prepare(`INSERT INTO pallet_entries (pallet_id, codigo_escaneado, sku_escaneado, lote_escaneado, cantidad_escaneada, peso_escaneado, vencimiento_escaneado, metodo, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(palletId, codigo, sku, lote || null, cantidad, peso || null, vencimiento || null, metodo, req.user.id);

  logAudit({ usuarioId: req.user.id, accion: 'INGRESO_PALLET', entidad: 'pallet', entidadId: palletId, valorAnterior: null, valorNuevo: 'PENDIENTE' });

  res.status(201).json({ codigo, estado: 'PENDIENTE' });
});

// PATCH /api/pallets/:codigo/editar — editar un ingreso mientras esté PENDIENTE
// Requiere el mismo permiso que validar (supervisor/admin), y queda registrado en auditoría.
router.patch('/:codigo/editar', requirePermission('pallets.validar'), (req, res) => {
  const { sku, lote, cantidad, peso, vencimiento } = req.body;
  const pallet = db.prepare(`
    SELECT pl.*, p.sku AS sku_actual, l.codigo_lote AS lote_actual, l.fecha_vencimiento AS vencimiento_actual
    FROM pallets pl JOIN products p ON p.id = pl.product_id
    LEFT JOIN lots l ON l.id = pl.lot_id
    WHERE pl.codigo = ?
  `).get(req.params.codigo);

  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });
  if (pallet.estado !== 'PENDIENTE') return res.status(409).json({ error: 'Solo se puede editar un pallet mientras está PENDIENTE de validación' });
  if (!sku || !cantidad) return res.status(400).json({ error: 'SKU y cantidad son obligatorios' });

  const product = db.prepare('SELECT * FROM products WHERE sku = ?').get(sku);
  if (!product) return res.status(422).json({ error: `El SKU ${sku} no existe en el maestro de productos` });

  let lotId = pallet.lot_id;
  if (lote || vencimiento) {
    let lotRow = lote ? db.prepare('SELECT id FROM lots WHERE codigo_lote = ? AND product_id = ?').get(lote, product.id) : null;
    if (!lotRow) {
      lotId = db.prepare('INSERT INTO lots (codigo_lote, product_id, fecha_vencimiento) VALUES (?, ?, ?)')
        .run(lote || null, product.id, vencimiento || null).lastInsertRowid;
    } else {
      lotId = lotRow.id;
    }
  }

  const valorAnterior = {
    sku: pallet.sku_actual, lote: pallet.lote_actual, cantidad: pallet.cantidad, peso: pallet.peso, vencimiento: pallet.vencimiento_actual,
  };
  const valorNuevo = { sku, lote: lote || null, cantidad: Number(cantidad), peso: peso ? Number(peso) : null, vencimiento: vencimiento || null };

  db.prepare(`UPDATE pallets SET product_id = ?, lot_id = ?, cantidad = ?, peso = ? WHERE id = ?`)
    .run(product.id, lotId, Number(cantidad), peso ? Number(peso) : null, pallet.id);

  db.prepare(`INSERT INTO pallet_entries (pallet_id, codigo_escaneado, sku_escaneado, lote_escaneado, cantidad_escaneada, peso_escaneado, vencimiento_escaneado, metodo, usuario_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'EDICION', ?)`).run(pallet.id, pallet.codigo, sku, lote || null, Number(cantidad), peso ? Number(peso) : null, vencimiento || null, req.user.id);

  logAudit({
    usuarioId: req.user.id, accion: 'EDICION_INGRESO', entidad: 'pallet', entidadId: pallet.id,
    valorAnterior: JSON.stringify(valorAnterior), valorNuevo: JSON.stringify(valorNuevo),
  });

  res.json({ mensaje: 'Ingreso actualizado correctamente' });
});

export default router;
