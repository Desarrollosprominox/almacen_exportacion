import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDataverseService } from '../services/dataverseService';
import TicketList from '../components/TicketList';
import Sidebar from '../components/Sidebar';

function Dashboard() {
  const { isAuthenticated, login } = useAuth();
  const { fetchTickets } = useDataverseService();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTickets();
      setTickets(data);
      setError(null);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [fetchTickets]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    }
  }, [isAuthenticated, loadTickets]);

  const handleRefresh = useCallback(() => {
    loadTickets();
  }, [loadTickets]);

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
          <h1 className="text-2xl font-semibold text-gray-900">Solicitudes pendientes</h1>
        </header>
        
        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#003594]"></div>
              <p className="mt-2 text-gray-600">Cargando tickets...</p>
            </div>
          ) : (
            <TicketList tickets={tickets} onRefresh={handleRefresh} />
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
