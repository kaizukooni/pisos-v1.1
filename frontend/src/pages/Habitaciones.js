import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Habitaciones = () => {
  const { usuario } = useAuth();
  const [habitaciones, setHabitaciones] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [pisoSeleccionado, setPisoSeleccionado] = useState('all');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [habitacionEditar, setHabitacionEditar] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    piso_id: '',
    nombre: '',
    metros: '',
    precio_base: ''
  });

  useEffect(() => {
    cargarPisos();
    cargarHabitaciones();
  }, [pisoSeleccionado]);

  const cargarPisos = async () => {
    try {
      const response = await axios.get(`${API}/pisos`);
      setPisos(response.data);
    } catch (error) {
      toast.error('Error al cargar pisos');
    }
  };

  const cargarHabitaciones = async () => {
    try {
      const url = pisoSeleccionado && pisoSeleccionado !== 'all' ? `${API}/habitaciones?piso_id=${pisoSeleccionado}` : `${API}/habitaciones`;
      const response = await axios.get(url);
      setHabitaciones(response.data);
    } catch (error) {
      toast.error('Error al cargar habitaciones');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formData,
        metros: parseFloat(formData.metros),
        precio_base: parseFloat(formData.precio_base)
      };

      if (habitacionEditar) {
        const { piso_id, ...datosUpdate } = datos;
        await axios.put(`${API}/habitaciones/${habitacionEditar.id}`, datosUpdate);
        toast.success('Habitación actualizada correctamente');
      } else {
        await axios.post(`${API}/habitaciones`, datos);
        toast.success('Habitación creada correctamente');
      }
      
      cargarHabitaciones();
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
      cargarHabitaciones();
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
        metros: habitacion.metros,
        precio_base: habitacion.precio_base
      });
    } else {
      setHabitacionEditar(null);
      setFormData({
        piso_id: pisoSeleccionado && pisoSeleccionado !== 'all' ? pisoSeleccionado : '',
        nombre: '',
        metros: '',
        precio_base: ''
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setHabitacionEditar(null);
  };

  const obtenerNombrePiso = (pisoId) => {
    const piso = pisos.find(p => p.id === pisoId);
    return piso?.nombre || 'N/A';
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
                          <SelectItem key={piso.id} value={piso.id}>{piso.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
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
                      value={formData.metros}
                      onChange={(e) => setFormData({...formData, metros: e.target.value})}
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
                      value={formData.precio_base}
                      onChange={(e) => setFormData({...formData, precio_base: e.target.value})}
                      required
                      data-testid="habitacion-precio-input"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={cerrarDialog}>
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

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filtrar por piso:</Label>
            <Select value={pisoSeleccionado} onValueChange={setPisoSeleccionado}>
              <SelectTrigger className="w-64" data-testid="filtro-piso-select">
                <SelectValue placeholder="Todos los pisos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los pisos</SelectItem>
                {pisos.map(piso => (
                  <SelectItem key={piso.id} value={piso.id}>{piso.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Habitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Piso</TableHead>
                <TableHead>Metros</TableHead>
                <TableHead>Precio Base</TableHead>
                {(puedeEditar || puedeEliminar) && <TableHead className="text-right">Acciones</TableHead>}
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
                  <TableRow key={habitacion.id} data-testid={`habitacion-row-${habitacion.id}`}>
                    <TableCell className="font-medium">{habitacion.nombre}</TableCell>
                    <TableCell>{obtenerNombrePiso(habitacion.piso_id)}</TableCell>
                    <TableCell>{habitacion.metros} m²</TableCell>
                    <TableCell>{habitacion.precio_base.toFixed(2)} €</TableCell>
                    {(puedeEditar || puedeEliminar) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {puedeEditar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirDialog(habitacion)}
                              data-testid={`editar-habitacion-${habitacion.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                          )}
                          {puedeEliminar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEliminar(habitacion.id)}
                              data-testid={`eliminar-habitacion-${habitacion.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
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

export default Habitaciones;
