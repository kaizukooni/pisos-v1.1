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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, CheckCircle, Eye, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Pagos = () => {
  const { usuario } = useAuth();
  const [pagosEnriquecidos, setPagosEnriquecidos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [inquilinos, setInquilinos] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogDetalle, setDialogDetalle] = useState(false);
  const [pagoDetalle, setPagoDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [filtros, setFiltros] = useState({
    estado: 'all',
    tipo: 'all',
    mes_anio: '',
    piso_id: 'all',
    habitacion_id: 'all',
    inquilino_id: 'all'
  });

  const [formData, setFormData] = useState({
    contrato_id: '',
    mes_anio: '',
    importe_alquiler: '',
    importe_gastos: '',
    incluir_gastos: false,
    metodo: 'efectivo',
    fecha_pago: '',
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      const [contratosRes, pisosRes, habitacionesRes, inquilinosRes] = await Promise.all([
        axios.get(`${API}/contratos?estado=activo`),
        axios.get(`${API}/pisos`),
        axios.get(`${API}/habitaciones`),
        axios.get(`${API}/inquilinos`)
      ]);
      
      setContratos(contratosRes.data);
      setPisos(pisosRes.data);
      setHabitaciones(habitacionesRes.data);
      setInquilinos(inquilinosRes.data);
      
      await cargarPagos();
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const cargarPagos = async () => {
    try {
      let url = `${API}/pagos/enriquecidos?`;
      if (filtros.estado && filtros.estado !== 'all') url += `estado=${filtros.estado}&`;
      if (filtros.tipo && filtros.tipo !== 'all') url += `tipo=${filtros.tipo}&`;
      if (filtros.mes_anio) url += `mes_anio=${filtros.mes_anio}&`;
      if (filtros.piso_id && filtros.piso_id !== 'all') url += `piso_id=${filtros.piso_id}&`;
      if (filtros.habitacion_id && filtros.habitacion_id !== 'all') url += `habitacion_id=${filtros.habitacion_id}&`;
      if (filtros.inquilino_id && filtros.inquilino_id !== 'all') url += `inquilino_id=${filtros.inquilino_id}&`;
      
      const response = await axios.get(url);
      setPagosEnriquecidos(response.data);
    } catch (error) {
      toast.error('Error al cargar pagos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const contratoSeleccionado = contratos.find(c => c.id === formData.contrato_id);
      if (!contratoSeleccionado) {
        toast.error('Contrato no encontrado');
        return;
      }

      const datos_base = {
        contrato_id: formData.contrato_id,
        mes_anio: formData.mes_anio,
        fecha_pago: formData.fecha_pago ? new Date(formData.fecha_pago).toISOString() : null,
        metodo: formData.metodo,
        notas: formData.notas,
        creado_por_usuario_id: usuario.id,
        estado: usuario.rol === 'cobros' ? 'en_revision' : 'pendiente'
      };

      // Crear pago de alquiler
      const pago_alquiler = {
        ...datos_base,
        tipo: 'alquiler',
        importe: parseFloat(formData.importe_alquiler || contratoSeleccionado.renta_mensual)
      };
      await axios.post(`${API}/pagos`, pago_alquiler);

      // Si incluye gastos, crear pago de gastos
      if (formData.incluir_gastos) {
        const pago_gastos = {
          ...datos_base,
          tipo: 'gastos',
          importe: parseFloat(formData.importe_gastos || contratoSeleccionado.gastos_mensuales_tarifa)
        };
        await axios.post(`${API}/pagos`, pago_gastos);
        toast.success('Pagos de alquiler y gastos registrados correctamente');
      } else {
        toast.success('Pago de alquiler registrado correctamente');
      }
      
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
      importe_alquiler: '',
      importe_gastos: '',
      incluir_gastos: false,
      metodo: 'efectivo',
      fecha_pago: '',
      notas: ''
    });
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
  };

  const verDetalle = (pagoEnriquecido) => {
    setPagoDetalle(pagoEnriquecido);
    setDialogDetalle(true);
  };

  const handleContratoChange = (contratoId) => {
    const contrato = contratos.find(c => c.id === contratoId);
    if (contrato) {
      setFormData({
        ...formData,
        contrato_id: contratoId,
        importe_alquiler: contrato.renta_mensual.toString(),
        importe_gastos: contrato.gastos_mensuales_tarifa.toString()
      });
    }
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

  // Filtrar habitaciones según el piso seleccionado
  const habitacionesFiltradas = filtros.piso_id && filtros.piso_id !== 'all'
    ? habitaciones.filter(h => h.piso_id === filtros.piso_id)
    : habitaciones;

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
                    <Label>Contrato Activo *</Label>
                    <Select
                      value={formData.contrato_id}
                      onValueChange={handleContratoChange}
                      required
                    >
                      <SelectTrigger data-testid="contrato-select">
                        <SelectValue placeholder="Selecciona un contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        {contratos.map(contrato => {
                          const habitacion = habitaciones.find(h => h.id === contrato.habitacion_id);
                          const piso = pisos.find(p => p.id === habitacion?.piso_id);
                          const inquilino = inquilinos.find(i => i.id === contrato.inquilino_id);
                          return (
                            <SelectItem key={contrato.id} value={contrato.id}>
                              {inquilino?.nombre} - {piso?.nombre} - {habitacion?.nombre}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.contrato_id && (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Alquiler mensual:</span>
                            <span className="font-medium">{formData.importe_alquiler} €</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gastos mensuales:</span>
                            <span className="font-medium">{formData.importe_gastos} €</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="incluir_gastos"
                      checked={formData.incluir_gastos}
                      onCheckedChange={(checked) => setFormData({...formData, incluir_gastos: checked})}
                    />
                    <Label htmlFor="incluir_gastos" className="cursor-pointer">
                      Incluir gastos mensuales en este pago
                    </Label>
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
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fecha_pago">Fecha de pago (opcional)</Label>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Estado:</Label>
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
              <Label>Tipo:</Label>
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
              <Label>Mes:</Label>
              <Input
                type="month"
                value={filtros.mes_anio}
                onChange={(e) => setFiltros({...filtros, mes_anio: e.target.value})}
              />
            </div>
            <div>
              <Label>Piso:</Label>
              <Select value={filtros.piso_id} onValueChange={(value) => setFiltros({...filtros, piso_id: value, habitacion_id: 'all'})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {pisos.map(piso => (
                    <SelectItem key={piso.id} value={piso.id}>{piso.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Habitación:</Label>
              <Select value={filtros.habitacion_id} onValueChange={(value) => setFiltros({...filtros, habitacion_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {habitacionesFiltradas.map(hab => (
                    <SelectItem key={hab.id} value={hab.id}>{hab.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inquilino:</Label>
              <Select value={filtros.inquilino_id} onValueChange={(value) => setFiltros({...filtros, inquilino_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {inquilinos.map(inq => (
                    <SelectItem key={inq.id} value={inq.id}>{inq.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Pagos ({pagosEnriquecidos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes/Año</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagosEnriquecidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No hay pagos registrados
                  </TableCell>
                </TableRow>
              ) : (
                pagosEnriquecidos.map((item) => (
                  <TableRow key={item.pago._id} data-testid={`pago-row-${item.pago._id}`}>
                    <TableCell className="font-medium">{item.pago.mes_anio}</TableCell>
                    <TableCell>{item.piso?.nombre || 'N/A'}</TableCell>
                    <TableCell>{item.habitacion?.nombre || 'N/A'}</TableCell>
                    <TableCell>{item.inquilino?.nombre || 'N/A'}</TableCell>
                    <TableCell className="capitalize">{item.pago.tipo.replace('_', ' ')}</TableCell>
                    <TableCell>{item.pago.importe.toFixed(2)} €</TableCell>
                    <TableCell>
                      <Badge className={obtenerColorEstado(item.pago.estado)}>
                        {item.pago.estado.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verDetalle(item)}
                          data-testid={`ver-detalle-pago-${item.pago._id}`}
                        >
                          <Eye size={16} />
                        </Button>
                        {puedeAprobar && item.pago.estado === 'en_revision' && (
                          <Button
                            size="sm"
                            onClick={() => cambiarEstadoPago(item.pago._id, 'pagado')}
                            data-testid={`aprobar-pago-${item.pago._id}`}
                          >
                            <CheckCircle size={16} className="mr-1" />
                            Aprobar
                          </Button>
                        )}
                        {puedeAprobar && item.pago.estado === 'en_revision' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cambiarEstadoPago(item.pago._id, 'pendiente')}
                          >
                            <X size={16} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de detalle del pago */}
      <Dialog open={dialogDetalle} onOpenChange={setDialogDetalle}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del Pago</DialogTitle>
          </DialogHeader>
          {pagoDetalle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Información del Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Tipo</Label>
                      <p className="font-medium capitalize">{pagoDetalle.pago.tipo.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Importe</Label>
                      <p className="font-medium text-lg">{pagoDetalle.pago.importe.toFixed(2)} €</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Estado</Label>
                      <Badge className={obtenerColorEstado(pagoDetalle.pago.estado)}>
                        {pagoDetalle.pago.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Método</Label>
                      <p className="font-medium capitalize">{pagoDetalle.pago.metodo}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Mes/Año</Label>
                      <p className="font-medium">{pagoDetalle.pago.mes_anio}</p>
                    </div>
                    {pagoDetalle.pago.fecha_pago && (
                      <div>
                        <Label className="text-xs text-gray-600">Fecha de Pago</Label>
                        <p className="font-medium">
                          {format(new Date(pagoDetalle.pago.fecha_pago), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    )}
                    {pagoDetalle.pago.notas && (
                      <div>
                        <Label className="text-xs text-gray-600">Notas</Label>
                        <p className="text-sm">{pagoDetalle.pago.notas}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Ubicación y Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-600">Piso</Label>
                      <p className="font-medium">{pagoDetalle.piso?.nombre || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Habitación</Label>
                      <p className="font-medium">{pagoDetalle.habitacion?.nombre || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Inquilino</Label>
                      <p className="font-medium">{pagoDetalle.inquilino?.nombre || 'N/A'}</p>
                    </div>
                    {pagoDetalle.inquilino && (
                      <>
                        <div>
                          <Label className="text-xs text-gray-600">Email</Label>
                          <p className="text-sm">{pagoDetalle.inquilino.email}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Teléfono</Label>
                          <p className="text-sm">{pagoDetalle.inquilino.telefono}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Trazabilidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600">Registrado por</Label>
                      <p className="font-medium">{pagoDetalle.creado_por_nombre || 'N/A'}</p>
                      {pagoDetalle.pago.fecha_creacion && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(pagoDetalle.pago.fecha_creacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      )}
                    </div>
                    {pagoDetalle.pago.revisado_por_usuario_id && (
                      <div>
                        <Label className="text-xs text-gray-600">Confirmado por</Label>
                        <p className="font-medium">{pagoDetalle.revisado_por_nombre || 'N/A'}</p>
                        {pagoDetalle.pago.fecha_ultima_actualizacion && (
                          <p className="text-xs text-gray-500">
                            {format(new Date(pagoDetalle.pago.fecha_ultima_actualizacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pagos;
