import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { checkVencimientos } from '../utils/expiryCheck.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  checkVencimientos(); // se asegura de que las alertas de vencimiento estén al día
  const rows = db.prepare(`SELECT * FROM notifications ORDER BY fecha DESC LIMIT 30`).all();
  res.json(rows);
});

router.post('/:id/leer', (req, res) => {
  db.prepare(`UPDATE notifications SET leida = 1 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;
