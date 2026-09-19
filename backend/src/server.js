import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db/index.js';

import authRoutes from './routes/auth.js';
import palletRoutes from './routes/pallets.js';
import validationRoutes from './routes/validations.js';
import positionRoutes from './routes/positions.js';
import movementRoutes from './routes/movements.js';
import dashboardRoutes from './routes/dashboard.js';
import historyRoutes from './routes/history.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import configRoutes from './routes/config.js';
import { requireAuth } from './middleware/auth.js';
import { checkVencimientos } from './utils/expiryCheck.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/pallets', palletRoutes);
app.use('/api/validaciones', validationRoutes);
app.use('/api/posiciones', positionRoutes);
app.use('/api/movimientos', movementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/historial', historyRoutes);
app.use('/api/reportes', reportRoutes);
app.use('/api/notificaciones', notificationRoutes);
app.use('/api/usuarios', userRoutes);
app.use('/api/config', configRoutes);

// Búsqueda global del header
app.get('/api/buscar', requireAuth, (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const pallets = db.prepare(`
    SELECT pl.codigo, p.sku, p.nombre AS producto, pos.codigo AS posicion, pl.estado
    FROM pallets pl JOIN products p ON p.id = pl.product_id
    LEFT JOIN positions pos ON pos.id = pl.position_id
    WHERE pl.codigo LIKE ? OR p.sku LIKE ? OR p.nombre LIKE ?
    LIMIT 10
  `).all(q, q, q);
  const posiciones = db.prepare(`SELECT codigo, estado FROM positions WHERE codigo LIKE ? LIMIT 10`).all(q);
  res.json({ pallets, posiciones });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Sirve el frontend ya compilado (frontend/public → copiado aquí por "npm run build:frontend"),
// para que este mismo servidor sea todo lo que hay que desplegar.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
  console.log('[wms-backend] sirviendo frontend compilado desde /public');
} else {
  console.log('[wms-backend] /public no existe todavía — corre "npm run build:frontend" para generarlo');
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[wms-backend] escuchando en http://localhost:${PORT}`));

// Revisa vencimientos al iniciar y luego cada hora, generando notificaciones/alertas.
checkVencimientos();
setInterval(checkVencimientos, 60 * 60 * 1000);
