import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'wms-dev-secret-change-in-production';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

// Verifica que el usuario tenga uno de los permisos indicados (por código)
export function requirePermission(...codes) {
  return (req, res, next) => {
    const userPerms = req.user?.permissions || [];
    const ok = codes.some(c => userPerms.includes(c));
    if (!ok) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}
