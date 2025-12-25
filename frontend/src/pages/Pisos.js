import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Pisos = () => {
  const { usuario } = useAuth();
  const [pisos, setPisos] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [pisoEditar, setPisoEditar] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    notas: '',
    tiene_servicio_limpieza: false,
    importe_limpieza_mensual: ''
  });

  useEffect(() => {
    cargarPisos();
  }, []);

  const cargarPisos = async () => {
    try {
      const response = await axios.get(`${API}/pisos`);
      setPisos(response.data);
    } catch (error) {
      toast.error('Error al cargar pisos');
    }
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

  const puedeEditar = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';
  const puedeEliminar = usuario?.rol === 'admin';

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
                <TableHead>Limpieza</TableHead>
                <TableHead>Notas</TableHead>
                {(puedeEditar || puedeEliminar) && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pisos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No hay pisos registrados
                  </TableCell>
                </TableRow>
              ) : (
                pisos.map((piso) => (
                  <TableRow key={piso.id} data-testid={`piso-row-${piso.id}`}>
                    <TableCell className="font-medium">{piso.nombre}</TableCell>
                    <TableCell>{piso.direccion}</TableCell>
                    <TableCell>
                      {piso.tiene_servicio_limpieza ? (
                        <span className="text-green-600">
                          Sí ({piso.importe_limpieza_mensual ? `${piso.importe_limpieza_mensual}€/mes` : 'Sin importe'})
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">{piso.notas || '-'}</TableCell>
                    {(puedeEditar || puedeEliminar) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {puedeEditar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirDialog(piso)}
                              data-testid={`editar-piso-${piso.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                          )}
                          {puedeEliminar && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEliminar(piso.id)}
                              data-testid={`eliminar-piso-${piso.id}`}
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

export default Pisos;
