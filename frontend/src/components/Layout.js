import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Home, Building2, DoorOpen, Users, FileText, CreditCard, Receipt, UserCog, Settings, LogOut } from 'lucide-react';

const Layout = () => {
  const { usuario, cerrarSesion } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'supervisor', 'cobros'] },
    { path: '/pisos', label: 'Pisos y Habitaciones', icon: Building2, roles: ['admin', 'supervisor', 'cobros'] },
    { path: '/inquilinos', label: 'Inquilinos', icon: Users, roles: ['admin', 'supervisor', 'cobros'] },
    { path: '/contratos', label: 'Contratos', icon: FileText, roles: ['admin', 'supervisor', 'cobros'] },
    { path: '/pagos', label: 'Pagos', icon: CreditCard, roles: ['admin', 'supervisor', 'cobros'] },
    { path: '/gastos', label: 'Gastos', icon: Receipt, roles: ['admin', 'supervisor', 'cobros'] },
    { path: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['admin'] },
    { path: '/ajustes', label: 'Ajustes', icon: Settings, roles: ['admin'] },
  ];

  const menuItemsFiltrados = menuItems.filter(item => 
    item.roles.includes(usuario?.rol)
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Gestión Alquileres</h1>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItemsFiltrados.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.slice(1)}`}
                className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-gray-900">{usuario?.nombre}</p>
            <p className="text-xs text-gray-500 capitalize">{usuario?.rol}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            data-testid="logout-button"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
