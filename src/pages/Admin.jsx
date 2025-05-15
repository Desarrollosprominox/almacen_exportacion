import { useState, useEffect } from 'react';
import { useDataverseService } from '../services/dataverseService';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('vinil');
  const [guardando, setGuardando] = useState(false);
  const [valoresEditados, setValoresEditados] = useState({});
  const { getProductosIndirectos, updateProductoIndirecto } = useDataverseService();

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setLoading(true);
        const data = await getProductosIndirectos();
        setProductos(data);
      } catch (err) {
        setError('Error al cargar los productos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

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

  const productosFiltrados = productos.filter(
    producto => producto.amv_categoria.toLowerCase() === filtroActivo
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Administración de Inventario</h1>

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
                  Mínimo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Máximo
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