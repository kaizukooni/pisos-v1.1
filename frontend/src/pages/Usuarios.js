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
import { Plus, Edit, Trash2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    whatsapp: '',
    email: '',
    contraseña: '',
    rol: 'cobros',
    activo: true
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const response = await axios.get(`${API}/usuarios`);
      setUsuarios(response.data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (usuarioEditar) {
        const datos = { ...formData };
        if (!datos.contraseña) {
          delete datos.contraseña;
        }
        await axios.put(`${API}/usuarios/${usuarioEditar.id}`, datos);
        toast.success('Usuario actualizado correctamente');
      } else {
        await axios.post(`${API}/usuarios`, formData);
        toast.success('Usuario creado correctamente');
      }
      
      cargarUsuarios();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar usuario');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      await axios.delete(`${API}/usuarios/${id}`);
      toast.success('Usuario eliminado correctamente');
      cargarUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const abrirDialog = (usuario = null) => {
    if (usuario) {
      setUsuarioEditar(usuario);
      setFormData({
        nombre: usuario.nombre,
        whatsapp: usuario.whatsapp,
        email: usuario.email,
        contraseña: '',
        rol: usuario.rol,
        activo: usuario.activo
      });
    } else {
      setUsuarioEditar(null);
      setFormData({
        nombre: '',
        whatsapp: '',
        email: '',
        contraseña: '',
        rol: 'cobros',
        activo: true
      });
    }
    setDialogAbierto(true);
  };

  const cerrarDialog = () => {
    setDialogAbierto(false);
    setUsuarioEditar(null);
  };

  const obtenerColorRol = (rol) => {
    const colores = {
      admin: 'bg-purple-100 text-purple-800',
      supervisor: 'bg-blue-100 text-blue-800',
      cobros: 'bg-green-100 text-green-800'
    };
    return colores[rol] || '';
  };

  return (
    <div data-testid="usuarios-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
        <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
          <DialogTrigger asChild>
            <Button onClick={() => abrirDialog()} data-testid="crear-usuario-button">
              <Plus size={16} className="mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{usuarioEditar ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
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
                    data-testid="usuario-nombre-input"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="+34600000000"
                    required
                    data-testid="usuario-whatsapp-input"
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
                    disabled={!!usuarioEditar}
                    data-testid="usuario-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Contraseña {usuarioEditar ? '(dejar vacío para no cambiar)' : '*'}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.contraseña}
                    onChange={(e) => setFormData({...formData, contraseña: e.target.value})}
                    required={!usuarioEditar}
                    data-testid="usuario-password-input"
                  />
                </div>
                <div>
                  <Label>Rol *</Label>
                  <Select
                    value={formData.rol}
                    onValueChange={(value) => setFormData({...formData, rol: value})}
                    required
                  >
                    <SelectTrigger data-testid="usuario-rol-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="cobros">Cobros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="activo" className="cursor-pointer">
                    Usuario activo
                  </Label>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={cerrarDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={cargando} data-testid="guardar-usuario-button">
                  {cargando ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Usuarios ({usuarios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No hay usuarios registrados
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id} data-testid={`usuario-row-${usuario.id}`}>
                    <TableCell className="font-medium">{usuario.nombre}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.whatsapp}</TableCell>
                    <TableCell>
                      <Badge className={obtenerColorRol(usuario.rol)}>
                        {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.activo ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialog(usuario)}
                          data-testid={`editar-usuario-${usuario.id}`}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEliminar(usuario.id)}
                          data-testid={`eliminar-usuario-${usuario.id}`}
                        >
                          <Trash2 size={16} />
                        </Button>
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
};

export default Usuarios;
