import { useState, useEffect, useMemo } from 'react';
import { useDataverseService } from '../services/dataverseService';
import ExportExcelButton from '../components/ExportExcelButton';

const Dashboard = () => {
  const { getInventarioAlmacenCS } = useDataverseService();
  const [movimientos, setMovimientos] = useState([]);
  const [filters, setFilters] = useState({
    idmov: '',
    empaque: '',
    ubicacion: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getInventarioAlmacenCS();
        setMovimientos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar los datos de inventario de almacén');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMovimientos = useMemo(() => {
    const normalize = (s) => (s || '').toString().toLowerCase();
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    if (end) {
      // incluir todo el día final
      end.setHours(23, 59, 59, 999);
    }

    return movimientos.filter((m) => {
      // Texto
      if (filters.idmov && !normalize(m.cr9a1_idmovimiento).includes(normalize(filters.idmov))) return false;
      if (filters.empaque && !normalize(m.cr9a1_empaque).includes(normalize(filters.empaque))) return false;
      if (filters.ubicacion && !normalize(m.cr9a1_ubicacion).includes(normalize(filters.ubicacion))) return false;

      // Fechas
      if (start || end) {
        const d = m.cr9a1_fechahora ? new Date(m.cr9a1_fechahora) : null;
        if (!d || isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
      }

      return true;
    });
  }, [movimientos, filters]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventarios Almacén CS</h1>
          <p className="text-gray-600">Datos de cr9a1_inventariosalmacencs</p>
          <p className="text-sm text-gray-500 mt-1">
            Mostrando {filteredMovimientos.length} de {movimientos.length}
          </p>
        </div>
        <ExportExcelButton
          data={filteredMovimientos}
          filename="inventario_almacen.xlsx"
          columns={[
            { key: 'cr9a1_idmovimiento', header: 'ID Movimiento' },
            { key: 'cr9a1_empaque', header: 'Empaque' },
            { key: 'cr9a1_ubicacion', header: 'Ubicación' },
            { key: 'cr9a1_fechahora', header: 'Fecha y hora' },
            { key: 'cr9a1_piezasdec', header: 'Piezas dec' },
            { key: 'cr9a1_piezas', header: 'Piezas' }
          ]}
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">ID Movimiento</label>
            <input
              type="text"
              name="idmov"
              value={filters.idmov}
              onChange={onChange}
              placeholder="Buscar..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Empaque</label>
            <input
              type="text"
              name="empaque"
              value={filters.empaque}
              onChange={onChange}
              placeholder="Buscar..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ubicación</label>
            <input
              type="text"
              name="ubicacion"
              value={filters.ubicacion}
              onChange={onChange}
              placeholder="Buscar..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fecha inicio</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Fecha fin</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={onChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Movimiento
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empaque
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y hora
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Piezas dec
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Piezas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovimientos.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.cr9a1_idmovimiento || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.cr9a1_empaque || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.cr9a1_ubicacion || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDateTime(item.cr9a1_fechahora)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.cr9a1_piezasdec ?? '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.cr9a1_piezas ?? '-'}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMovimientos.length === 0 && (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-500" colSpan="6">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 