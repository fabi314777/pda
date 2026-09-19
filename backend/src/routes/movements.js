import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

// GET /api/movimientos — historial reciente de movimientos
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT m.id, m.fecha, m.motivo, pl.codigo AS pallet, u.nombre AS usuario,
           pa.codigo AS posicion_anterior, pn.codigo AS posicion_nueva
    FROM pallet_movements m
    JOIN pallets pl ON pl.id = m.pallet_id
    JOIN users u ON u.id = m.usuario_id
    LEFT JOIN positions pa ON pa.id = m.position_anterior_id
    LEFT JOIN positions pn ON pn.id = m.position_nueva_id
    ORDER BY m.fecha DESC LIMIT 100
  `).all();
  res.json(rows);
});

// POST /api/movimientos  { codigoPallet, codigoPosicionNueva, motivo }
router.post('/', requirePermission('pallets.mover'), (req, res) => {
  const { codigoPallet, codigoPosicionNueva, motivo } = req.body;
  const pallet = db.prepare('SELECT * FROM pallets WHERE codigo = ?').get(codigoPallet);
  if (!pallet) return res.status(404).json({ error: 'Pallet no encontrado' });
  if (!pallet.position_id) return res.status(409).json({ error: 'El pallet no tiene una posición actual asignada' });

  const nueva = db.prepare('SELECT * FROM positions WHERE codigo = ?').get(codigoPosicionNueva);
  if (!nueva) return res.status(404).json({ error: 'Posición destino no encontrada' });
  if (nueva.estado === 'BLOQUEADA') return res.status(409).json({ error: 'No se puede mover un pallet a una posición bloqueada' });
  if (nueva.estado !== 'LIBRE') return res.status(409).json({ error: 'La posición destino no está libre' });

  const anteriorId = pallet.position_id;

  const tx = db.transaction(() => {
    db.prepare(`UPDATE positions SET estado = 'LIBRE', pallet_actual_id = NULL WHERE id = ?`).run(anteriorId);
    db.prepare(`UPDATE positions SET estado = 'OCUPADA', pallet_actual_id = ? WHERE id = ?`).run(pallet.id, nueva.id);
    db.prepare(`UPDATE pallets SET position_id = ? WHERE id = ?`).run(nueva.id, pallet.id);
    db.prepare(`INSERT INTO pallet_movements (pallet_id, position_anterior_id, position_nueva_id, usuario_id, motivo)
      VALUES (?, ?, ?, ?, ?)`).run(pallet.id, anteriorId, nueva.id, req.user.id, motivo || null);
    logAudit({
      usuarioId: req.user.id, accion: 'CAMBIO_POSICION', entidad: 'pallet', entidadId: pallet.id,
      valorAnterior: codigoPallet, valorNuevo: codigoPosicionNueva, motivo,
    });
  });
  tx();

  res.json({ mensaje: 'Movimiento registrado correctamente' });
});

export default router;
