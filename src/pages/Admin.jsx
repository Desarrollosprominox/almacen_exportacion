import { useState, useEffect, useMemo } from 'react';
import { useDataverseService } from '../services/dataverseService';
import { Plus } from 'lucide-react';

/**
 * Panel de administración para configurar valores mínimos y máximos
 * 
 * Funcionalidades previstas:
 * - Edición de valores mínimos y máximos por tipo
 * - Control de acceso basado en roles
 * - Integración con Dataverse para persistencia
 * - Validación de permisos
 */
function Admin() {
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('vinil');
  const [guardando, setGuardando] = useState(false);
  const [valoresEditados, setValoresEditados] = useState({});
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // todos | normal | bajo | critico
  const [filtroCantidad, setFiltroCantidad] = useState('todos'); // todos | igualCero | menorMinimo | entreMinMax | mayorMaximo
  const [filtroFecha, setFiltroFecha] = useState('todos'); // todos | hoy | ultimos7 | rango
  const [rangoFechaInicio, setRangoFechaInicio] = useState('');
  const [rangoFechaFin, setRangoFechaFin] = useState('');
  const [nuevoProducto, setNuevoProducto] = useState({
    amv_producto: '',
    amv_categoria: 'Vinil',
    amv_minimo: 0,
    amv_maximo: 0
  });
  const { getProductosIndirectos, updateProductoIndirecto, createProductoIndirecto, getInventarioIndirecto } = useDataverseService();

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const [data, inventarioData] = await Promise.all([
          getProductosIndirectos(),
          getInventarioIndirecto()
        ]);
        // Ordenar los productos alfabéticamente
        const productosOrdenados = [...data].sort((a, b) => 
          a.amv_producto.localeCompare(b.amv_producto)
        );
        setProductos(productosOrdenados);
        setInventario(inventarioData || []);
      } catch (err) {
        setError('Error al cargar los productos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  const getEstado = (cantidad, minimo, maximo) => {
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

  const ultimoMovimientoPorProducto = useMemo(() => {
    if (!inventario || inventario.length === 0) return {};
    const ordenado = [...inventario].sort((a, b) => new Date(b.amv_fecha) - new Date(a.amv_fecha));
    return ordenado.reduce((acc, curr) => {
      const key = `${curr.amv_producto}-${curr.amv_categoria}`;
      if (!acc[key]) {
        acc[key] = curr;
      }
      return acc;
    }, {});
  }, [inventario]);

  const productosEnriquecidos = useMemo(() => {
    return productos.map(p => {
      const key = `${p.amv_producto}-${p.amv_categoria}`;
      const ultimo = ultimoMovimientoPorProducto[key];
      const cantidad = ultimo ? Number(ultimo.amv_cantidad) : 0;
      const fecha = ultimo ? new Date(ultimo.amv_fecha) : null;
      const estado = getEstado(cantidad, Number(p.amv_minimo) || 0, Number(p.amv_maximo) || 0);
      return {
        ...p,
        nombre: p.amv_producto,
        categoria: p.amv_categoria,
        minimo: Number(p.amv_minimo) || 0,
        maximo: Number(p.amv_maximo) || 0,
        valorActual: cantidad,
        fecha,
        ultimaActualizacion: fecha
          ? fecha.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Mexico_City' })
          : 'N/D',
        estado
      };
    });
  }, [productos, ultimoMovimientoPorProducto]);

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setFiltroCantidad('todos');
    setFiltroFecha('todos');
    setRangoFechaInicio('');
    setRangoFechaFin('');
  };

  const productosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    let base = productosEnriquecidos;

    if (query) {
      base = base.filter(item =>
        item.nombre.toLowerCase().includes(query) ||
        item.categoria.toLowerCase().includes(query)
      );
    } else {
      base = base.filter(item => item.categoria.toLowerCase() === filtroActivo);
    }

    if (filtroEstado !== 'todos') {
      base = base.filter(item => item.estado === filtroEstado);
    }

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
        base = base.filter(item => item.fecha && item.fecha >= inicio && item.fecha <= fin);
      }
    }

    return base;
  }, [productosEnriquecidos, busqueda, filtroActivo, filtroEstado, filtroCantidad, filtroFecha, rangoFechaInicio, rangoFechaFin]);

  const handleSave = async (productoId, values) => {
    try {
      setGuardando(true);
      await updateProductoIndirecto(productoId, values);
      
      // Actualizar el estado local
      setProductos(prevProductos => 
        prevProductos.map(p => 
          p.amv_productosindirectosid === productoId 
            ? { ...p, ...values }
            : p
        )
      );
      // Limpiar el valor editado
      setValoresEditados(prev => {
        const newValues = { ...prev };
        delete newValues[productoId];
        return newValues;
      });
    } catch (error) {
      console.error('Error al guardar:', error);
      setError('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  const handleChange = (productoId, field, value) => {
    setValoresEditados(prev => ({
      ...prev,
      [productoId]: {
        ...prev[productoId],
        [field]: value
      }
    }));
  };

  const handleCrearProducto = async () => {
    try {
      setGuardando(true);
      const producto = await createProductoIndirecto(nuevoProducto);
      
      // Actualizar la lista de productos
      setProductos(prev => [...prev, producto]);
      
      // Limpiar el formulario
      setNuevoProducto({
        amv_producto: '',
        amv_categoria: 'Vinil',
        amv_minimo: 0,
        amv_maximo: 0
      });
      setMostrarFormulario(false);
    } catch (error) {
      console.error('Error al crear producto:', error);
      setError('Error al crear el producto');
    } finally {
      setGuardando(false);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Administración de Inventario</h1>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 ${
            mostrarFormulario
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {mostrarFormulario ? (
            'Cancelar'
          ) : (
            <>
              <Plus size={20} />
              Nuevo Producto
            </>
          )}
        </button>
      </div>

      {/* Formulario de nuevo producto */}
      {mostrarFormulario && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Nuevo Producto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto
              </label>
              <input
                type="text"
                value={nuevoProducto.amv_producto}
                onChange={(e) => setNuevoProducto(prev => ({ ...prev, amv_producto: e.target.value }))}
                className="border rounded-md p-2 w-full"
                disabled={guardando}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={nuevoProducto.amv_categoria}
                onChange={(e) => setNuevoProducto(prev => ({ ...prev, amv_categoria: e.target.value }))}
                className="border rounded-md p-2 w-full"
                disabled={guardando}
              >
                <option value="Vinil">Vinil</option>
                <option value="Tarima">Tarima</option>
                <option value="Material de Empaque">Material de Empaque</option>
                <option value="Mextape">Mextape</option>
                <option value="Esquineros">Esquineros</option>
                <option value="Cartón">Cartón</option>
                <option value="Bandas">Bandas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mínimo
              </label>
              <input
                type="number"
                value={nuevoProducto.amv_minimo}
                onChange={(e) => setNuevoProducto(prev => ({ ...prev, amv_minimo: parseInt(e.target.value) }))}
                className="border rounded-md p-2 w-full"
                disabled={guardando}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Máximo
              </label>
              <input
                type="number"
                value={nuevoProducto.amv_maximo}
                onChange={(e) => setNuevoProducto(prev => ({ ...prev, amv_maximo: parseInt(e.target.value) }))}
                className="border rounded-md p-2 w-full"
                disabled={guardando}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCrearProducto}
              disabled={guardando || !nuevoProducto.amv_producto}
              className={`px-4 py-2 rounded-md font-medium ${
                guardando || !nuevoProducto.amv_producto
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {guardando ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda y limpiar */}
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
          onClick={() => setFiltroActivo('vinil')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'vinil'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Vinil
        </button>
        <button
          onClick={() => setFiltroActivo('tarima')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'tarima'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tarimas
        </button>
        <button
          onClick={() => setFiltroActivo('material de empaque')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'material de empaque'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Material de Empaque
        </button>
        <button
          onClick={() => setFiltroActivo('mextape')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'mextape'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Mextape
        </button>
        <button
          onClick={() => setFiltroActivo('esquineros')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'esquineros'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Esquineros
        </button>
        <button
          onClick={() => setFiltroActivo('cartón')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'cartón'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Cartón
        </button>
        <button
          onClick={() => setFiltroActivo('bandas')}
          className={`px-4 py-2 rounded-md font-medium ${
            filtroActivo === 'bandas'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Bandas
        </button>
      </div>

      {/* Tabla de productos */}
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
                  Estatus
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actualización
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productosFiltrados.map((producto) => (
                <tr key={producto.amv_productosindirectosid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{producto.amv_producto}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{producto.valorActual} pzas</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={valoresEditados[producto.amv_productosindirectosid]?.amv_minimo ?? producto.amv_minimo}
                      onChange={(e) => handleChange(producto.amv_productosindirectosid, 'amv_minimo', parseInt(e.target.value))}
                      onBlur={() => {
                        const valores = valoresEditados[producto.amv_productosindirectosid];
                        if (valores) {
                          handleSave(producto.amv_productosindirectosid, {
                            ...producto,
                            ...valores
                          });
                        }
                      }}
                      className="border rounded-md p-2 w-24"
                      disabled={guardando}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={valoresEditados[producto.amv_productosindirectosid]?.amv_maximo ?? producto.amv_maximo}
                      onChange={(e) => handleChange(producto.amv_productosindirectosid, 'amv_maximo', parseInt(e.target.value))}
                      onBlur={() => {
                        const valores = valoresEditados[producto.amv_productosindirectosid];
                        if (valores) {
                          handleSave(producto.amv_productosindirectosid, {
                            ...producto,
                            ...valores
                          });
                        }
                      }}
                      className="border rounded-md p-2 w-24"
                      disabled={guardando}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(producto.estado)}`}>
                      {getEstadoText(producto.estado)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.ultimaActualizacion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {guardando ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : valoresEditados[producto.amv_productosindirectosid] ? (
                      <span className="text-yellow-600">Sin guardar</span>
                    ) : (
                      <span className="text-green-600">Guardado</span>
                    )}
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

export default Admin; 