import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { msalConfig } from './config/authConfig';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import { useAuth } from './hooks/useAuth';
import { useState, useEffect } from 'react';
import './App.css';
import Users from './pages/Users';
import Reports from './pages/Reports';
import TicketDetails from './pages/TicketDetails';

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

// Página de login
function LoginPage() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    console.error('Auth error:', error);
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white fixed inset-0 w-screen h-screen">
      <div className="w-full max-w-[420px] flex flex-col items-center animate-fadeIn">
        <div className="w-[150px] mb-9">
          <img
            src="/logop.png"
            alt="Prominox Logo"
            className="w-full h-auto object-contain filter drop-shadow"
          />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
          Gestión de Tickets de sistemas
        </h1>
        
        <p className="text-base text-gray-600 text-center mb-9">
          Inicie sesión con su cuenta corporativa
        </p>

        <div className="w-full">
          <Login />
        </div>
      </div>
    </div>
  );
}

// Componente que maneja la redirección inicial
const InitialRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      navigate(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  return <LoadingSpinner />;
};

function App() {
  const [msalInstance, setMsalInstance] = useState(null);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        const instance = new PublicClientApplication(msalConfig);
        
        // Registrar eventos de MSAL
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
        // Aún así establecemos una instancia para permitir el manejo de errores
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
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ticket/:ticketId"
            element={
              <ProtectedRoute>
                <TicketDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </MsalProvider>
  );
}

// Añade la animación de fade-in
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

export default App;
