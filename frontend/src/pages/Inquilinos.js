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
import { Plus, Edit, Search, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Inquilinos = () => {
  const { usuario } = useAuth();
  const [inquilinos, setInquilinos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [dialogDetalle, setDialogDetalle] = useState(false);
  const [inquilinoEditar, setInquilinoEditar] = useState(null);
  const [inquilinoDetalle, setInquilinoDetalle] = useState(null);
  const [contratosInquilino, setContratosInquilino] = useState([]);
  const [pagosInquilino, setPagosInquilino] = useState([]);
  const [pisos, setPisos] = useState([]);
  const [habitaciones, setHabitaciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    dni: '',
    activo: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [inquilinosRes, pisosRes, habitacionesRes] = await Promise.all([
        axios.get(`${API}/inquilinos`),
        axios.get(`${API}/pisos`),
        axios.get(`${API}/habitaciones`)
      ]);
      setInquilinos(inquilinosRes.data);
      setPisos(pisosRes.data);
      setHabitaciones(habitacionesRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
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
      
      cargarDatos();
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

  const verDetalle = async (inquilino) => {
    try {
      // Cargar contratos del inquilino
      const contratosRes = await axios.get(`${API}/contratos?inquilino_id=${inquilino.id}`);
      setContratosInquilino(contratosRes.data);
      
      // Cargar pagos de todos los contratos del inquilino
      const todosLosPagos = [];
      for (const contrato of contratosRes.data) {
        const pagosRes = await axios.get(`${API}/pagos?contrato_id=${contrato.id}`);
        todosLosPagos.push(...pagosRes.data);
      }
      setPagosInquilino(todosLosPagos);
      
      setInquilinoDetalle(inquilino);
      setDialogDetalle(true);
    } catch (error) {
      toast.error('Error al cargar detalles del inquilino');
    }
  };

  const obtenerNombrePiso = (habitacionId) => {
    const habitacion = habitaciones.find(h => h.id === habitacionId);
    if (!habitacion) return 'N/A';
    const piso = pisos.find(p => p.id === habitacion.piso_id);
    return piso?.nombre || 'N/A';
  };

  const obtenerNombreHabitacion = (habitacionId) => {
    const habitacion = habitaciones.find(h => h.id === habitacionId);
    return habitacion?.nombre || 'N/A';
  };

  const calcularDuracionContrato = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const meses = Math.round((fin - inicio) / (1000 * 60 * 60 * 24 * 30));
    return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
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
                <TableHead className="text-right">Acciones</TableHead>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verDetalle(inquilino)}
                          data-testid={`ver-detalle-inquilino-${inquilino.id}`}
                        >
                          <Eye size={16} />
                        </Button>
                        {puedeEditar && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirDialog(inquilino)}
                            data-testid={`editar-inquilino-${inquilino.id}`}
                          >
                            <Edit size={16} />
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

      {/* Dialog de detalle del inquilino */}
      <Dialog open={dialogDetalle} onOpenChange={setDialogDetalle}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Inquilino</DialogTitle>
          </DialogHeader>
          {inquilinoDetalle && (
            <div className="space-y-6">
              {/* Información básica */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Personal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-600">Nombre</Label>
                      <p className="font-medium">{inquilinoDetalle.nombre}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">DNI</Label>
                      <p className="font-medium">{inquilinoDetalle.dni}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Email</Label>
                      <p className="font-medium">{inquilinoDetalle.email}</p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Teléfono</Label>
                      <p className="font-medium">{inquilinoDetalle.telefono}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs para contratos y pagos */}
              <Tabs defaultValue="contratos" className="w-full">
                <TabsList>
                  <TabsTrigger value="contratos">Contratos ({contratosInquilino.length})</TabsTrigger>
                  <TabsTrigger value="pagos">Pagos ({pagosInquilino.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="contratos">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Historial de Contratos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contratosInquilino.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No hay contratos registrados</p>
                      ) : (
                        <div className="space-y-4">
                          {contratosInquilino.map((contrato) => (
                            <Card key={contrato.id} className="border">
                              <CardContent className="pt-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  <div>
                                    <Label className="text-xs text-gray-600">Piso</Label>
                                    <p className="font-medium">{obtenerNombrePiso(contrato.habitacion_id)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Habitación</Label>
                                    <p className="font-medium">{obtenerNombreHabitacion(contrato.habitacion_id)}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Estado</Label>
                                    <p>
                                      {contrato.estado === 'activo' ? (
                                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                                      ) : (
                                        <Badge variant="secondary">Finalizado</Badge>
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Fecha Inicio</Label>
                                    <p className="font-medium">
                                      {format(new Date(contrato.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Fecha Fin</Label>
                                    <p className="font-medium">
                                      {format(new Date(contrato.fecha_fin), 'dd/MM/yyyy', { locale: es })}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Duración</Label>
                                    <p className="font-medium">
                                      {calcularDuracionContrato(contrato.fecha_inicio, contrato.fecha_fin)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Renta Mensual</Label>
                                    <p className="font-medium">{contrato.renta_mensual.toFixed(2)} €</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Gastos Mensuales</Label>
                                    <p className="font-medium">{contrato.gastos_mensuales_tarifa.toFixed(2)} €</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Fianza</Label>
                                    <p className="font-medium">{contrato.fianza.toFixed(2)} €</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pagos">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Historial de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pagosInquilino.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No hay pagos registrados</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Mes/Año</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Importe</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Fecha Pago</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pagosInquilino.map((pago) => (
                              <TableRow key={pago.id}>
                                <TableCell>{pago.mes_anio}</TableCell>
                                <TableCell className="capitalize">{pago.tipo.replace('_', ' ')}</TableCell>
                                <TableCell className="font-medium">{pago.importe.toFixed(2)} €</TableCell>
                                <TableCell>
                                  <Badge className={
                                    pago.estado === 'pagado' ? 'bg-green-100 text-green-800' :
                                    pago.estado === 'en_revision' ? 'bg-blue-100 text-blue-800' :
                                    pago.estado === 'atrasado' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }>
                                    {pago.estado.replace('_', ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {pago.fecha_pago ? format(new Date(pago.fecha_pago), 'dd/MM/yyyy', { locale: es }) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Resumen de pagos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen de Pagos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-gray-600">Total Pagado</Label>
                      <p className="text-2xl font-bold text-green-600">
                        {pagosInquilino
                          .filter(p => p.estado === 'pagado')
                          .reduce((sum, p) => sum + p.importe, 0)
                          .toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Pendiente</Label>
                      <p className="text-2xl font-bold text-yellow-600">
                        {pagosInquilino
                          .filter(p => p.estado === 'pendiente')
                          .reduce((sum, p) => sum + p.importe, 0)
                          .toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">En Revisión</Label>
                      <p className="text-2xl font-bold text-blue-600">
                        {pagosInquilino
                          .filter(p => p.estado === 'en_revision')
                          .reduce((sum, p) => sum + p.importe, 0)
                          .toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-600">Atrasado</Label>
                      <p className="text-2xl font-bold text-red-600">
                        {pagosInquilino
                          .filter(p => p.estado === 'atrasado')
                          .reduce((sum, p) => sum + p.importe, 0)
                          .toFixed(2)} €
                      </p>
                    </div>
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

export default Inquilinos;
