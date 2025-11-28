import * as XLSX from 'xlsx';

function ExportExcelButton({ data = [], columns = [], filename = 'export.xlsx', className = '' }) {
  const buildAoA = () => {
    if (!Array.isArray(data)) return [];

    // Encabezados definidos explícitamente
    const headers = Array.isArray(columns) && columns.length > 0
      ? columns.map(col => col.header || col.key || '')
      : (data[0] ? Object.keys(data[0]) : []);

    const aoa = [headers];

    if (Array.isArray(columns) && columns.length > 0) {
      data.forEach((row) => {
        aoa.push(columns.map(col => row?.[col.key]));
      });
    } else {
      data.forEach((row) => {
        aoa.push(headers.map(h => row?.[h]));
      });
    }

    return aoa;
  };

  const handleExport = () => {
    try {
      const aoa = buildAoA();
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
      XLSX.writeFile(workbook, filename);
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

