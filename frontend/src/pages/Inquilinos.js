import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Inquilinos = () => {
  const { usuario } = useAuth();
  const [inquilinos, setInquilinos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [inquilinoEditar, setInquilinoEditar] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    dni: '',
    activo: true
  });

  useEffect(() => {
    cargarInquilinos();
  }, []);

  const cargarInquilinos = async () => {
    try {
      const response = await axios.get(`${API}/inquilinos`);
      setInquilinos(response.data);
    } catch (error) {
      toast.error('Error al cargar inquilinos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (inquilinoEditar) {
        await axios.put(`${API}/inquilinos/${inquilinoEditar.id}`, formData);
        toast.success('Inquilino actualizado correctamente');
      } else {
        await axios.post(`${API}/inquilinos`, formData);
        toast.success('Inquilino creado correctamente');
      }
      
      cargarInquilinos();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar inquilino');
    } finally {
      setCargando(false);
    }
  };

  const abrirDialog = (inquilino = null) => {
    if (inquilino) {
      setInquilinoEditar(inquilino);
      setFormData({
        nombre: inquilino.nombre,
        email: inquilino.email,
        telefono: inquilino.telefono,
        dni: inquilino.dni,
        activo: inquilino.activo
      });
    } else {
      setInquilinoEditar(null);
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        dni: '',
        activo: true
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setInquilinoEditar(null);
  };

  const inquilinosFiltrados = inquilinos.filter(inq =>
    inq.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    inq.email.toLowerCase().includes(busqueda.toLowerCase()) ||
    inq.telefono.includes(busqueda) ||
    inq.dni.toLowerCase().includes(busqueda.toLowerCase())
  );

  const puedeEditar = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';

  return (
    <div data-testid="inquilinos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inquilinos</h1>
        {puedeEditar && (
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <DialogTrigger asChild>
              <Button onClick={() => abrirDialog()} data-testid="crear-inquilino-button">
                <Plus size={16} className="mr-2" />
                Nuevo Inquilino
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{inquilinoEditar ? 'Editar Inquilino' : 'Nuevo Inquilino'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      required
                      data-testid="inquilino-nombre-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      data-testid="inquilino-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                      required
                      data-testid="inquilino-telefono-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dni">DNI/NIE *</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData({...formData, dni: e.target.value})}
                      required
                      disabled={!!inquilinoEditar}
                      data-testid="inquilino-dni-input"
                    />
                  </div>
                  {inquilinoEditar && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="activo"
                        checked={formData.activo}
                        onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="activo" className="cursor-pointer">
                        Inquilino activo
                      </Label>
                    </div>
                  )}
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={cerrarDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={cargando} data-testid="guardar-inquilino-button">
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
          <div className="flex items-center gap-2">
            <Search className="text-gray-400" size={20} />
            <Input
              placeholder="Buscar por nombre, email, teléfono o DNI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-md"
              data-testid="buscar-inquilino-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Inquilinos ({inquilinosFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Estado</TableHead>
                {puedeEditar && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquilinosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No hay inquilinos registrados
                  </TableCell>
                </TableRow>
              ) : (
                inquilinosFiltrados.map((inquilino) => (
                  <TableRow key={inquilino.id} data-testid={`inquilino-row-${inquilino.id}`}>
                    <TableCell className="font-medium">{inquilino.nombre}</TableCell>
                    <TableCell>{inquilino.email}</TableCell>
                    <TableCell>{inquilino.telefono}</TableCell>
                    <TableCell>{inquilino.dni}</TableCell>
                    <TableCell>
                      {inquilino.activo ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    {puedeEditar && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialog(inquilino)}
                          data-testid={`editar-inquilino-${inquilino.id}`}
                        >
                          <Edit size={16} />
                        </Button>
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

export default Inquilinos;
