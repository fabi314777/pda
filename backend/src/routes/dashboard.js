import { Router } from 'express';
import db from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/resumen', (req, res) => {
  const count = (sql, ...params) => db.prepare(sql).get(...params).c;

  const resumen = {
    palletsTotales: count('SELECT COUNT(*) c FROM pallets'),
    palletsPendientes: count("SELECT COUNT(*) c FROM pallets WHERE estado = 'PENDIENTE'"),
    palletsValidados: count("SELECT COUNT(*) c FROM pallets WHERE estado = 'VALIDADO'"),
    palletsAlmacenados: count("SELECT COUNT(*) c FROM pallets WHERE estado = 'ALMACENADO'"),
    posicionesOcupadas: count("SELECT COUNT(*) c FROM positions WHERE estado = 'OCUPADA'"),
    posicionesDisponibles: count("SELECT COUNT(*) c FROM positions WHERE estado = 'LIBRE'"),
  };

  const estadoPosiciones = db.prepare(`
    SELECT estado, COUNT(*) cantidad FROM positions GROUP BY estado
  `).all();

  const ingresosPorDia = db.prepare(`
    SELECT date(fecha_ingreso) AS fecha, COUNT(*) cantidad
    FROM pallets
    GROUP BY date(fecha_ingreso)
    ORDER BY fecha DESC LIMIT 14
  `).all().reverse();

  const ultimosPallets = db.prepare(`
    SELECT pl.codigo, p.sku, p.nombre AS producto, l.codigo_lote AS lote,
           pl.fecha_ingreso, pl.estado, pos.codigo AS posicion
    FROM pallets pl
    JOIN products p ON p.id = pl.product_id
    LEFT JOIN lots l ON l.id = pl.lot_id
    LEFT JOIN positions pos ON pos.id = pl.position_id
    ORDER BY pl.fecha_ingreso DESC LIMIT 8
  `).all();

  const alertas = [];
  if (resumen.palletsPendientes > 0) alertas.push({ tipo: 'WARNING', mensaje: `${resumen.palletsPendientes} pallet(s) pendientes de validar` });
  const sinPosicion = count("SELECT COUNT(*) c FROM pallets WHERE estado = 'VALIDADO' AND position_id IS NULL");
  if (sinPosicion > 0) alertas.push({ tipo: 'WARNING', mensaje: `${sinPosicion} pallet(s) validados sin posición asignada` });
  const rechazados = count("SELECT COUNT(*) c FROM pallets WHERE estado = 'RECHAZADO'");
  if (rechazados > 0) alertas.push({ tipo: 'ERROR', mensaje: `${rechazados} pallet(s) rechazados` });
  const bloqueadas = count("SELECT COUNT(*) c FROM positions WHERE estado = 'BLOQUEADA'");
  if (bloqueadas > 0) alertas.push({ tipo: 'INFO', mensaje: `${bloqueadas} posición(es) bloqueadas` });
  const porVencer = count("SELECT COUNT(*) c FROM lots WHERE fecha_vencimiento IS NOT NULL AND date(fecha_vencimiento) <= date('now', '+30 days')");
  if (porVencer > 0) alertas.push({ tipo: 'WARNING', mensaje: `${porVencer} lote(s) próximos a vencer (30 días)` });

  res.json({ resumen, estadoPosiciones, ingresosPorDia, ultimosPallets, alertas });
});

export default router;
