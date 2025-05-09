import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';

function Home() {
  const { isAuthenticated, login } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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
          <h1 className="text-2xl font-semibold text-gray-900">Home</h1>
        </header>
        
        <div className="p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bienvenido a tu aplicación</h2>
            <p className="text-gray-600">
              Este es un template base que incluye autenticación con Microsoft y un sidebar navegable.
              Puedes comenzar a construir tu aplicación desde aquí.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home; 