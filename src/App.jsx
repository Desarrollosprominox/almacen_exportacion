import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { msalConfig } from './config/authConfig';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { useState, useEffect } from 'react';

// Componente de carga
const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003594] mb-4"></div>
      <p className="text-gray-600">Cargando...</p>
    </div>
  </div>
);

// Componente protegido que verifica autenticación
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout principal que incluye el sidebar y el contenido
const MainLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0`}>
        <Sidebar onCollapse={setIsSidebarCollapsed} />
      </div>
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [msalInstance, setMsalInstance] = useState(null);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        const instance = new PublicClientApplication(msalConfig);
        
        instance.addEventCallback((event) => {
          if (event.eventType === EventType.LOGIN_SUCCESS) {
            if (event.payload.account) {
              instance.setActiveAccount(event.payload.account);
            }
          }
        });

        await instance.initialize();
        setMsalInstance(instance);
      } catch (error) {
        console.error("Error initializing MSAL:", error);
        setMsalInstance(new PublicClientApplication(msalConfig));
      }
    };

    initializeMsal();
  }, []);

  if (!msalInstance) {
    return <LoadingSpinner />;
  }

  return (
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
    </MsalProvider>
  );
}

export default App;
