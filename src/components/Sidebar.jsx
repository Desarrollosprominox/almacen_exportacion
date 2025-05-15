import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Home,
  PanelLeftClose, 
  PanelLeftOpen,
  History,
  BarChart2,
  Settings
} from 'lucide-react';

function Sidebar({ onCollapse }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const isActive = (path) => location.pathname === path;

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    if (onCollapse) {
      onCollapse(isCollapsed);
    }
  }, [isCollapsed, onCollapse]);

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/historico', icon: History, label: 'Histórico' },
    { path: '/indicadores', icon: BarChart2, label: 'Indicadores' },
    { path: '/admin', icon: Settings, label: 'Admin' }
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/20 transition-opacity duration-300 ${
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={toggleSidebar}
      />
      <aside 
        className={`${
          isCollapsed ? 'w-16' : 'w-64'
        } fixed inset-y-0 left-0 bg-white border-r border-gray-200 shadow-lg flex flex-col transition-all duration-300 ease-in-out z-50`}
      >
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center px-4 py-4 border-b border-white">
          <div className={`relative flex items-center transition-all duration-300 ${
            isCollapsed ? 'h-8 w-8' : 'h-12 w-32'
          }`}>
            <img
              src="/favicon.svg"
              alt="Logo"
              className={`transition-all duration-300 ${
                isCollapsed ? 'w-8 h-8' : 'w-32 h-12'
              } object-contain`}
            />
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col space-y-4 px-3 py-6 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-3 rounded-md transition-colors ${
                isActive(item.path)
                  ? 'text-white bg-[#003594]'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span 
                className={`ml-3 text-sm font-medium transition-opacity duration-300 ${
                  isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                }`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded-full bg-[#003594] flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {user?.name || 'Usuario'}
                </p>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 z-50 bg-white border border-gray-200 rounded-full p-1.5 text-[#003594] hover:text-[#002b7a] transition-colors shadow-sm"
        style={{
          left: isCollapsed ? '48px' : '240px',
          transition: 'left 300ms ease-in-out'
        }}
      >
        {isCollapsed ? (
          <PanelLeftOpen className="w-4 h-4" />
        ) : (
          <PanelLeftClose className="w-4 h-4" />
        )}
      </button>
    </>
  );
}

export default Sidebar;
