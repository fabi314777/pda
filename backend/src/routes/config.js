import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('config.admin')); // Solo ADMINISTRADOR

// ---------- SECTORES Y RACKS ----------

router.get('/sectores', (req, res) => {
  const sectores = db.prepare(`
    SELECT s.id, s.codigo, s.nombre,
      (SELECT COUNT(*) FROM racks r WHERE r.sector_id = s.id) AS racks,
      (SELECT COUNT(*) FROM positions p WHERE p.sector_id = s.id) AS posiciones,
      (SELECT COUNT(*) FROM positions p WHERE p.sector_id = s.id AND p.estado = 'LIBRE') AS libres,
      (SELECT COUNT(*) FROM positions p WHERE p.sector_id = s.id AND p.estado = 'OCUPADA') AS ocupadas,
      (SELECT COUNT(*) FROM positions p WHERE p.sector_id = s.id AND p.estado = 'BLOQUEADA') AS bloqueadas
    FROM warehouse_sectors s ORDER BY s.codigo
  `).all();
  res.json(sectores);
});

router.post('/sectores', (req, res) => {
  const { codigo, nombre } = req.body;
  if (!codigo) return res.status(400).json({ error: 'El código de sector es obligatorio' });
  const existing = db.prepare('SELECT id FROM warehouse_sectors WHERE codigo = ?').get(codigo);
  if (existing) return res.status(409).json({ error: `Ya existe el sector ${codigo}` });

  const info = db.prepare('INSERT INTO warehouse_sectors (codigo, nombre) VALUES (?, ?)').run(codigo, nombre || `Sector ${codigo}`);
  logAudit({ usuarioId: req.user.id, accion: 'CREAR_SECTOR', entidad: 'warehouse_sector', entidadId: info.lastInsertRowid, valorNuevo: codigo });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.get('/racks', (req, res) => {
  const { sector_id } = req.query;
  const rows = db.prepare(`
    SELECT r.id, r.codigo, r.sector_id, s.codigo AS sector_codigo,
      (SELECT COUNT(*) FROM positions p WHERE p.rack_id = r.id) AS posiciones
    FROM racks r JOIN warehouse_sectors s ON s.id = r.sector_id
    ${sector_id ? 'WHERE r.sector_id = ?' : ''}
    ORDER BY s.codigo, r.codigo
  `).all(...(sector_id ? [sector_id] : []));
  res.json(rows);
});

router.post('/racks', (req, res) => {
  const { sector_id, codigo } = req.body;
  if (!sector_id || !codigo) return res.status(400).json({ error: 'Sector y código de rack son obligatorios' });
  const sector = db.prepare('SELECT id, codigo FROM warehouse_sectors WHERE id = ?').get(sector_id);
  if (!sector) return res.status(404).json({ error: 'Sector no encontrado' });

  const existing = db.prepare('SELECT id FROM racks WHERE sector_id = ? AND codigo = ?').get(sector_id, codigo);
  if (existing) return res.status(409).json({ error: `Ya existe el rack ${codigo} en el sector ${sector.codigo}` });

  const info = db.prepare('INSERT INTO racks (sector_id, codigo) VALUES (?, ?)').run(sector_id, codigo);
  logAudit({ usuarioId: req.user.id, accion: 'CREAR_RACK', entidad: 'rack', entidadId: info.lastInsertRowid, valorNuevo: `${sector.codigo}-${codigo}` });
  res.status(201).json({ id: info.lastInsertRowid });
});

// ---------- POSICIONES (alta manual y bloqueo/liberación) ----------

router.post('/posiciones', (req, res) => {
  const { rack_id, nivel, codigo } = req.body;
  if (!rack_id || !nivel || !codigo) return res.status(400).json({ error: 'Rack, nivel y código son obligatorios' });

  const rack = db.prepare('SELECT r.id, r.sector_id FROM racks r WHERE r.id = ?').get(rack_id);
  if (!rack) return res.status(404).json({ error: 'Rack no encontrado' });

  const existing = db.prepare('SELECT id FROM positions WHERE codigo = ?').get(codigo);
  if (existing) return res.status(409).json({ error: `Ya existe la posición ${codigo}` });

  const info = db.prepare(`INSERT INTO positions (codigo, sector_id, rack_id, nivel, estado, capacidad) VALUES (?, ?, ?, ?, 'LIBRE', 1)`)
    .run(codigo, rack.sector_id, rack_id, nivel);
  logAudit({ usuarioId: req.user.id, accion: 'CREAR_POSICION', entidad: 'position', entidadId: info.lastInsertRowid, valorNuevo: codigo });
  res.status(201).json({ id: info.lastInsertRowid });
});

// Bloquear / liberar una posición manualmente (mantenimiento, daños, etc.)
router.patch('/posiciones/:codigo/estado', (req, res) => {
  const { estado } = req.body;
  if (!['LIBRE', 'BLOQUEADA', 'RESERVADA'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Usa LIBRE, RESERVADA o BLOQUEADA' });
  }
  const position = db.prepare('SELECT * FROM positions WHERE codigo = ?').get(req.params.codigo);
  if (!position) return res.status(404).json({ error: 'Posición no encontrada' });
  if (position.estado === 'OCUPADA') return res.status(409).json({ error: 'No puedes cambiar el estado de una posición OCUPADA; primero mueve o retira el pallet' });

  db.prepare('UPDATE positions SET estado = ? WHERE id = ?').run(estado, position.id);
  logAudit({ usuarioId: req.user.id, accion: 'CAMBIO_ESTADO_POSICION', entidad: 'position', entidadId: position.id, valorAnterior: position.estado, valorNuevo: estado });
  res.json({ mensaje: 'Estado de la posición actualizado' });
});

// ---------- PERMISOS ----------

router.get('/permisos', (req, res) => {
  const roles = db.prepare('SELECT id, nombre FROM roles ORDER BY id').all();
  const permisos = db.prepare('SELECT id, codigo, descripcion FROM permissions ORDER BY id').all();
  const asignados = db.prepare('SELECT role_id, permission_id FROM role_permissions').all();
  res.json({ roles, permisos, asignados });
});

router.post('/permisos/toggle', (req, res) => {
  const { role_id, permission_id, otorgado } = req.body;
  if (!role_id || !permission_id) return res.status(400).json({ error: 'role_id y permission_id son obligatorios' });

  const role = db.prepare('SELECT nombre FROM roles WHERE id = ?').get(role_id);
  if (role?.nombre === 'ADMINISTRADOR') {
    return res.status(400).json({ error: 'Los permisos del rol ADMINISTRADOR no se pueden modificar' });
  }

  const existing = db.prepare('SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?').get(role_id, permission_id);
  if (otorgado && !existing) {
    db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)').run(role_id, permission_id);
  } else if (!otorgado && existing) {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ? AND permission_id = ?').run(role_id, permission_id);
  }

  logAudit({
    usuarioId: req.user.id, accion: 'CAMBIO_PERMISO', entidad: 'role_permission', entidadId: role_id,
    valorNuevo: `${otorgado ? 'otorgado' : 'revocado'} permiso ${permission_id} a rol ${role_id}`,
  });
  res.json({ mensaje: 'Permiso actualizado' });
});

export default router;
