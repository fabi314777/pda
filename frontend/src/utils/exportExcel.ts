import * as XLSX from 'xlsx';

export interface ColumnDef {
  key: string;
  label: string;
  width?: number;
}

/**
 * Genera un archivo .xlsx legible y profesional: título del reporte, fecha de
 * generación, encabezados en español y columnas con ancho ajustado —
 * en vez de un CSV crudo con nombres técnicos de columna.
 */
export function exportToExcel(filename: string, title: string, rows: any[], columns: ColumnDef[]) {
  const headerLabels = columns.map((c) => c.label);
  const dataRows = rows.map((row) => columns.map((c) => row[c.key] ?? ''));

  const sheetData = [
    [title],
    [`Generado: ${new Date().toLocaleString('es-VE')}`],
    [`Total de registros: ${rows.length}`],
    [],
    headerLabels,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = columns.map((c) => ({ wch: c.width || 18 }));
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
