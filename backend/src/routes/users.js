import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission('config.admin')); // Solo ADMINISTRADOR tiene este permiso

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.nombre, u.email, u.activo, u.created_at, r.id AS role_id, r.nombre AS role_nombre
    FROM users u JOIN roles r ON r.id = u.role_id
    ORDER BY u.id ASC
  `).all();
  res.json(rows);
});

router.get('/roles', (req, res) => {
  const rows = db.prepare('SELECT id, nombre, descripcion FROM roles ORDER BY id ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nombre, email, password, role_id } = req.body;
  if (!nombre || !email || !password || !role_id) {
    return res.status(400).json({ error: 'Nombre, correo, contraseña y rol son obligatorios' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: `Ya existe un usuario con el correo ${email}` });

  const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(role_id);
  if (!role) return res.status(422).json({ error: 'Rol inválido' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (nombre, email, password_hash, role_id) VALUES (?, ?, ?, ?)')
    .run(nombre, email, hash, role_id);

  logAudit({ usuarioId: req.user.id, accion: 'CREAR_USUARIO', entidad: 'user', entidadId: info.lastInsertRowid, valorNuevo: `${nombre} (${email})` });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.patch('/:id', (req, res) => {
  const { nombre, role_id, activo, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (user.id === req.user.id && activo === 0) {
    return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
  }

  const nuevoNombre = nombre ?? user.nombre;
  const nuevoRole = role_id ?? user.role_id;
  const nuevoActivo = activo != null ? Number(activo) : user.activo;

  db.prepare('UPDATE users SET nombre = ?, role_id = ?, activo = ? WHERE id = ?')
    .run(nuevoNombre, nuevoRole, nuevoActivo, user.id);

  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), user.id);
  }

  logAudit({
    usuarioId: req.user.id, accion: 'EDITAR_USUARIO', entidad: 'user', entidadId: user.id,
    valorAnterior: `${user.nombre} / rol ${user.role_id} / activo ${user.activo}`,
    valorNuevo: `${nuevoNombre} / rol ${nuevoRole} / activo ${nuevoActivo}`,
  });

  res.json({ mensaje: 'Usuario actualizado correctamente' });
});

export default router;
