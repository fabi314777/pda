import bcrypt from 'bcryptjs';
import db from './index.js';
import { importUbicaciones } from './importUbicaciones.js';

const already = db.prepare('SELECT COUNT(*) c FROM roles').get().c;
if (already > 0) {
  console.log('[seed] Ya existen datos. Nada que hacer.');
  process.exit(0);
}

let adminId, opUserId;

const insertBase = db.transaction(() => {
  // Roles
  const roleStmt = db.prepare('INSERT INTO roles (nombre, descripcion) VALUES (?, ?)');
  const rAdmin = roleStmt.run('ADMINISTRADOR', 'Acceso completo, usuarios, configuración, auditoría').lastInsertRowid;
  const rSup = roleStmt.run('SUPERVISOR', 'Validar ingresos, mover pallets, ver historial y reportes').lastInsertRowid;
  const rOp = roleStmt.run('OPERADOR', 'Escanear, registrar ingresos, consultar pallets/posiciones').lastInsertRowid;

  // Permisos básicos
  const permStmt = db.prepare('INSERT INTO permissions (codigo, descripcion) VALUES (?, ?)');
  const perms = [
    ['pallets.ver', 'Ver pallets'],
    ['pallets.crear', 'Registrar ingreso de pallet'],
    ['pallets.validar', 'Validar, rechazar o editar ingresos pendientes'],
    ['posiciones.asignar', 'Asignar posición a un pallet'],
    ['pallets.mover', 'Mover pallet entre posiciones'],
    ['historial.ver', 'Ver historial y auditoría'],
    ['reportes.ver', 'Ver reportes'],
    ['config.admin', 'Administrar usuarios y configuración'],
  ];
  const permIds = {};
  for (const [codigo, desc] of perms) permIds[codigo] = permStmt.run(codigo, desc).lastInsertRowid;

  const rp = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
  const grant = (roleId, codes) => codes.forEach(c => rp.run(roleId, permIds[c]));
  grant(rAdmin, Object.keys(permIds));
  grant(rSup, ['pallets.ver', 'pallets.validar', 'posiciones.asignar', 'pallets.mover', 'historial.ver', 'reportes.ver']);
  grant(rOp, ['pallets.ver', 'pallets.crear']);

  // Usuarios demo (password: "demo1234" para todos)
  // Nota: se evitan nombres cuyas iniciales formen "AD" — algunos bloqueadores de
  // anuncios del navegador marcan ese texto como publicidad (falso positivo).
  const hash = bcrypt.hashSync('demo1234', 10);
  const userStmt = db.prepare('INSERT INTO users (nombre, email, password_hash, role_id) VALUES (?, ?, ?, ?)');
  adminId = userStmt.run('Carlos Ramírez', 'admin@wms.demo', hash, rAdmin).lastInsertRowid;
  userStmt.run('Luisa Fernández', 'supervisor@wms.demo', hash, rSup);
  opUserId = userStmt.run('Pedro Gómez', 'operador@wms.demo', hash, rOp).lastInsertRowid;
});

insertBase();
console.log('[seed] Usuarios y datos de prueba creados.');

console.log('[seed] Importando ubicaciones y stock real desde Ubicaciones_Bodega.xlsx ...');
const result = importUbicaciones({ usuarioId: adminId });
console.log('[seed] Importación completa:', result);

console.log('[seed] Listo. Usuarios: admin@wms.demo / supervisor@wms.demo / operador@wms.demo — password: demo1234');
