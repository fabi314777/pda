-- ============================================================
-- ESQUEMA WMS - PALLETS / INGRESOS / VALIDACIÓN / POSICIONES / HISTORIAL
-- Diseñado en sintaxis compatible SQLite <-> MySQL (tipos genéricos,
-- FKs explícitas, sin AUTO_INCREMENT específico de un solo motor).
-- ============================================================

-- ---------- USUARIOS / ROLES / PERMISOS ----------
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,          -- ADMINISTRADOR, SUPERVISOR, OPERADOR
  descripcion TEXT
);

CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,          -- ej: pallets.ver, pallets.validar, posiciones.asignar
  descripcion TEXT
);

CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- PRODUCTOS / SKU / LOTES ----------
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  unidad_medida TEXT DEFAULT 'UN',
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_lote TEXT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  fecha_vencimiento TEXT,
  UNIQUE (codigo_lote, product_id)
);

-- ---------- BODEGA: SECTORES / RACKS / POSICIONES ----------
CREATE TABLE warehouse_sectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,           -- A, B, C...
  nombre TEXT
);

CREATE TABLE racks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id INTEGER NOT NULL REFERENCES warehouse_sectors(id),
  codigo TEXT NOT NULL,                  -- 01, 02...
  UNIQUE (sector_id, codigo)
);

CREATE TABLE positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,           -- A-01-01
  sector_id INTEGER NOT NULL REFERENCES warehouse_sectors(id),
  rack_id INTEGER NOT NULL REFERENCES racks(id),
  nivel TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'LIBRE', -- LIBRE, OCUPADA, RESERVADA, BLOQUEADA
  capacidad INTEGER DEFAULT 1,
  pallet_actual_id INTEGER               -- FK lógica a pallets.id (nullable)
);

-- ---------- PALLETS ----------
CREATE TABLE pallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,           -- PAL-00001
  product_id INTEGER NOT NULL REFERENCES products(id),
  lot_id INTEGER REFERENCES lots(id),
  cantidad REAL NOT NULL,
  peso REAL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  -- PENDIENTE, VALIDADO, ALMACENADO, EN_MOVIMIENTO, BLOQUEADO, RECHAZADO, DESPACHADO
  position_id INTEGER REFERENCES positions(id),
  usuario_ingreso_id INTEGER REFERENCES users(id),
  fecha_ingreso TEXT NOT NULL DEFAULT (datetime('now')),
  motivo_rechazo TEXT
);

CREATE TABLE pallet_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pallet_id INTEGER NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  cantidad REAL NOT NULL
);

-- Snapshot de lo leído por el escáner, para comparar contra lo registrado
CREATE TABLE pallet_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pallet_id INTEGER NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  codigo_escaneado TEXT,
  sku_escaneado TEXT,
  lote_escaneado TEXT,
  cantidad_escaneada REAL,
  peso_escaneado REAL,
  vencimiento_escaneado TEXT,
  metodo TEXT DEFAULT 'MANUAL',          -- QR, BARCODE, MANUAL
  usuario_id INTEGER REFERENCES users(id),
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE pallet_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pallet_id INTEGER NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES users(id),
  resultado TEXT NOT NULL,               -- VALIDADO, RECHAZADO
  motivo TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- MOVIMIENTOS ----------
CREATE TABLE pallet_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pallet_id INTEGER NOT NULL REFERENCES pallets(id) ON DELETE CASCADE,
  position_anterior_id INTEGER REFERENCES positions(id),
  position_nueva_id INTEGER REFERENCES positions(id),
  usuario_id INTEGER NOT NULL REFERENCES users(id),
  motivo TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- AUDITORÍA ----------
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES users(id),
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id INTEGER,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  motivo TEXT,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- NOTIFICACIONES ----------
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER REFERENCES users(id),
  tipo TEXT NOT NULL,                    -- SUCCESS, WARNING, ERROR
  mensaje TEXT NOT NULL,
  leida INTEGER NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- ÍNDICES DE BÚSQUEDA FRECUENTE ----------
CREATE INDEX idx_pallets_codigo ON pallets(codigo);
CREATE INDEX idx_pallets_estado ON pallets(estado);
CREATE INDEX idx_positions_estado ON positions(estado);
CREATE INDEX idx_movements_pallet ON pallet_movements(pallet_id);
CREATE INDEX idx_audit_entidad ON audit_logs(entidad, entidad_id);
