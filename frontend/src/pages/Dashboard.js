import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, DoorOpen, Euro, AlertCircle, Calendar, Users } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return <div className="text-gray-600">Cargando...</div>;
  }

  const tarjetas = [
    {
      titulo: 'Total Habitaciones',
      valor: stats?.total_habitaciones || 0,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      titulo: 'Habitaciones Ocupadas',
      valor: stats?.habitaciones_ocupadas || 0,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      titulo: 'Habitaciones Libres',
      valor: stats?.habitaciones_libres || 0,
      icon: DoorOpen,
      color: 'bg-purple-500',
    },
    {
      titulo: 'Ingresos Mes Actual',
      valor: `${stats?.ingresos_mes_actual?.toFixed(2) || '0.00'} €`,
      icon: Euro,
      color: 'bg-emerald-500',
    },
    {
      titulo: 'Pagos Pendientes',
      valor: stats?.pagos_pendientes || 0,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
    {
      titulo: 'Contratos por Vencer (30 días)',
      valor: stats?.contratos_proximos_vencer || 0,
      icon: Calendar,
      color: 'bg-red-500',
    },
  ];

  return (
    <div data-testid="dashboard-page">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tarjetas.map((tarjeta, index) => {
          const Icon = tarjeta.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow" data-testid={`stat-card-${index}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {tarjeta.titulo}
                </CardTitle>
                <div className={`p-2 rounded-lg ${tarjeta.color}`}>
                  <Icon className="text-white" size={20} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900" data-testid={`stat-value-${index}`}>{tarjeta.valor}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
