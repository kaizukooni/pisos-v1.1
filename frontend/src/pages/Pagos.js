import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Pagos = () => {
  const { usuario } = useAuth();
  const [pagos, setPagos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [filtros, setFiltros] = useState({
    estado: 'all',
    tipo: 'all',
    mes_anio: ''
  });

  const [formData, setFormData] = useState({
    contrato_id: '',
    mes_anio: '',
    tipo: 'alquiler',
    importe: '',
    metodo: 'efectivo',
    fecha_pago: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      const contratosRes = await axios.get(`${API}/contratos?estado=activo`);
      setContratos(contratosRes.data);
      
      await cargarPagos();
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const cargarPagos = async () => {
    try {
      let url = `${API}/pagos?`;
      if (filtros.estado && filtros.estado !== 'all') url += `estado=${filtros.estado}&`;
      if (filtros.tipo && filtros.tipo !== 'all') url += `tipo=${filtros.tipo}&`;
      if (filtros.mes_anio) url += `mes_anio=${filtros.mes_anio}&`;
      
      const response = await axios.get(url);
      setPagos(response.data);
    } catch (error) {
      toast.error('Error al cargar pagos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formData,
        importe: parseFloat(formData.importe),
        fecha_pago: formData.fecha_pago ? new Date(formData.fecha_pago).toISOString() : null,
        creado_por_usuario_id: usuario.id,
        estado: usuario.rol === 'cobros' ? 'en_revision' : 'pendiente'
      };

      await axios.post(`${API}/pagos`, datos);
      toast.success('Pago registrado correctamente');
      
      cargarPagos();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstadoPago = async (pagoId, nuevoEstado) => {
    try {
      await axios.put(`${API}/pagos/${pagoId}`, {
        estado: nuevoEstado,
        revisado_por_usuario_id: usuario.id
      });
      toast.success('Estado del pago actualizado');
      cargarPagos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar estado');
    }
  };

  const abrirDialog = () => {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    
    setFormData({
      contrato_id: '',
      mes_anio: mesActual,
      tipo: 'alquiler',
      importe: '',
      metodo: 'efectivo',
      fecha_pago: '',
      notas: ''
    });
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
  };

  const obtenerNombreContrato = (contratoId) => {
    if (!contratoId) return 'N/A';
    const contrato = contratos.find(c => c.id === contratoId);
    return contrato ? `Contrato ${contratoId.substring(0, 8)}...` : `Contrato ${contratoId.substring(0, 8)}...`;
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      en_revision: 'bg-blue-100 text-blue-800',
      pagado: 'bg-green-100 text-green-800',
      atrasado: 'bg-red-100 text-red-800'
    };
    return colores[estado] || '';
  };

  const puedeCrear = true;
  const puedeAprobar = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';

  return (
    <div data-testid="pagos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
        {puedeCrear && (
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <DialogTrigger asChild>
              <Button onClick={abrirDialog} data-testid="crear-pago-button">
                <Plus size={16} className="mr-2" />
                Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Pago</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label>Contrato *</Label>
                    <Select
                      value={formData.contrato_id}
                      onValueChange={(value) => setFormData({...formData, contrato_id: value})}
                      required
                    >
                      <SelectTrigger data-testid="contrato-select">
                        <SelectValue placeholder="Selecciona un contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        {contratos.map(contrato => (
                          <SelectItem key={contrato.id} value={contrato.id}>
                            {obtenerNombreContrato(contrato.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="mes_anio">Mes/Año (YYYY-MM) *</Label>
                    <Input
                      id="mes_anio"
                      type="month"
                      value={formData.mes_anio}
                      onChange={(e) => setFormData({...formData, mes_anio: e.target.value})}
                      required
                      data-testid="mes-anio-input"
                    />
                  </div>
                  <div>
                    <Label>Tipo *</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({...formData, tipo: value})}
                      required
                    >
                      <SelectTrigger data-testid="tipo-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alquiler">Alquiler</SelectItem>
                        <SelectItem value="gastos">Gastos</SelectItem>
                        <SelectItem value="fianza_cobrada">Fianza Cobrada</SelectItem>
                        <SelectItem value="fianza_devuelta">Fianza Devuelta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="importe">Importe (€) *</Label>
                    <Input
                      id="importe"
                      type="number"
                      step="0.01"
                      value={formData.importe}
                      onChange={(e) => setFormData({...formData, importe: e.target.value})}
                      required
                      data-testid="importe-input"
                    />
                  </div>
                  <div>
                    <Label>Método de pago *</Label>
                    <Select
                      value={formData.metodo}
                      onValueChange={(value) => setFormData({...formData, metodo: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fecha_pago">Fecha de pago</Label>
                    <Input
                      id="fecha_pago"
                      type="date"
                      value={formData.fecha_pago}
                      onChange={(e) => setFormData({...formData, fecha_pago: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notas">Notas</Label>
                    <Input
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={cerrarDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={cargando} data-testid="guardar-pago-button">
                    {cargando ? 'Guardando...' : 'Registrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Filtrar por estado:</Label>
              <Select value={filtros.estado} onValueChange={(value) => setFiltros({...filtros, estado: value})}>
                <SelectTrigger data-testid="filtro-estado-select">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_revision">En Revisión</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filtrar por tipo:</Label>
              <Select value={filtros.tipo} onValueChange={(value) => setFiltros({...filtros, tipo: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="gastos">Gastos</SelectItem>
                  <SelectItem value="fianza_cobrada">Fianza Cobrada</SelectItem>
                  <SelectItem value="fianza_devuelta">Fianza Devuelta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filtrar por mes:</Label>
              <Input
                type="month"
                value={filtros.mes_anio}
                onChange={(e) => setFiltros({...filtros, mes_anio: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Pagos ({pagos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes/Año</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No hay pagos registrados
                  </TableCell>
                </TableRow>
              ) : (
                pagos.map((pago) => (
                  <TableRow key={pago.id} data-testid={`pago-row-${pago.id}`}>
                    <TableCell className="font-medium">{pago.mes_anio}</TableCell>
                    <TableCell className="capitalize">{pago.tipo.replace('_', ' ')}</TableCell>
                    <TableCell>{pago.importe.toFixed(2)} €</TableCell>
                    <TableCell className="capitalize">{pago.metodo}</TableCell>
                    <TableCell>
                      <Badge className={obtenerColorEstado(pago.estado)}>
                        {pago.estado.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pago.fecha_pago ? format(new Date(pago.fecha_pago), 'dd/MM/yyyy', { locale: es }) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {puedeAprobar && pago.estado === 'en_revision' && (
                        <Button
                          size="sm"
                          onClick={() => cambiarEstadoPago(pago.id, 'pagado')}
                          data-testid={`aprobar-pago-${pago.id}`}
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Aprobar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pagos;
