import { Router } from 'express';
import db, { withTransaction } from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// GET /api/posiciones — mapa completo con filtros
router.get('/', (req, res) => {
  const { sector, estado, search } = req.query;
  const clauses = [];
  const params = [];
  if (sector) { clauses.push('s.codigo = ?'); params.push(sector); }
  if (estado) { clauses.push('pos.estado = ?'); params.push(estado); }
  if (search) { clauses.push('pos.codigo LIKE ?'); params.push(`%${search}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT pos.id, pos.codigo, pos.estado, pos.capacidad, pos.nivel,
           s.codigo AS sector, r.codigo AS rack,
           pl.codigo AS pallet_actual, p.nombre AS producto_actual
    FROM positions pos
    JOIN warehouse_sectors s ON s.id = pos.sector_id
    JOIN racks r ON r.id = pos.rack_id
    LEFT JOIN pallets pl ON pl.id = pos.pallet_actual_id
    LEFT JOIN products p ON p.id = pl.product_id
    ${where}
    ORDER BY s.codigo, r.codigo, pos.nivel
  `).all(...params);
  res.json(rows);
});

// GET /api/posiciones/disponibles — solo LIBRES, para el flujo de asignación
router.get('/disponibles', (req, res) => {
  const rows = db.prepare(`
    SELECT pos.id, pos.codigo, s.codigo AS sector, r.codigo AS rack, pos.nivel, pos.capacidad
    FROM positions pos
    JOIN warehouse_sectors s ON s.id = pos.sector_id
    JOIN racks r ON r.id = pos.rack_id
    WHERE pos.estado = 'LIBRE'
    ORDER BY s.codigo, r.codigo, pos.nivel
  `).all();
  res.json(rows);
});

// POST /api/posiciones/asignar  { codigoPallet, codigoPosicion }
router.post('/asignar', requirePermission('posiciones.asignar'), (req, res) => {
  const { codigoPallet, codigoPosicion } = req.body;
  const pallet = db.prepare('SELECT * FROM pallets WHERE codigo = ?').get(codigoPallet);
  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });
  if (pallet.estado !== 'VALIDADO') return res.status(409).json({ error: 'El pallet debe estar VALIDADO antes de asignar posición' });

  const position = db.prepare('SELECT * FROM positions WHERE codigo = ?').get(codigoPosicion);
  if (!position) return res.status(404).json({ error: 'Posición no encontrada' });
  if (position.estado !== 'LIBRE') return res.status(409).json({ error: 'No se puede asignar: la posición no está libre' });

  withTransaction(() => {
    db.prepare(`UPDATE pallets SET estado = 'ALMACENADO', position_id = ? WHERE id = ?`).run(position.id, pallet.id);
    db.prepare(`UPDATE positions SET estado = 'OCUPADA', pallet_actual_id = ? WHERE id = ?`).run(pallet.id, position.id);
    db.prepare(`INSERT INTO pallet_movements (pallet_id, position_anterior_id, position_nueva_id, usuario_id, motivo)
      VALUES (?, NULL, ?, ?, 'Asignación inicial de posición')`).run(pallet.id, position.id, req.user.id);
    logAudit({ usuarioId: req.user.id, accion: 'ASIGNACION_POSICION', entidad: 'pallet', entidadId: pallet.id, valorAnterior: 'VALIDADO', valorNuevo: `ALMACENADO en ${codigoPosicion}` });
  });

  res.json({ mensaje: 'Posición asignada correctamente', pallet: codigoPallet, posicion: codigoPosicion });
});

export default router;
