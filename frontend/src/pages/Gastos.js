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
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Gastos = () => {
  const { usuario } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  
  const [formData, setFormData] = useState({
    contrato_id: '',
    fecha: '',
    concepto: '',
    importe: '',
    descontar_fianza: false
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const contratosRes = await axios.get(`${API}/contratos`);
      setContratos(contratosRes.data);
      await cargarGastos();
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const cargarGastos = async () => {
    try {
      const response = await axios.get(`${API}/gastos`);
      setGastos(response.data);
    } catch (error) {
      toast.error('Error al cargar gastos');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      const datos = {
        ...formData,
        fecha: new Date(formData.fecha).toISOString(),
        importe: parseFloat(formData.importe)
      };

      await axios.post(`${API}/gastos`, datos);
      toast.success('Gasto registrado correctamente');
      
      cargarGastos();
      cerrarDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar gasto');
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto?')) return;
    
    try {
      await axios.delete(`${API}/gastos/${id}`);
      toast.success('Gasto eliminado correctamente');
      cargarGastos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar gasto');
    }
  };

  const abrirDialog = () => {
    setFormData({
      contrato_id: '',
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      importe: '',
      descontar_fianza: false
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

  const puedeCrear = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';
  const puedeEliminar = usuario?.rol === 'admin' || usuario?.rol === 'supervisor';

  return (
    <div data-testid="gastos-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
        {puedeCrear && (
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <DialogTrigger asChild>
              <Button onClick={abrirDialog} data-testid="crear-gasto-button">
                <Plus size={16} className="mr-2" />
                Registrar Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
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
                    <Label htmlFor="fecha">Fecha *</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                      required
                      data-testid="fecha-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="concepto">Concepto *</Label>
                    <Input
                      id="concepto"
                      value={formData.concepto}
                      onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                      placeholder="Ej: Reparación lavadora"
                      required
                      data-testid="concepto-input"
                    />
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="descontar_fianza"
                      checked={formData.descontar_fianza}
                      onChange={(e) => setFormData({...formData, descontar_fianza: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="descontar_fianza" className="cursor-pointer">
                      Descontar de la fianza al finalizar contrato
                    </Label>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={cerrarDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={cargando} data-testid="guardar-gasto-button">
                    {cargando ? 'Guardando...' : 'Registrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Gastos ({gastos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Descontar Fianza</TableHead>
                {puedeEliminar && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No hay gastos registrados
                  </TableCell>
                </TableRow>
              ) : (
                gastos.map((gasto) => (
                  <TableRow key={gasto.id} data-testid={`gasto-row-${gasto.id}`}>
                    <TableCell>{format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es })}</TableCell>
                    <TableCell>{obtenerNombreContrato(gasto.contrato_id)}</TableCell>
                    <TableCell className="font-medium">{gasto.concepto}</TableCell>
                    <TableCell>{gasto.importe.toFixed(2)} €</TableCell>
                    <TableCell>
                      {gasto.descontar_fianza ? (
                        <span className="text-red-600 font-medium">Sí</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </TableCell>
                    {puedeEliminar && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEliminar(gasto.id)}
                          data-testid={`eliminar-gasto-${gasto.id}`}
                        >
                          <Trash2 size={16} />
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

export default Gastos;
