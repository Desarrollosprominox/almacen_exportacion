import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Página de inicio de sesión
 * 
 * Funcionalidades previstas:
 * - Integración con Entra ID
 * - Manejo de sesiones
 * - Redirección post-login
 * - Manejo de errores de autenticación
 */
function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await login();
      navigate('/home');
    } catch (err) {
      console.error('Error durante el login:', err);
      setError('Error al iniciar sesión. Por favor, intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img
            className="mx-auto h-12 w-auto"
            src="/favicon.svg"
            alt="Logo"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Utilice su cuenta corporativa para acceder
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#003594] hover:bg-[#002b7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003594] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : null}
            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión con Microsoft'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login; 