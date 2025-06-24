import { useState, useEffect } from 'react';
import { useDataverseService } from '../services/dataverseService';
import { ArrowUpDown } from 'lucide-react';

/**
 * Página para consultar el histórico de inventario
 * 
 * Funcionalidades previstas:
 * - Filtros por fecha, tipo y subtipo
 * - Tabla con registros capturados
 * - Exportación de datos
 * - Integración con Dataverse para consultas
 */
function Historico() {
  // Obtener el primer y último día del mes actual
  const getFirstAndLastDayOfMonth = (date = new Date()) => {
    // Ajustar la fecha a la zona horaria de México
    const mexicoDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const firstDay = new Date(mexicoDate.getFullYear(), mexicoDate.getMonth(), 1);
    const lastDay = new Date(mexicoDate.getFullYear(), mexicoDate.getMonth() + 1, 0);
    return {
      firstDay: firstDay.toISOString().split('T')[0],
      lastDay: lastDay.toISOString().split('T')[0]
    };
  };

  const currentMonth = getFirstAndLastDayOfMonth();
  const currentMonthFormatted = new Date().toLocaleString('en-US', { 
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit'
  }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1');

  const [filters, setFilters] = useState({
    startDate: currentMonth.firstDay,
    endDate: currentMonth.lastDay,
    categoria: '',
    month: currentMonthFormatted
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordenDescendente, setOrdenDescendente] = useState(true);
  const { getInventarioIndirecto } = useDataverseService();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const data = await getInventarioIndirecto();
        
        // Ordenar los datos por fecha descendente
        const dataOrdenada = [...data].sort((a, b) => 
          new Date(b.amv_fecha) - new Date(a.amv_fecha)
        );
        
        // Filtrar los registros según los filtros seleccionados
        let filteredData = dataOrdenada;
        
        if (filters.startDate) {
          filteredData = filteredData.filter(record => 
            new Date(record.amv_fecha) >= new Date(filters.startDate)
          );
        }
        
        if (filters.endDate) {
          filteredData = filteredData.filter(record => 
            new Date(record.amv_fecha) <= new Date(filters.endDate + 'T23:59:59')
          );
        }
        
        if (filters.categoria) {
          filteredData = filteredData.filter(record => 
            record.amv_categoria.toLowerCase() === filters.categoria.toLowerCase()
          );
        }
        
        setRecords(filteredData);
      } catch (err) {
        setError('Error al cargar los registros');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'month') {
      // Cuando se cambia el mes, actualizar las fechas de inicio y fin
      const [year, month] = value.split('-');
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      // Ajustar las fechas a la zona horaria de México
      const mexicoFirstDay = new Date(firstDay.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      const mexicoLastDay = new Date(lastDay.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      
      setFilters(prev => ({
        ...prev,
        month: value,
        startDate: mexicoFirstDay.toISOString().split('T')[0],
        endDate: mexicoLastDay.toISOString().split('T')[0]
      }));
    } else {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    }
  };

  const toggleOrden = () => {
    setOrdenDescendente(prev => !prev);
  };

  const handleExport = () => {
    // Crear el contenido del CSV
    const headers = ['Fecha', 'Producto', 'Categoría', 'Cantidad'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        new Date(record.amv_fecha).toLocaleDateString('es-MX', {
          timeZone: 'America/Mexico_City',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        record.amv_producto,
        record.amv_categoria,
        record.amv_cantidad
      ].join(','))
    ].join('\n');

    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${filters.month}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003594] mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Inventario</h1>
        <p className="text-gray-600">Registro detallado de movimientos y niveles de inventario</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mes
          </label>
          <input
            type="month"
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            className="border rounded-md p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Inicio
          </label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="border rounded-md p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha Fin
          </label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="border rounded-md p-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría
          </label>
          <select
            name="categoria"
            value={filters.categoria}
            onChange={handleFilterChange}
            className="border rounded-md p-2 w-full"
          >
            <option value="">Todas</option>
            <option value="vinil">Vinil</option>
            <option value="tarima">Tarima</option>
            <option value="material de empaque">Material de Empaque</option>
            <option value="mextape">Mextape</option>
            <option value="esquineros">Esquineros</option>
            <option value="cartón">Cartón</option>
            <option value="bandas">Bandas</option>
          </select>
        </div>
      </div>

      {/* Botón de exportación */}
      <div className="mb-6">
        <button
          onClick={handleExport}
          className="bg-[#003594] text-white px-4 py-2 rounded-md hover:bg-[#002b7a] transition-colors"
        >
          Exportar Datos
        </button>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={toggleOrden}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Fecha</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cantidad
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
                <tr key={record.amv_inventarioindirectosid} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.amv_fecha).toLocaleDateString('es-MX', {
                      timeZone: 'America/Mexico_City',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.amv_producto}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.amv_categoria}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.amv_cantidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export default Historico; 