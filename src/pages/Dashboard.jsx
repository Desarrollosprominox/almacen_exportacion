import { useState, useEffect } from 'react';
import { useDataverseService } from '../services/dataverseService';
import { ChevronDown, ChevronUp } from 'lucide-react';

const Dashboard = () => {
  const [inventario, setInventario] = useState([]);
  const [inventarioFiltrado, setInventarioFiltrado] = useState([]);
  const [filtroActivo, setFiltroActivo] = useState('Vinil');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos | normal | bajo | critico
  const [filtroCantidad, setFiltroCantidad] = useState('todos'); // todos | igualCero | menorMinimo | entreMinMax | mayorMaximo
  const [filtroFecha, setFiltroFecha] = useState('todos'); // todos | hoy | ultimos7 | rango
  const [rangoFechaInicio, setRangoFechaInicio] = useState('');
  const [rangoFechaFin, setRangoFechaFin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarCriticos, setMostrarCriticos] = useState(false);
  const [mostrarBajos, setMostrarBajos] = useState(false);
  const [mostrarNormales, setMostrarNormales] = useState(false);
  const { getInventarioIndirecto, getProductosIndirectos } = useDataverseService();

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroCantidad('todos');
    setFiltroFecha('todos');
    setRangoFechaInicio('');
    setRangoFechaFin('');
  };

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
          fecha: new Date(item.amv_fecha),
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
    const query = busqueda.trim().toLowerCase();

    const toStartOfDay = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const toEndOfDay = (date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    let base = inventario;

    // Búsqueda global vs filtro por categoría
    if (query) {
      base = base.filter(item =>
        item.nombre.toLowerCase().includes(query) ||
        item.categoria.toLowerCase().includes(query)
      );
    } else {
      base = base.filter(item => item.categoria === filtroActivo);
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      base = base.filter(item => item.estado === filtroEstado);
    }

    // Filtro por cantidad
    if (filtroCantidad !== 'todos') {
      base = base.filter(item => {
        const cantidad = Number(item.valorActual) || 0;
        const minimo = Number(item.minimo) || 0;
        const maximo = Number(item.maximo) || 0;
        switch (filtroCantidad) {
          case 'igualCero':
            return cantidad === 0;
          case 'menorMinimo':
            return cantidad < minimo;
          case 'entreMinMax':
            return cantidad >= minimo && cantidad <= maximo;
          case 'mayorMaximo':
            return cantidad > maximo;
          default:
            return true;
        }
      });
    }

    // Filtro por fecha
    if (filtroFecha !== 'todos') {
      const hoy = new Date();
      let inicio = null;
      let fin = null;

      if (filtroFecha === 'hoy') {
        inicio = toStartOfDay(hoy);
        fin = toEndOfDay(hoy);
      } else if (filtroFecha === 'ultimos7') {
        const hace7 = new Date();
        hace7.setDate(hace7.getDate() - 6);
        inicio = toStartOfDay(hace7);
        fin = toEndOfDay(hoy);
      } else if (filtroFecha === 'rango' && rangoFechaInicio && rangoFechaFin) {
        inicio = toStartOfDay(new Date(rangoFechaInicio));
        fin = toEndOfDay(new Date(rangoFechaFin));
      }

      if (inicio && fin) {
        base = base.filter(item => item.fecha >= inicio && item.fecha <= fin);
      }
    }

    setInventarioFiltrado(base);
  }, [filtroActivo, inventario, busqueda, filtroEstado, filtroCantidad, filtroFecha, rangoFechaInicio, rangoFechaFin]);

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

      {/* Búsqueda global */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o categoría (global)"
          className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleLimpiarFiltros}
          className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Filtros avanzados */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="normal">Normal</option>
            <option value="bajo">Bajo</option>
            <option value="critico">Crítico</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Cantidad</label>
          <select
            value={filtroCantidad}
            onChange={(e) => setFiltroCantidad(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="igualCero">Cantidad = 0</option>
            <option value="menorMinimo">Cantidad menor al mínimo</option>
            <option value="entreMinMax">Cantidad entre mínimo y máximo</option>
            <option value="mayorMaximo">Cantidad mayor al máximo</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Fecha</label>
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="hoy">Hoy</option>
            <option value="ultimos7">Últimos 7 días</option>
            <option value="rango">Rango de fechas</option>
          </select>
          {filtroFecha === 'rango' && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                value={rangoFechaInicio}
                onChange={(e) => setRangoFechaInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={rangoFechaFin}
                onChange={(e) => setRangoFechaFin(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
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
        <button
          onClick={() => setFiltroActivo('Mextape')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Mextape'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Mextape
        </button>
        <button
          onClick={() => setFiltroActivo('Esquineros')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Esquineros'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Esquineros
        </button>
        <button
          onClick={() => setFiltroActivo('Cartón')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Cartón'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cartón
        </button>
        <button
          onClick={() => setFiltroActivo('Bandas')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'Bandas'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Bandas
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Productos en Estado Normal</h3>
            <button
              onClick={() => setMostrarNormales(!mostrarNormales)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {mostrarNormales ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {inventarioFiltrado.filter(i => i.estado === 'normal').length}
          </p>
          {mostrarNormales && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {inventarioFiltrado
                  .filter(i => i.estado === 'normal')
                  .map(producto => (
                    <div key={producto.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{producto.nombre}</span>
                        <span className="text-xs text-gray-500">{producto.categoria}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-green-600">{producto.valorActual} {producto.unidad}</span>
                        <span className="text-xs text-gray-500">Mín: {producto.minimo}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Productos Bajos</h3>
            <button
              onClick={() => setMostrarBajos(!mostrarBajos)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {mostrarBajos ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <p className="text-3xl font-bold text-yellow-600">
            {inventarioFiltrado.filter(i => i.estado === 'bajo').length}
          </p>
          {mostrarBajos && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {inventarioFiltrado
                  .filter(i => i.estado === 'bajo')
                  .map(producto => (
                    <div key={producto.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{producto.nombre}</span>
                        <span className="text-xs text-gray-500">{producto.categoria}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-yellow-600">{producto.valorActual} {producto.unidad}</span>
                        <span className="text-xs text-gray-500">Mín: {producto.minimo}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">Productos Críticos</h3>
            <button
              onClick={() => setMostrarCriticos(!mostrarCriticos)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              {mostrarCriticos ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {inventarioFiltrado.filter(i => i.estado === 'critico').length}
          </p>
          {mostrarCriticos && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                {inventarioFiltrado
                  .filter(i => i.estado === 'critico')
                  .map(producto => (
                    <div key={producto.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{producto.nombre}</span>
                        <span className="text-xs text-gray-500">{producto.categoria}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold text-red-600">{producto.valorActual} {producto.unidad}</span>
                        <span className="text-xs text-gray-500">Mín: {producto.minimo}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 