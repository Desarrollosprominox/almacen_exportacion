import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function ExportExcelButton({ data = [], columns = [], filename = 'export.xlsx', className = '' }) {
  const buildRows = () => {
    if (!Array.isArray(data)) return [];

    if (Array.isArray(columns) && columns.length > 0) {
      return data.map((row) => {
        const obj = {};
        columns.forEach((col) => {
          obj[col.key] = row?.[col.key];
        });
        return obj;
      });
    }

    return data;
  };

  const handleExport = () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Datos');

      // Definir columnas con encabezados visibles
      let excelColumns = [];
      if (Array.isArray(columns) && columns.length > 0) {
        excelColumns = columns.map((c) => ({
          header: c.header || c.key,
          key: c.key,
          width: c.width || 18
        }));
      } else if (data[0]) {
        excelColumns = Object.keys(data[0]).map((k) => ({
          header: k,
          key: k,
          width: 18
        }));
      }

      worksheet.columns = excelColumns;

      // Agregar filas
      const rows = buildRows();
      rows.forEach((r) => {
        // Intentar convertir fecha si la columna es de fecha
        if (r.cr9a1_fechahora) {
          const d = new Date(r.cr9a1_fechahora);
          if (!isNaN(d.getTime())) {
            r.cr9a1_fechahora = d;
          }
        }
        worksheet.addRow(r);
      });

      // Estilo de encabezado con color
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0033CC' } // color solicitado
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };
      });
      headerRow.height = 20;

      // Formato de fecha si existe la columna
      const fechaColIndex = excelColumns.findIndex((c) => c.key === 'cr9a1_fechahora') + 1;
      if (fechaColIndex > 0) {
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const c = worksheet.getRow(i).getCell(fechaColIndex);
          if (c.value instanceof Date) {
            c.numFmt = 'dd/mm/yyyy hh:mm:ss';
          }
        }
      }

      // Autofiltro y congelar encabezado
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: excelColumns.length }
      };
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      workbook.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, filename);
      });
    } catch (err) {
      // Fallback silencioso
      console.error('Error al exportar a Excel:', err);
      alert('No se pudo exportar a Excel. Revisa la consola para más detalles.');
    }
  };

  return (
    <button
      onClick={handleExport}
      className={`px-4 py-2 rounded-md font-medium bg-green-600 text-white hover:bg-green-700 transition-colors ${className}`}
      type="button"
    >
      Exportar a Excel
    </button>
  );
}

export default ExportExcelButton;

