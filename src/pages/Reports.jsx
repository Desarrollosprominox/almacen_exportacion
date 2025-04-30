import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDataverseService } from '../services/dataverseService';
import Sidebar from '../components/Sidebar';
import BranchBarChart from '../components/charts/BranchBarChart';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';

function Reports() {
  const { isAuthenticated, login } = useAuth();
  const { fetchReportData } = useDataverseService();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const reportData = await fetchReportData();
      setData(reportData);
      setError(null);
    } catch (error) {
      console.error('Error loading report data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchReportData]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No estás autenticado</h1>
          <button
            onClick={login}
            className="bg-[#003594] text-white px-4 py-2 rounded hover:bg-[#002b7a]"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar onCollapse={setIsSidebarCollapsed} />
      <main 
        className={`transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
        </header>
        
        <div className="p-8">
          <div className="max-w-screen-lg mx-auto">
            {error && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#003594]"></div>
                <p className="mt-2 text-gray-600">Cargando datos...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <BranchBarChart data={data} />
                <CategoryPieChart data={data} />
                <MonthlyLineChart data={data} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Reports; 