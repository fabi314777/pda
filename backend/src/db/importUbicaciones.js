import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_PATH = path.join(__dirname, '..', '..', 'data', 'Ubicaciones_Bodega.xlsx');
const SHEET = 'Sectorizacion Racks';

// Columnas (0-indexadas desde A) de la hoja real, según el archivo entregado:
// B(1)=Rack  C(2)=Sector  D(3)=N° posición en el rack  F(5)=Ubicación (código único, ej "1A1")
// G(6)=Código de artículo  H(7)=Categoría  I(8)=Descripción  J(9)=Cantidad  L(11)=Fecha vencimiento  M(12)=Lote
const COL = { RACK: 1, SECTOR: 2, NIVEL: 3, CODIGO: 5, ARTICULO: 6, CATEGORIA: 7, DESCRIPCION: 8, CANTIDAD: 9, VENCIMIENTO: 11, LOTE: 12 };

function excelDateToISO(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

export function importUbicaciones({ usuarioId = null } = {}) {
  const wb = XLSX.readFile(FILE_PATH, { cellDates: true });
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`No se encontró la hoja "${SHEET}" en el archivo`);

  const rowsDated = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  const findSector = db.prepare('SELECT id FROM warehouse_sectors WHERE codigo = ?');
  const insertSector = db.prepare('INSERT INTO warehouse_sectors (codigo, nombre) VALUES (?, ?)');
  const findRack = db.prepare('SELECT id FROM racks WHERE sector_id = ? AND codigo = ?');
  const insertRack = db.prepare('INSERT INTO racks (sector_id, codigo) VALUES (?, ?)');
  const findPosition = db.prepare('SELECT id FROM positions WHERE codigo = ?');
  const insertPosition = db.prepare(`INSERT INTO positions (codigo, sector_id, rack_id, nivel, estado, capacidad) VALUES (?, ?, ?, ?, ?, 1)`);
  const findProduct = db.prepare('SELECT id FROM products WHERE sku = ?');
  const insertProduct = db.prepare('INSERT INTO products (sku, nombre, categoria) VALUES (?, ?, ?)');
  const insertLot = db.prepare('INSERT INTO lots (codigo_lote, product_id, fecha_vencimiento) VALUES (NULL, ?, ?)');
  const insertPallet = db.prepare(`INSERT INTO pallets (codigo, product_id, lot_id, cantidad, estado, position_id, usuario_ingreso_id, fecha_ingreso)
    VALUES (?, ?, ?, ?, 'ALMACENADO', ?, ?, datetime('now'))`);
  const updatePositionOcupada = db.prepare(`UPDATE positions SET estado = 'OCUPADA', pallet_actual_id = ? WHERE id = ?`);
  const insertEntry = db.prepare(`INSERT INTO pallet_entries (pallet_id, codigo_escaneado, sku_escaneado, cantidad_escaneada, vencimiento_escaneado, metodo, usuario_id)
    VALUES (?, ?, ?, ?, ?, 'IMPORTACION', ?)`);
  const insertAudit = db.prepare(`INSERT INTO audit_logs (usuario_id, accion, entidad, entidad_id, valor_nuevo, motivo)
    VALUES (?, 'IMPORTACION_UBICACION', 'position', ?, ?, 'Importación desde Ubicaciones_Bodega.xlsx')`);

  const sectorCache = {};
  const rackCache = {};

  let posicionesCreadas = 0, palletsCreados = 0, omitidas = 0;

  const tx = db.transaction(() => {
    for (let i = 1; i < rowsDated.length; i++) {
      const r = rowsDated[i];
      if (!r || (r[COL.RACK] == null && r[COL.SECTOR] == null)) continue;

      const rackCodigo = String(r[COL.RACK] ?? '').trim();
      const sectorCodigo = String(r[COL.SECTOR] ?? '').trim();
      const nivel = String(r[COL.NIVEL] ?? '').trim();
      let posicionCodigo = r[COL.CODIGO] ? String(r[COL.CODIGO]).trim() : null;
      if (!rackCodigo || !sectorCodigo) { omitidas++; continue; }
      if (!posicionCodigo) posicionCodigo = `${rackCodigo}${sectorCodigo}${nivel}`;

      if (findPosition.get(posicionCodigo)) { omitidas++; continue; } // ya importada

      const sectorKey = sectorCodigo;
      let sectorId = sectorCache[sectorKey];
      if (!sectorId) {
        const existing = findSector.get(sectorCodigo);
        sectorId = existing ? existing.id : insertSector.run(sectorCodigo, `Sector ${sectorCodigo}`).lastInsertRowid;
        sectorCache[sectorKey] = sectorId;
      }

      const rackKey = `${sectorId}-${rackCodigo}`;
      let rackId = rackCache[rackKey];
      if (!rackId) {
        const existing = findRack.get(sectorId, rackCodigo);
        rackId = existing ? existing.id : insertRack.run(sectorId, rackCodigo).lastInsertRowid;
        rackCache[rackKey] = rackId;
      }

      const articuloCodigo = r[COL.ARTICULO] != null ? String(Math.trunc(Number(r[COL.ARTICULO]))) : null;
      const descripcion = r[COL.DESCRIPCION] ? String(r[COL.DESCRIPCION]).trim() : null;
      const categoria = r[COL.CATEGORIA] ? String(r[COL.CATEGORIA]).trim() : null;
      const cantidad = r[COL.CANTIDAD] != null ? Number(r[COL.CANTIDAD]) : null;
      const vencimiento = excelDateToISO(r[COL.VENCIMIENTO]);
      const ocupada = !!(articuloCodigo && descripcion);

      const positionId = insertPosition.run(
        posicionCodigo, sectorId, rackId, nivel || '0', ocupada ? 'OCUPADA' : 'LIBRE'
      ).lastInsertRowid;
      posicionesCreadas++;

      if (ocupada) {
        let product = findProduct.get(articuloCodigo);
        let productId = product ? product.id : insertProduct.run(articuloCodigo, descripcion, categoria).lastInsertRowid;

        const lotId = insertLot.run(productId, vencimiento).lastInsertRowid;
        const palletCodigo = `STOCK-${posicionCodigo}`;
        const palletId = insertPallet.run(palletCodigo, productId, lotId, cantidad ?? 0, positionId, usuarioId).lastInsertRowid;
        updatePositionOcupada.run(palletId, positionId);
        insertEntry.run(palletId, palletCodigo, articuloCodigo, cantidad ?? 0, vencimiento, usuarioId);
        insertAudit.run(usuarioId, positionId, `Pallet ${palletCodigo} · ${descripcion}`);
        palletsCreados++;
      }
    }
  });

  tx();
  return { posicionesCreadas, palletsCreados, omitidas };
}

// Permite ejecutarlo directamente: node src/db/importUbicaciones.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = importUbicaciones({});
  console.log('[import] Resultado:', result);
}
