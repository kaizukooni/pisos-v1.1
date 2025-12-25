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
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Habitaciones = () => {
  const { usuario } = useAuth();
  const [habitaciones, setHabitaciones] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogDetalle, setDialogDetalle] = useState(false);
  const [habitacionEditar, setHabitacionEditar] = useState(null);
  const [habitacionDetalle, setHabitacionDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    piso_id: '',
    nombre: '',
    precio_base: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [habitacionesRes, pisosRes] = await Promise.all([
        axios.get(`${API}/habitaciones`),
        axios.get(`${API}/pisos`)
      ]);
      
      // Enriquecer habitaciones con datos del piso y ocupación
      const habitacionesEnriquecidas = await Promise.all(
        habitacionesRes.data.map(async (hab) => {
          const piso = pisosRes.data.find(p => p._id === hab.piso_id);
          
          // Buscar contrato activo
          const contratosRes = await axios.get(`${API}/contratos?habitacion_id=${hab._id}&estado=activo`);
          const contratoActivo = contratosRes.data.length > 0 ? contratosRes.data[0] : null;
          
          let inquilinoActual = null;
          if (contratoActivo) {
            const inquilinoRes = await axios.get(`${API}/inquilinos/${contratoActivo.inquilino_id}`);
            inquilinoActual = inquilinoRes.data;
          }
          
          return {
            ...hab,
            piso_nombre: piso?.nombre || 'N/A',
            ocupada: !!contratoActivo,
            inquilino_actual: inquilinoActual
          };
        })
      );
      
      setHabitaciones(habitacionesEnriquecidas);
      setPisos(pisosRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formData,
        precio_base: parseFloat(formData.precio_base)
      };

      if (habitacionEditar) {
        const { piso_id, ...datosUpdate } = datos;
        await axios.put(`${API}/habitaciones/${habitacionEditar._id}`, datosUpdate);
        toast.success('Habitación actualizada correctamente');
      } else {
        await axios.post(`${API}/habitaciones`, datos);
        toast.success('Habitación creada correctamente');
      }
      
      cargarDatos();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar habitación');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta habitación?')) return;
    
    try {
      await axios.delete(`${API}/habitaciones/${id}`);
      toast.success('Habitación eliminada correctamente');
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar habitación');
    }
  };

  const abrirDialog = (habitacion = null) => {
    if (habitacion) {
      setHabitacionEditar(habitacion);
      setFormData({
        piso_id: habitacion.piso_id,
        nombre: habitacion.nombre,
        precio_base: habitacion.precio_base.toString()
      });
    } else {
      setHabitacionEditar(null);
      setFormData({
        piso_id: '',
        nombre: '',
        precio_base: ''
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setHabitacionEditar(null);
  };

  const verDetalle = async (habitacion) => {
    try {
      const response = await axios.get(`${API}/habitaciones/${habitacion._id}/detalle`);
      setHabitacionDetalle(response.data);
      setDialogDetalle(true);
    } catch (error) {
      toast.error('Error al cargar detalle de habitación');
    }
  };

  const puedeEditar = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';
  const puedeEliminar = usuario?.rol === 'admin';

  return (
    <div data-testid="habitaciones-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Habitaciones</h1>
        {puedeEditar && (
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <DialogTrigger asChild>
              <Button onClick={() => abrirDialog()} data-testid="crear-habitacion-button">
                <Plus size={16} className="mr-2" />
                Nueva Habitación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{habitacionEditar ? 'Editar Habitación' : 'Nueva Habitación'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label>Piso *</Label>
                    <Select
                      value={formData.piso_id}
                      onValueChange={(value) => setFormData({...formData, piso_id: value})}
                      disabled={!!habitacionEditar}
                      required
                    >
                      <SelectTrigger data-testid="piso-select">
                        <SelectValue placeholder="Selecciona un piso" />
                      </SelectTrigger>
                      <SelectContent>
                        {pisos.map(piso => (
                          <SelectItem key={piso._id} value={piso._id}>
                            {piso.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pisos.length === 0 && (
                      <p className="text-sm text-red-500 mt-1">
                        No hay pisos disponibles. Crea un piso primero.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="nombre">Nombre de la habitación *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Ej: Habitación 1, Hab A..."
                      required
                      data-testid="habitacion-nombre-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="precio">Precio base mensual (€) *</Label>
                    <Input
                      id="precio"
                      type="number"
                      step="0.01"
                      value={formData.precio_base}
                      onChange={(e) => setFormData({...formData, precio_base: e.target.value})}
                      placeholder="350.00"
                      required
                      data-testid="habitacion-precio-input"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={cerrarDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={cargando || pisos.length === 0} data-testid="guardar-habitacion-button">
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
          <CardTitle>Listado de Habitaciones ({habitaciones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Precio Base</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {habitaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No hay habitaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                habitaciones.map((habitacion) => (
                  <TableRow key={habitacion._id} data-testid={`habitacion-row-${habitacion._id}`}>
                    <TableCell className="font-medium">{habitacion.nombre}</TableCell>
                    <TableCell>{habitacion.piso_nombre}</TableCell>
                    <TableCell>{habitacion.precio_base.toFixed(2)} €</TableCell>
                    <TableCell>
                      {habitacion.ocupada ? (
                        <div>
                          <Badge className="bg-green-100 text-green-800 mb-1">Ocupada</Badge>
                          {habitacion.inquilino_actual && (
                            <p className="text-sm text-gray-600">
                              por: {habitacion.inquilino_actual.nombre}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">Libre</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verDetalle(habitacion)}
                          data-testid={`ver-habitacion-${habitacion._id}`}
                        >
                          <Eye size={16} />
                        </Button>
                        {puedeEditar && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirDialog(habitacion)}
                            data-testid={`editar-habitacion-${habitacion._id}`}
                          >
                            <Edit size={16} />
                          </Button>
                        )}
                        {puedeEliminar && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEliminar(habitacion._id)}
                            data-testid={`eliminar-habitacion-${habitacion._id}`}
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

      {/* Dialog de detalle de habitación */}
      <Dialog open={dialogDetalle} onOpenChange={setDialogDetalle}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Habitación</DialogTitle>
          </DialogHeader>
          {habitacionDetalle && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Básica</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Nombre</Label>
                      <p className="font-medium">{habitacionDetalle.habitacion.nombre}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Piso</Label>
                      <p className="font-medium">{habitacionDetalle.piso?.nombre}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Precio Base</Label>
                      <p className="font-medium">{habitacionDetalle.habitacion.precio_base.toFixed(2)} €/mes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {habitacionDetalle.contrato_activo && habitacionDetalle.inquilino_actual && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-800">Contrato Actual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-700">Inquilino</Label>
                        <p className="font-medium text-gray-900">{habitacionDetalle.inquilino_actual.nombre}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Email</Label>
                        <p className="text-sm text-gray-900">{habitacionDetalle.inquilino_actual.email}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Teléfono</Label>
                        <p className="text-sm text-gray-900">{habitacionDetalle.inquilino_actual.telefono}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">DNI</Label>
                        <p className="text-sm text-gray-900">{habitacionDetalle.inquilino_actual.dni}</p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Fecha Inicio</Label>
                        <p className="font-medium text-gray-900">
                          {format(new Date(habitacionDetalle.contrato_activo.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-700">Fecha Fin</Label>
                        <p className="font-medium text-gray-900">
                          {format(new Date(habitacionDetalle.contrato_activo.fecha_fin), 'dd/MM/yyyy', { locale: es })}
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
                  {habitacionDetalle.historial_contratos.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay contratos registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {habitacionDetalle.historial_contratos.map((item, index) => (
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

export default Habitaciones;
