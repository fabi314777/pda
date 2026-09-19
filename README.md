# Bodega WMS — Gestión y Control de Pallets

Aplicación web de gestión de bodega (WMS): ingreso, escaneo, validación,
asignación de posiciones, movimientos, historial y auditoría de pallets.

Proyecto **nuevo e independiente** del sistema NODO (Electron/SQLite) que ya tienes.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4, react-router-dom, recharts, lucide-react, html5-qrcode
- **Backend:** Node.js + Express (API REST)
- **Base de datos:** SQLite (better-sqlite3), con esquema normalizado y sintaxis compatible con MySQL — migrar a MySQL más adelante es solo cambiar el driver, no el diseño de tablas ni las consultas (son SQL estándar)
- **PWA:** instalable en Android/iOS/desktop (ícono en pantalla de inicio, funciona como app)

## 1. Requisitos

- Node.js 18 o superior

## 2. Instalación

```bash
# Backend
cd backend
npm install
npm run seed     # crea la base de datos con datos de demostración
npm run dev       # levanta la API en http://localhost:4000

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev       # levanta la app en http://localhost:5173
```

Abre `http://localhost:5173` en el navegador.

### Usuarios de prueba

| Rol           | Correo                | Contraseña |
|---------------|------------------------|------------|
| Administrador | admin@wms.demo         | demo1234   |
| Supervisor    | supervisor@wms.demo    | demo1234   |
| Operador      | operador@wms.demo      | demo1234   |

## 3. Generar un APK real para el escáner (gratis, sin Android Studio)

Este entorno de desarrollo no puede compilar un `.apk` nativo (requiere el SDK de
Android y servicios de Google no disponibles aquí). El camino más corto y gratuito
para obtener un `.apk` real es este:

1. **Sube el proyecto a GitHub** (crea un repo y sube esta carpeta completa).
2. **Despliega en Render.com** (plan gratuito):
   - Crea una cuenta en render.com y conecta tu repo de GitHub
   - Render detecta el archivo `render.yaml` de la raíz y configura todo solo
     (o si prefieres manual: New → Web Service → Root Directory: `backend`,
     Build Command: `npm install && npm run build:frontend`, Start Command: `npm start`)
   - Al terminar te da una URL tipo `https://bodega-wms.onrender.com` — pruébala
     en el navegador, debe abrir la app y poder iniciar sesión
3. **Genera el APK en PWABuilder.com** (gratis, de Microsoft):
   - Entra a https://www.pwabuilder.com
   - Pega tu URL de Render y presiona "Start"
   - Ve a la pestaña **Android** → "Generate Package" → descarga el `.apk`
   - Ese `.apk` ya es un archivo instalable normal: pásalo al escáner (USB, correo,
     Drive, etc.) e instálalo como cualquier app (puede pedir habilitar
     "orígenes desconocidos" la primera vez)

**Importante sobre los datos:** el plan gratuito de Render usa disco temporal —
la base de datos SQLite se reinicia en cada despliegue o reinicio del servicio.
Para pruebas está bien; para producción con datos permanentes, agrega un disco
persistente en Render (Dashboard → tu servicio → Disks) o migra a una base de
datos gestionada más adelante.

## 4. Correr el proyecto en tu computador (para desarrollo)

1. En tu máquina, corre el backend (`npm run dev` en `/backend`) y el build del frontend:
   ```bash
   cd frontend
   npm run build
   npm run preview -- --host
   ```
   Esto imprime una URL tipo `http://TU_IP_LOCAL:4173` — asegúrate de que el escáner
   esté en la misma red Wi-Fi que tu computador.
2. En el navegador del escáner (Chrome), abre esa URL.
3. Menú del navegador → **"Agregar a pantalla de inicio" / "Instalar app"**.
   Queda un ícono como una app nativa — así puedes probarla sin compilar un APK
   (que requiere Android SDK/Gradle, no disponible en este entorno de desarrollo).
4. Si el escáner tiene lector físico (USB o integrado tipo Zebra/Honeywell con
   DataWedge en modo teclado), simplemente escanea con el campo de "Ingreso de
   pallets" enfocado — el lector escribe el código como si fuera un teclado.
5. Si no hay lector físico, usa el botón **"Usar cámara"** dentro de Ingreso de
   pallets (requiere HTTPS o `localhost` para acceder a la cámara; en red local
   sin HTTPS, Chrome puede bloquear el acceso a la cámara — para pruebas serias
   con cámara, lo ideal es desplegar detrás de HTTPS).

### Formato de etiqueta esperado por el parser de escaneo

Por ahora, mientras confirmas el formato real de tu etiqueta, el sistema acepta:

- **Cadena delimitada por `;`**: `codigo;sku;lote;cantidad;peso;vencimiento`
  Ejemplo: `PAL-00010;100002;LOTE-B300;25;480;2027-01-15`
- **GS1-128 básico**: reconoce `(01)` GTIN/SKU, `(10)` lote, `(17)` vencimiento (AAMMDD), `(30)` cantidad
- **Código simple**: si no coincide con lo anterior, se toma como el código del pallet y el resto se completa manualmente en la pantalla de revisión

Cuando me compartas una foto real de tu etiqueta, ajusto el parser exactamente a su formato.

## 5. Reporte de vencimientos

- El backend revisa automáticamente (al iniciar y cada hora) los lotes próximos
  a vencer o ya vencidos y genera notificaciones (visibles en la campana del header).
- En **Reportes → Pallets próximos a vencer** puedes filtrar por 7/15/30/90 días
  y exportar a CSV.
- En el **Dashboard**, la sección de Alertas también muestra un resumen.

## 6. Estructura del proyecto

```
backend/
  src/
    db/          esquema SQL, conexión y seed de datos demo
    middleware/  autenticación JWT y permisos por rol
    routes/      auth, pallets, validaciones, posiciones, movimientos,
                 dashboard, historial, reportes, notificaciones
    utils/       auditoría, verificación de vencimientos
frontend/
  src/
    components/  Sidebar, Header, StatusBadge, DashboardCard, CameraScanner, etc.
    pages/       Login, Dashboard, Pallets, PalletDetail, IngresoPallet,
                 Validacion, AsignarPosicion, Posiciones, Movimientos,
                 Historial, Reportes, Configuracion
    hooks/       useAuth (contexto de sesión y permisos)
    services/    cliente API (axios)
    types/       tipos TypeScript compartidos
```

## 7. Roles y permisos

- **ADMINISTRADOR:** acceso completo
- **SUPERVISOR:** validar/rechazar ingresos, asignar posiciones, mover pallets, ver historial y reportes
- **OPERADOR:** escanear/registrar ingresos, consultar pallets y posiciones

## 8. Próxima etapa (pendiente)

- Gestión de usuarios/roles/sectores/racks desde la interfaz (Configuración) — hoy son fijos vía seed
- Reportes adicionales con más filtros (fecha, usuario, sector)
- Migración de SQLite → MySQL si decides desplegar en un servidor real

## 9. Novedades de esta etapa

- **Configuración completa (ya no es un placeholder)**:
  - **Sectores y racks**: crear sectores nuevos, crear racks dentro de un sector,
    y ver cuántas posiciones/libres/ocupadas/bloqueadas tiene cada uno (con tus
    datos reales importados).
  - **Bloquear/reservar posiciones** manualmente (mantenimiento, daños) desde la
    API — no se puede bloquear una posición OCUPADA sin antes mover el pallet.
  - **Permisos por rol**: matriz visual (candado abierto/cerrado) para otorgar o
    quitar permisos a SUPERVISOR y OPERADOR. ADMINISTRADOR siempre tiene todo y
    no se puede modificar. Los cambios aplican la próxima vez que ese usuario
    inicie sesión (el token de sesión ya emitido no cambia hasta volver a
    loguearse).
- **Diseño responsive**: menú lateral como panel deslizable en celulares, búsqueda
  colapsable, tablas con scroll horizontal.
- **Gestión de usuarios (solo administrador)**: crear, editar rol, activar/
  desactivar y resetear contraseña — protegido y probado con error 403 para
  otros roles.
- **Datos de prueba eliminados**: el seed ya no crea pallets "de prueba", solo
  usuarios + el stock real importado del Excel.

- **Posiciones reales importadas**: el `npm run seed` ahora importa automáticamente
  `backend/data/Ubicaciones_Bodega.xlsx` (hoja "Sectorizacion Racks") — 783 posiciones
  reales (sectores A-D), con el stock que ya tenían cargado (producto, cantidad,
  vencimiento). Los pallets de ese stock quedan con código `STOCK-<ubicación>`.
  Si reemplazas ese archivo por una versión más nueva, borra `backend/src/db/wms.db`
  y vuelve a correr `npm run seed`.
- **Editar ingreso**: en Validación, mientras un pallet esté PENDIENTE se puede editar
  (SKU, lote, cantidad, peso, vencimiento) antes de validar o rechazar. Queda registrado
  en auditoría con el usuario que lo hizo.
- **Auditoría**: de solo lectura, muestra las acciones de todos los usuarios (no editable).
- **Asignar posición por escaneo**: además de elegirla manualmente del mapa, ahora se
  puede escanear (lector o cámara) el código de la posición para asignarla directo.
- **Actualización en vivo**: Dashboard, Pallets, Posiciones, Validación, Movimientos y
  Reportes se refrescan solos cuando ocurre una acción en el sistema (ingreso, validar,
  rechazar, editar, asignar, mover) — no hace falta recargar la página.
- **Reportes en Excel**: los reportes (pallets, movimientos, próximos a vencer) se
  exportan ahora a `.xlsx` con encabezados en español, título y fecha de generación,
  en vez de un CSV crudo.
- **Reporte y alertas de vencimiento**: el backend revisa cada hora los lotes por
  vencer/vencidos y genera notificaciones; en Reportes hay una sección filtrable
  (7/15/30/90 días) exportable a Excel.
- **PWA más estable**: el service worker se autoactualiza (`skipWaiting` +
  `clientsClaim`) para evitar tener que recargar manualmente la pestaña tras cada
  actualización de la app instalada en el escáner.
