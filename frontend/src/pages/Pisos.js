import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Home, DoorOpen, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Pisos = () => {
  const { usuario } = useAuth();
  const [pisos, setPisos] = useState([]);
  const [vistaDetalle, setVistaDetalle] = useState(false);
  const [pisoDetalle, setPisoDetalle] = useState(null);
  const [habitacionesPiso, setHabitacionesPiso] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogHabitacion, setDialogHabitacion] = useState(false);
  const [dialogDetalleHabitacion, setDialogDetalleHabitacion] = useState(false);
  const [pisoEditar, setPisoEditar] = useState(null);
  const [habitacionEditar, setHabitacionEditar] = useState(null);
  const [habitacionDetalleData, setHabitacionDetalleData] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    notas: '',
    tiene_servicio_limpieza: false,
    importe_limpieza_mensual: ''
  });

  const [formHabitacion, setFormHabitacion] = useState({
    piso_id: '',
    nombre: '',
    metros: '',
    precio_base: ''
  });

  useEffect(() => {
    cargarPisos();
  }, []);

  const cargarPisos = async () => {
    try {
      const response = await axios.get(`${API}/pisos/con-conteo`);
      setPisos(response.data);
    } catch (error) {
      toast.error('Error al cargar pisos');
    }
  };

  const verDetallePiso = async (pisoId) => {
    try {
      const [detalleRes, habitacionesRes] = await Promise.all([
        axios.get(`${API}/pisos/${pisoId}/detalle`),
        axios.get(`${API}/pisos/${pisoId}/habitaciones`)
      ]);
      
      setPisoDetalle(detalleRes.data);
      setHabitacionesPiso(habitacionesRes.data);
      setVistaDetalle(true);
    } catch (error) {
      toast.error('Error al cargar detalle del piso');
    }
  };

  const volverAListado = () => {
    setVistaDetalle(false);
    setPisoDetalle(null);
    setHabitacionesPiso([]);
    cargarPisos();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formData,
        importe_limpieza_mensual: formData.importe_limpieza_mensual ? parseFloat(formData.importe_limpieza_mensual) : null
      };

      if (pisoEditar) {
        await axios.put(`${API}/pisos/${pisoEditar.id}`, datos);
        toast.success('Piso actualizado correctamente');
      } else {
        await axios.post(`${API}/pisos`, datos);
        toast.success('Piso creado correctamente');
      }
      
      cargarPisos();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar piso');
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitHabitacion = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formHabitacion,
        metros: parseFloat(formHabitacion.metros),
        precio_base: parseFloat(formHabitacion.precio_base)
      };

      if (habitacionEditar) {
        const { piso_id, ...datosUpdate } = datos;
        await axios.put(`${API}/habitaciones/${habitacionEditar.id}`, datosUpdate);
        toast.success('Habitación actualizada correctamente');
      } else {
        await axios.post(`${API}/habitaciones`, datos);
        toast.success('Habitación creada correctamente');
      }
      
      // Recargar habitaciones del piso
      if (pisoDetalle) {
        const response = await axios.get(`${API}/pisos/${pisoDetalle.piso.id}/habitaciones`);
        setHabitacionesPiso(response.data);
      }
      cerrarDialogHabitacion();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar habitación');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este piso?')) return;
    
    try {
      await axios.delete(`${API}/pisos/${id}`);
      toast.success('Piso eliminado correctamente');
      cargarPisos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar piso');
    }
  };

  const handleEliminarHabitacion = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta habitación?')) return;
    
    try {
      await axios.delete(`${API}/habitaciones/${id}`);
      toast.success('Habitación eliminada correctamente');
      // Recargar habitaciones del piso
      if (pisoDetalle) {
        const response = await axios.get(`${API}/pisos/${pisoDetalle.piso.id}/habitaciones`);
        setHabitacionesPiso(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar habitación');
    }
  };

  const abrirDialog = (piso = null) => {
    if (piso) {
      setPisoEditar(piso);
      setFormData({
        nombre: piso.nombre,
        direccion: piso.direccion,
        notas: piso.notas || '',
        tiene_servicio_limpieza: piso.tiene_servicio_limpieza,
        importe_limpieza_mensual: piso.importe_limpieza_mensual || ''
      });
    } else {
      setPisoEditar(null);
      setFormData({
        nombre: '',
        direccion: '',
        notas: '',
        tiene_servicio_limpieza: false,
        importe_limpieza_mensual: ''
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setPisoEditar(null);
  };

  const abrirDialogHabitacion = (habitacion = null) => {
    if (habitacion) {
      setHabitacionEditar(habitacion);
      setFormHabitacion({
        piso_id: habitacion.piso_id,
        nombre: habitacion.nombre,
        metros: habitacion.metros.toString(),
        precio_base: habitacion.precio_base.toString()
      });
    } else {
      setHabitacionEditar(null);
      setFormHabitacion({
        piso_id: pisoDetalle?.piso?._id || '',
        nombre: '',
        metros: '',
        precio_base: ''
      });
    }
    setDialogHabitacion(true);
  };

  const cerrarDialogHabitacion = () => {
    setDialogHabitacion(false);
    setHabitacionEditar(null);
  };

  const verDetalleHabitacion = async (habitacionId) => {
    try {
      const response = await axios.get(`${API}/habitaciones/${habitacionId}/detalle`);
      setHabitacionDetalleData(response.data);
      setDialogDetalleHabitacion(true);
    } catch (error) {
      toast.error('Error al cargar detalle de habitación');
    }
  };

  const puedeEditar = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';
  const puedeEliminar = usuario?.rol === 'admin';

  // Vista de listado de pisos
  if (!vistaDetalle) {
    return (
      <div data-testid="pisos-page">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Pisos</h1>
          {puedeEditar && (
            <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
              <DialogTrigger asChild>
                <Button onClick={() => abrirDialog()} data-testid="crear-piso-button">
                  <Plus size={16} className="mr-2" />
                  Nuevo Piso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{pisoEditar ? 'Editar Piso' : 'Nuevo Piso'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        required
                        data-testid="piso-nombre-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="direccion">Dirección *</Label>
                      <Input
                        id="direccion"
                        value={formData.direccion}
                        onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                        required
                        data-testid="piso-direccion-input"
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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="limpieza"
                        checked={formData.tiene_servicio_limpieza}
                        onCheckedChange={(checked) => setFormData({...formData, tiene_servicio_limpieza: checked})}
                      />
                      <Label htmlFor="limpieza" className="cursor-pointer">
                        Tiene servicio de limpieza
                      </Label>
                    </div>
                    {formData.tiene_servicio_limpieza && (
                      <div>
                        <Label htmlFor="importe">Importe mensual limpieza (€)</Label>
                        <Input
                          id="importe"
                          type="number"
                          step="0.01"
                          value={formData.importe_limpieza_mensual}
                          onChange={(e) => setFormData({...formData, importe_limpieza_mensual: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={cerrarDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={cargando} data-testid="guardar-piso-button">
                      {cargando ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Pisos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Habitaciones</TableHead>
                  <TableHead>Ocupación</TableHead>
                  <TableHead>Limpieza</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pisos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">
                      No hay pisos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  pisos.map((item) => (
                    <TableRow key={item.piso._id} data-testid={`piso-row-${item.piso._id}`}>
                      <TableCell className="font-medium">
                        {item.piso.nombre}
                        {item.total_habitaciones > 0 && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({item.total_habitaciones} {item.total_habitaciones === 1 ? 'habitación' : 'habitaciones'})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.piso.direccion}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.total_habitaciones} total</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">
                            <span className="font-medium text-green-600">{item.habitaciones_ocupadas}</span> ocupadas
                          </span>
                          <span className="text-sm">
                            <span className="font-medium text-gray-600">{item.habitaciones_libres}</span> libres
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.piso.tiene_servicio_limpieza ? (
                          <span className="text-green-600">
                            Sí ({item.piso.importe_limpieza_mensual ? `${item.piso.importe_limpieza_mensual}€/mes` : 'Sin importe'})
                          </span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verDetallePiso(item.piso._id)}
                            data-testid={`ver-piso-${item.piso._id}`}
                          >
                            <Eye size={16} />
                          </Button>
                          {puedeEditar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirDialog(item.piso)}
                              data-testid={`editar-piso-${item.piso._id}`}
                            >
                              <Edit size={16} />
                            </Button>
                          )}
                          {puedeEliminar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEliminar(item.piso._id)}
                              data-testid={`eliminar-piso-${item.piso._id}`}
                            >
                              <Trash2 size={16} />
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
      </div>
    );
  }

  // Vista de detalle de piso
  return (
    <div data-testid="piso-detalle-page">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={volverAListado} data-testid="volver-listado">
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{pisoDetalle?.piso?.nombre}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Home size={24} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Habitaciones</p>
                <p className="text-2xl font-bold">{pisoDetalle?.total_habitaciones || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <DoorOpen size={24} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ocupadas</p>
                <p className="text-2xl font-bold text-green-600">{pisoDetalle?.habitaciones_ocupadas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <DoorOpen size={24} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Libres</p>
                <p className="text-2xl font-bold text-gray-600">{pisoDetalle?.habitaciones_libres || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Información del Piso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-600">Dirección</Label>
              <p className="font-medium">{pisoDetalle?.piso?.direccion}</p>
            </div>
            {pisoDetalle?.piso?.notas && (
              <div>
                <Label className="text-gray-600">Notas</Label>
                <p className="text-sm">{pisoDetalle.piso.notas}</p>
              </div>
            )}
            <div>
              <Label className="text-gray-600">Servicio de Limpieza</Label>
              <p className="font-medium">
                {pisoDetalle?.piso?.tiene_servicio_limpieza ? (
                  <span className="text-green-600">
                    Sí ({pisoDetalle.piso.importe_limpieza_mensual ? `${pisoDetalle.piso.importe_limpieza_mensual}€/mes` : 'Sin importe'})
                  </span>
                ) : (
                  <span className="text-gray-400">No</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Habitaciones de este Piso</CardTitle>
            {puedeEditar && (
              <Dialog open={dialogHabitacion} onOpenChange={setDialogHabitacion}>
                <DialogTrigger asChild>
                  <Button onClick={() => abrirDialogHabitacion()} data-testid="crear-habitacion-piso-button">
                    <Plus size={16} className="mr-2" />
                    Añadir Habitación
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{habitacionEditar ? 'Editar Habitación' : 'Nueva Habitación'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitHabitacion}>
                    <div className="space-y-4">
                      <div>
                        <Label>Piso</Label>
                        <Input
                          value={pisoDetalle?.piso?.nombre || ''}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="nombre">Nombre de la habitación *</Label>
                        <Input
                          id="nombre"
                          value={formHabitacion.nombre}
                          onChange={(e) => setFormHabitacion({...formHabitacion, nombre: e.target.value})}
                          placeholder="Ej: Habitación 1"
                          required
                          data-testid="habitacion-nombre-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="metros">Metros cuadrados *</Label>
                        <Input
                          id="metros"
                          type="number"
                          step="0.01"
                          value={formHabitacion.metros}
                          onChange={(e) => setFormHabitacion({...formHabitacion, metros: e.target.value})}
                          required
                          data-testid="habitacion-metros-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="precio">Precio base mensual (€) *</Label>
                        <Input
                          id="precio"
                          type="number"
                          step="0.01"
                          value={formHabitacion.precio_base}
                          onChange={(e) => setFormHabitacion({...formHabitacion, precio_base: e.target.value})}
                          required
                          data-testid="habitacion-precio-input"
                        />
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={cerrarDialogHabitacion}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={cargando} data-testid="guardar-habitacion-button">
                        {cargando ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {habitacionesPiso.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay habitaciones en este piso. ¡Añade la primera!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {habitacionesPiso.map((item) => (
                <Card key={item.habitacion.id} className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg">{item.habitacion.nombre}</h3>
                      {item.ocupada ? (
                        <Badge className="bg-green-100 text-green-800">Ocupada</Badge>
                      ) : (
                        <Badge variant="secondary">Libre</Badge>
                      )}
                    </div>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{item.habitacion.metros} m²</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">{item.habitacion.precio_base.toFixed(2)} €/mes</span>
                      </p>
                      {item.ocupada && item.inquilino_actual && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium text-gray-900">Ocupada por:</p>
                          <p className="text-sm text-gray-700">{item.inquilino_actual.nombre}</p>
                          <p className="text-xs text-gray-500">{item.inquilino_actual.telefono}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => verDetalleHabitacion(item.habitacion.id)}
                      >
                        <Eye size={14} className="mr-1" />
                        Ver
                      </Button>
                      {puedeEditar && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialogHabitacion(item.habitacion)}
                        >
                          <Edit size={14} />
                        </Button>
                      )}
                      {puedeEliminar && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEliminarHabitacion(item.habitacion.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalle de habitación */}
      <Dialog open={dialogDetalleHabitacion} onOpenChange={setDialogDetalleHabitacion}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Habitación</DialogTitle>
          </DialogHeader>
          {habitacionDetalleData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Básica</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Nombre</Label>
                      <p className="font-medium">{habitacionDetalleData.habitacion.nombre}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Piso</Label>
                      <p className="font-medium">{habitacionDetalleData.piso?.nombre}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Metros Cuadrados</Label>
                      <p className="font-medium">{habitacionDetalleData.habitacion.metros} m²</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Precio Base</Label>
                      <p className="font-medium">{habitacionDetalleData.habitacion.precio_base.toFixed(2)} €/mes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {habitacionDetalleData.contrato_activo && habitacionDetalleData.inquilino_actual && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">Contrato Actual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-700">Inquilino</Label>
                        <p className="font-medium text-gray-900">{habitacionDetalleData.inquilino_actual.nombre}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Email</Label>
                        <p className="text-sm text-gray-900">{habitacionDetalleData.inquilino_actual.email}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Teléfono</Label>
                        <p className="text-sm text-gray-900">{habitacionDetalleData.inquilino_actual.telefono}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">DNI</Label>
                        <p className="text-sm text-gray-900">{habitacionDetalleData.inquilino_actual.dni}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Fecha Inicio</Label>
                        <p className="font-medium text-gray-900">
                          {format(new Date(habitacionDetalleData.contrato_activo.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Fecha Fin</Label>
                        <p className="font-medium text-gray-900">
                          {format(new Date(habitacionDetalleData.contrato_activo.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historial de Contratos</CardTitle>
                </CardHeader>
                <CardContent>
                  {habitacionDetalleData.historial_contratos.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay contratos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {habitacionDetalleData.historial_contratos.map((item, index) => (
                        <Card key={index} className="border">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{item.inquilino?.nombre || 'N/A'}</p>
                                <p className="text-sm text-gray-600">{item.inquilino?.email || ''}</p>
                              </div>
                              <Badge variant={item.contrato.estado === 'activo' ? 'default' : 'secondary'}>
                                {item.contrato.estado}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-600">Desde:</span>{' '}
                                <span className="font-medium">
                                  {format(new Date(item.contrato.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Hasta:</span>{' '}
                                <span className="font-medium">
                                  {format(new Date(item.contrato.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Renta:</span>{' '}
                                <span className="font-medium">{item.contrato.renta_mensual.toFixed(2)} €</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Fianza:</span>{' '}
                                <span className="font-medium">{item.contrato.fianza.toFixed(2)} €</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pisos;
