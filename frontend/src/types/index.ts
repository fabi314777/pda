export type EstadoPallet =
  | 'PENDIENTE' | 'VALIDADO' | 'ALMACENADO' | 'EN_MOVIMIENTO'
  | 'BLOQUEADO' | 'RECHAZADO' | 'DESPACHADO';

export type EstadoPosicion = 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'BLOQUEADA';

export interface User {
  id: number;
  nombre: string;
  email: string;
  role_nombre: string;
  permissions: string[];
}

export interface Pallet {
  id?: number;
  codigo: string;
  sku: string;
  producto: string;
  lote: string | null;
  fecha_vencimiento: string | null;
  cantidad: number;
  peso: number | null;
  estado: EstadoPallet;
  posicion: string | null;
  fecha_ingreso: string;
  usuario_ingreso?: string;
  motivo_rechazo?: string | null;
}

export interface Position {
  id: number;
  codigo: string;
  sector: string;
  rack: string;
  nivel: string;
  estado: EstadoPosicion;
  capacidad: number;
  pallet_actual?: string | null;
  producto_actual?: string | null;
}

export interface Alerta {
  tipo: 'WARNING' | 'ERROR' | 'INFO';
  mensaje: string;
}

export interface DashboardResumen {
  resumen: {
    palletsTotales: number;
    palletsPendientes: number;
    palletsValidados: number;
    palletsAlmacenados: number;
    posicionesOcupadas: number;
    posicionesDisponibles: number;
  };
  estadoPosiciones: { estado: string; cantidad: number }[];
  ingresosPorDia: { fecha: string; cantidad: number }[];
  ultimosPallets: Pallet[];
  alertas: Alerta[];
}
