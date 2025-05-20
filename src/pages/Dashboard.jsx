import { useState, useEffect } from 'react';
import { useDataverseService } from '../services/dataverseService';

const Dashboard = () => {
  const [inventario, setInventario] = useState([]);
  const [inventarioFiltrado, setInventarioFiltrado] = useState([]);
  const [filtroActivo, setFiltroActivo] = useState('Vinil');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { getInventarioIndirecto, getProductosIndirectos } = useDataverseService();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [inventarioData, productosData] = await Promise.all([
          getInventarioIndirecto(),
          getProductosIndirectos()
        ]);
        
        // Ordenar los datos por fecha descendente (más reciente primero)
        const inventarioOrdenadoPorFecha = [...inventarioData].sort((a, b) => 
          new Date(b.amv_fecha) - new Date(a.amv_fecha)
        );

        // Crear un mapa de productos con sus valores mínimos y máximos
        const productosMap = productosData.reduce((acc, curr) => {
          acc[curr.amv_producto] = {
            minimo: curr.amv_minimo,
            maximo: curr.amv_maximo
          };
          return acc;
        }, {});

        // Agrupar por producto y categoría para obtener el último registro de cada uno
        const productosUnicos = inventarioOrdenadoPorFecha.reduce((acc, curr) => {
          const key = `${curr.amv_producto}-${curr.amv_categoria}`;
          if (!acc[key]) {
            acc[key] = curr;
          }
          return acc;
        }, {});

        // Convertir a array y agregar estados y valores mínimos/máximos
        const inventarioProcesado = Object.values(productosUnicos).map(item => ({
          id: item.amv_producto,
          nombre: item.amv_producto,
          valorActual: item.amv_cantidad,
          unidad: 'pzas',
          categoria: item.amv_categoria,
          minimo: productosMap[item.amv_producto]?.minimo || 0,
          maximo: productosMap[item.amv_producto]?.maximo || 0,
          estado: getEstado(item.amv_cantidad, item.amv_categoria, productosMap[item.amv_producto]?.minimo, productosMap[item.amv_producto]?.maximo),
          ultimaActualizacion: new Date(item.amv_fecha).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'America/Mexico_City'
          })
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));

        setInventario(inventarioProcesado);
        setInventarioFiltrado(inventarioProcesado.filter(item => item.categoria === filtroActivo));
      } catch (err) {
        setError('Error al cargar los datos del inventario');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setInventarioFiltrado(inventario.filter(item => item.categoria === filtroActivo));
  }, [filtroActivo, inventario]);

  const getEstado = (cantidad, categoria, minimo, maximo) => {
    if (cantidad <= minimo) return 'critico';
    if (cantidad <= (minimo + maximo) / 2) return 'bajo';
    return 'normal';
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'normal':
        return 'bg-green-100 text-green-800';
      case 'bajo':
        return 'bg-yellow-100 text-yellow-800';
      case 'critico':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'normal':
        return 'Normal';
      case 'bajo':
        return 'Bajo';
      case 'critico':
        return 'Crítico';
      default:
        return 'Desconocido';
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Inventario</h1>
        <p className="text-gray-600">Vista general del estado actual del inventario</p>
      </div>

      {/* Botones de filtro */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFiltroActivo('Vinil')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Vinil'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vinil
        </button>
        <button
          onClick={() => setFiltroActivo('Tarima')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Tarima'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tarimas
        </button>
        <button
          onClick={() => setFiltroActivo('Material de Empaque')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Material de Empaque'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Material de Empaque
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad Actual
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mínimo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Máximo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventarioFiltrado.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.valorActual} {item.unidad}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.minimo} {item.unidad}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.maximo} {item.unidad}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(item.estado)}`}>
                      {getEstadoText(item.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.ultimaActualizacion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Productos en Estado Normal</h3>
          <p className="text-3xl font-bold text-green-600">
            {inventarioFiltrado.filter(i => i.estado === 'normal').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Productos Bajos</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {inventarioFiltrado.filter(i => i.estado === 'bajo').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Productos Críticos</h3>
          <p className="text-3xl font-bold text-red-600">
            {inventarioFiltrado.filter(i => i.estado === 'critico').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 