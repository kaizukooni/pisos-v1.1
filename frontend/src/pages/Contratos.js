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
import { Plus, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Contratos = () => {
  const { usuario } = useAuth();
  const [contratos, setContratos] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [inquilinos, setInquilinos] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogDetalle, setDialogDetalle] = useState(false);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [filtros, setFiltros] = useState({
    estado: 'all'
  });

  const [formData, setFormData] = useState({
    habitacion_id: '',
    inquilino_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    renta_mensual: '',
    fianza: '',
    gastos_mensuales_tarifa: '50',
    tiene_limpieza: false
  });

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    try {
      const [pisosRes, habitacionesRes, inquilinosRes] = await Promise.all([
        axios.get(`${API}/pisos`),
        axios.get(`${API}/habitaciones`),
        axios.get(`${API}/inquilinos`)
      ]);
      
      setPisos(pisosRes.data);
      setHabitaciones(habitacionesRes.data);
      setInquilinos(inquilinosRes.data);
      
      await cargarContratos();
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const cargarContratos = async () => {
    try {
      let url = `${API}/contratos`;
      if (filtros.estado) {
        url += `?estado=${filtros.estado}`;
      }
      const response = await axios.get(url);
      setContratos(response.data);
    } catch (error) {
      toast.error('Error al cargar contratos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formData,
        fecha_inicio: new Date(formData.fecha_inicio).toISOString(),
        fecha_fin: new Date(formData.fecha_fin).toISOString(),
        renta_mensual: parseFloat(formData.renta_mensual),
        fianza: parseFloat(formData.fianza),
        gastos_mensuales_tarifa: parseFloat(formData.gastos_mensuales_tarifa)
      };

      await axios.post(`${API}/contratos`, datos);
      toast.success('Contrato creado correctamente');
      
      cargarContratos();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear contrato');
    } finally {
      setCargando(false);
    }
  };

  const abrirDialog = () => {
    setFormData({
      habitacion_id: '',
      inquilino_id: '',
      fecha_inicio: '',
      fecha_fin: '',
      renta_mensual: '',
      fianza: '',
      gastos_mensuales_tarifa: '50',
      tiene_limpieza: false
    });
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
  };

  const verDetalle = (contrato) => {
    setContratoSeleccionado(contrato);
    setDialogDetalle(true);
  };

  const obtenerNombreHabitacion = (habitacionId) => {
    const habitacion = habitaciones.find(h => h.id === habitacionId);
    if (!habitacion) return 'N/A';
    const piso = pisos.find(p => p.id === habitacion.piso_id);
    return `${piso?.nombre || 'N/A'} - ${habitacion.nombre}`;
  };

  const obtenerNombreInquilino = (inquilinoId) => {
    const inquilino = inquilinos.find(i => i.id === inquilinoId);
    return inquilino?.nombre || 'N/A';
  };

  const puedeCrear = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';

  return (
    <div data-testid="contratos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
        {puedeCrear && (
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <DialogTrigger asChild>
              <Button onClick={abrirDialog} data-testid="crear-contrato-button">
                <Plus size={16} className="mr-2" />
                Nuevo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Contrato</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Habitación *</Label>
                    <Select
                      value={formData.habitacion_id}
                      onValueChange={(value) => setFormData({...formData, habitacion_id: value})}
                      required
                    >
                      <SelectTrigger data-testid="habitacion-select">
                        <SelectValue placeholder="Selecciona una habitación" />
                      </SelectTrigger>
                      <SelectContent>
                        {habitaciones.map(hab => {
                          const piso = pisos.find(p => p.id === hab.piso_id);
                          return (
                            <SelectItem key={hab.id} value={hab.id}>
                              {piso?.nombre} - {hab.nombre} ({hab.precio_base}€)
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Inquilino *</Label>
                    <Select
                      value={formData.inquilino_id}
                      onValueChange={(value) => setFormData({...formData, inquilino_id: value})}
                      required
                    >
                      <SelectTrigger data-testid="inquilino-select">
                        <SelectValue placeholder="Selecciona un inquilino" />
                      </SelectTrigger>
                      <SelectContent>
                        {inquilinos.filter(i => i.activo).map(inq => (
                          <SelectItem key={inq.id} value={inq.id}>
                            {inq.nombre} - {inq.dni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="fecha_inicio">Fecha inicio *</Label>
                    <Input
                      id="fecha_inicio"
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                      required
                      data-testid="fecha-inicio-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fecha_fin">Fecha fin *</Label>
                    <Input
                      id="fecha_fin"
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                      required
                      data-testid="fecha-fin-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="renta">Renta mensual (€) *</Label>
                    <Input
                      id="renta"
                      type="number"
                      step="0.01"
                      value={formData.renta_mensual}
                      onChange={(e) => setFormData({...formData, renta_mensual: e.target.value})}
                      required
                      data-testid="renta-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fianza">Fianza (€) *</Label>
                    <Input
                      id="fianza"
                      type="number"
                      step="0.01"
                      value={formData.fianza}
                      onChange={(e) => setFormData({...formData, fianza: e.target.value})}
                      required
                      data-testid="fianza-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gastos">Gastos mensuales (€) *</Label>
                    <Input
                      id="gastos"
                      type="number"
                      step="0.01"
                      value={formData.gastos_mensuales_tarifa}
                      onChange={(e) => setFormData({...formData, gastos_mensuales_tarifa: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="limpieza"
                      checked={formData.tiene_limpieza}
                      onChange={(e) => setFormData({...formData, tiene_limpieza: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="limpieza" className="cursor-pointer">
                      Incluye limpieza
                    </Label>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={cerrarDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={cargando} data-testid="guardar-contrato-button">
                    {cargando ? 'Guardando...' : 'Crear Contrato'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filtrar por estado:</Label>
            <Select value={filtros.estado} onValueChange={(value) => setFiltros({...filtros, estado: value})}>
              <SelectTrigger className="w-48" data-testid="filtro-estado-select">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="finalizado">Finalizados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Contratos ({contratos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inquilino</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Fecha Fin</TableHead>
                <TableHead>Renta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No hay contratos registrados
                  </TableCell>
                </TableRow>
              ) : (
                contratos.map((contrato) => (
                  <TableRow key={contrato.id} data-testid={`contrato-row-${contrato.id}`}>
                    <TableCell className="font-medium">{obtenerNombreInquilino(contrato.inquilino_id)}</TableCell>
                    <TableCell>{obtenerNombreHabitacion(contrato.habitacion_id)}</TableCell>
                    <TableCell>{format(new Date(contrato.fecha_inicio), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>{format(new Date(contrato.fecha_fin), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>{contrato.renta_mensual.toFixed(2)} €</TableCell>
                    <TableCell>
                      {contrato.estado === 'activo' ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Finalizado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verDetalle(contrato)}
                        data-testid={`ver-contrato-${contrato.id}`}
                      >
                        <Eye size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de detalle */}
      <Dialog open={dialogDetalle} onOpenChange={setDialogDetalle}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Contrato</DialogTitle>
          </DialogHeader>
          {contratoSeleccionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Inquilino</Label>
                  <p className="font-medium">{obtenerNombreInquilino(contratoSeleccionado.inquilino_id)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Habitación</Label>
                  <p className="font-medium">{obtenerNombreHabitacion(contratoSeleccionado.habitacion_id)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Fecha Inicio</Label>
                  <p className="font-medium">{format(new Date(contratoSeleccionado.fecha_inicio), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Fecha Fin</Label>
                  <p className="font-medium">{format(new Date(contratoSeleccionado.fecha_fin), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Renta Mensual</Label>
                  <p className="font-medium">{contratoSeleccionado.renta_mensual.toFixed(2)} €</p>
                </div>
                <div>
                  <Label className="text-gray-600">Fianza</Label>
                  <p className="font-medium">{contratoSeleccionado.fianza.toFixed(2)} €</p>
                </div>
                <div>
                  <Label className="text-gray-600">Gastos Mensuales</Label>
                  <p className="font-medium">{contratoSeleccionado.gastos_mensuales_tarifa.toFixed(2)} €</p>
                </div>
                <div>
                  <Label className="text-gray-600">Estado</Label>
                  <p className="font-medium capitalize">{contratoSeleccionado.estado}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contratos;
