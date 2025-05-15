import { useState, useEffect } from 'react';
import { useDataverseService } from '../services/dataverseService';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function Indicadores() {
  const [indicators, setIndicators] = useState([]);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('vinil');
  const [rangoDias, setRangoDias] = useState(30);
  const { getInventarioIndirecto, getProductosIndirectos } = useDataverseService();

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [inventarioData, productosData] = await Promise.all([
          getInventarioIndirecto(),
          getProductosIndirectos()
        ]);

        // Procesar datos de productos
        const productosMap = productosData.reduce((acc, curr) => {
          acc[curr.amv_producto] = {
            minimo: curr.amv_minimo,
            maximo: curr.amv_maximo
          };
          return acc;
        }, {});

        // Procesar datos de inventario
        const inventarioOrdenado = [...inventarioData].sort((a, b) => 
          new Date(b.amv_fecha) - new Date(a.amv_fecha)
        );

        // Agrupar por producto y categoría
        const productosUnicos = inventarioOrdenado.reduce((acc, curr) => {
          const key = `${curr.amv_producto}-${curr.amv_categoria}`;
          if (!acc[key]) {
            acc[key] = curr;
          }
          return acc;
        }, {});

        // Crear indicadores
        const indicadoresProcesados = Object.values(productosUnicos).map(item => ({
          id: `${item.amv_producto}-${item.amv_categoria}`,
          type: item.amv_producto,
          categoria: item.amv_categoria,
          current: item.amv_cantidad,
          min: productosMap[item.amv_producto]?.minimo || 0,
          max: productosMap[item.amv_producto]?.maximo || 0,
          status: getEstado(item.amv_cantidad, productosMap[item.amv_producto]?.minimo, productosMap[item.amv_producto]?.maximo)
        }));

        setIndicators(indicadoresProcesados);

        // Seleccionar primer indicador del filtro activo
        const primerIndicador = indicadoresProcesados.find(i => i.categoria.toLowerCase() === filtroActivo) || indicadoresProcesados[0];
        if (primerIndicador) {
          setSelectedIndicator(primerIndicador);
          setHistoricalData(generateHistoricalData(primerIndicador, inventarioOrdenado));
        }
      } catch (err) {
        setError('Error al cargar los datos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Actualizar datos históricos cuando cambia el indicador seleccionado o el rango de días
  useEffect(() => {
    if (selectedIndicator) {
      const fetchHistoricalData = async () => {
        try {
          const inventarioData = await getInventarioIndirecto();
          const inventarioOrdenado = [...inventarioData].sort((a, b) => 
            new Date(b.amv_fecha) - new Date(a.amv_fecha)
          );
          setHistoricalData(generateHistoricalData(selectedIndicator, inventarioOrdenado));
        } catch (err) {
          console.error('Error al cargar datos históricos:', err);
        }
      };
      fetchHistoricalData();
    }
  }, [selectedIndicator, rangoDias]);

  // Actualizar indicadores cuando cambia el filtro
  useEffect(() => {
    if (indicators.length > 0) {
      const indicadorFiltrado = indicators.find(i => i.categoria.toLowerCase() === filtroActivo);
      if (indicadorFiltrado) {
        setSelectedIndicator(indicadorFiltrado);
      }
    }
  }, [filtroActivo, indicators]);

  const getEstado = (cantidad, minimo, maximo) => {
    if (cantidad <= minimo) return 'critico';
    if (cantidad <= (minimo + maximo) / 2) return 'bajo';
    return 'normal';
  };

  const generateHistoricalData = (indicator, inventarioOrdenado) => {
    // Calcular la fecha límite según el rango seleccionado
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - rangoDias);

    // Filtrar y ordenar registros del producto
    const registrosProducto = inventarioOrdenado
      .filter(record => 
        record.amv_producto === indicator.type && 
        record.amv_categoria === indicator.categoria &&
        new Date(record.amv_fecha) >= fechaLimite
      )
      .sort((a, b) => new Date(a.amv_fecha) - new Date(b.amv_fecha));

    // Si no hay registros, usar el valor actual
    if (registrosProducto.length === 0) {
      registrosProducto.push({
        amv_fecha: new Date().toISOString(),
        amv_cantidad: indicator.current
      });
    }

    return {
      labels: registrosProducto.map(record => 
        new Date(record.amv_fecha).toLocaleDateString('es-MX', {
          timeZone: 'America/Mexico_City',
          month: '2-digit',
          day: '2-digit'
        })
      ),
      datasets: [
        {
          label: 'Valor Actual',
          data: registrosProducto.map(record => record.amv_cantidad),
          borderColor: '#003594',
          backgroundColor: 'rgba(0, 53, 148, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Mínimo',
          data: Array(registrosProducto.length).fill(indicator.min),
          borderColor: '#EF4444',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          tension: 0
        },
        {
          label: 'Máximo',
          data: Array(registrosProducto.length).fill(indicator.max),
          borderColor: '#10B981',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          tension: 0
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Histórico de Inventario'
      }
    },
    scales: {
      x: {
        type: 'category',
        ticks: {
          autoSkip: false,
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cantidad'
        }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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

  const getBarColor = (status) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500';
      case 'bajo':
        return 'bg-yellow-500';
      case 'critico':
        return 'bg-red-500';
      default:
        return 'bg-[#003594]';
    }
  };

  const calculateBarWidth = (current, min, max) => {
    if (current <= min) return '0%';
    if (current >= max) return '100%';
    return `${((current - min) / (max - min)) * 100}%`;
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'normal':
        return 'NORMAL';
      case 'bajo':
        return 'BAJO';
      case 'critico':
        return 'CRÍTICO';
      default:
        return status.toUpperCase();
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

  const indicadoresFiltrados = indicators.filter(i => i.categoria.toLowerCase() === filtroActivo);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Indicadores de Inventario</h1>
        <p className="text-gray-600">Monitoreo y análisis de niveles de inventario</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Botones de categoría */}
        <div className="flex gap-4">
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
            Tarima
          </button>
        </div>

        {/* Selector de rango de días */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            Rango de días:
          </label>
          <select
            value={rangoDias}
            onChange={(e) => setRangoDias(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={180}>Últimos 180 días</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de indicadores */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:col-span-1">
          <div className="h-[600px] overflow-y-auto pr-2">
            <div className="space-y-3 pl-1">
              {indicadoresFiltrados.map((indicator) => (
            <div
              key={indicator.id}
                  className={`bg-white rounded-lg border border-gray-200 cursor-pointer transition-all ${
                selectedIndicator?.id === indicator.id ? 'ring-2 ring-[#003594]' : ''
              }`}
                  onClick={() => setSelectedIndicator(indicator)}
            >
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                <div>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {indicator.type}
                  </h3>
                </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(indicator.status)}`}>
                        {getStatusText(indicator.status)}
                </span>
              </div>

                    <div className="mt-2 space-y-2">
                <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Actual</span>
                    <span>{indicator.current}</span>
                  </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                            className={`${getBarColor(indicator.status)} h-1.5 rounded-full transition-all duration-300`}
                      style={{
                              width: calculateBarWidth(indicator.current, indicator.min, indicator.max)
                      }}
                    />
                  </div>
                </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">Mínimo</p>
                    <p className="font-medium">{indicator.min}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Máximo</p>
                    <p className="font-medium">{indicator.max}</p>
                        </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>
        </div>

        {/* Gráfica */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:col-span-2">
          <div className="h-[600px]">
          {historicalData && (
            <Line options={chartOptions} data={historicalData} />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Indicadores; 