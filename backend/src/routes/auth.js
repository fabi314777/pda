import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { JWT_SECRET, requireAuth } from '../middleware/auth.js';

const router = Router();

function getUserWithPermissions(userId) {
  const user = db.prepare(`
    SELECT u.id, u.nombre, u.email, u.role_id, r.nombre AS role_nombre
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ? AND u.activo = 1
  `).get(userId);
  if (!user) return null;
  const perms = db.prepare(`
    SELECT p.codigo FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `).all(user.role_id).map(r => r.codigo);
  return { ...user, permissions: perms };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const row = db.prepare('SELECT * FROM users WHERE email = ? AND activo = 1').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const user = getUserWithPermissions(row.id);
  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, role: user.role_nombre, permissions: user.permissions },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user });
});

router.get('/me', requireAuth, (req, res) => {
  const user = getUserWithPermissions(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ user });
});

export default router;
