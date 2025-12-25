import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Ajustes = () => {
  const [ajustes, setAjustes] = useState(null);
  const [cargando, setCargando] = useState(false);
  
  const [formEmpresa, setFormEmpresa] = useState({
    nombre: '',
    cif_nif: '',
    direccion: '',
    email: '',
    telefono: '',
    logo: ''
  });

  const [formSMTP, setFormSMTP] = useState({
    servidor: '',
    puerto: 587,
    usuario: '',
    contraseña: '',
    usar_tls: true
  });

  const [formGeneral, setFormGeneral] = useState({
    dia_cobro_por_defecto: 5,
    gastos_mensuales_tarifa_defecto: 50
  });

  useEffect(() => {
    cargarAjustes();
  }, []);

  const cargarAjustes = async () => {
    try {
      const response = await axios.get(`${API}/ajustes`);
      setAjustes(response.data);
      
      if (response.data.datos_empresa) {
        setFormEmpresa({
          nombre: response.data.datos_empresa.nombre || '',
          cif_nif: response.data.datos_empresa.cif_nif || '',
          direccion: response.data.datos_empresa.direccion || '',
          email: response.data.datos_empresa.email || '',
          telefono: response.data.datos_empresa.telefono || '',
          logo: response.data.datos_empresa.logo || ''
        });
      }
      
      if (response.data.smtp_config) {
        setFormSMTP({
          servidor: response.data.smtp_config.servidor || '',
          puerto: response.data.smtp_config.puerto || 587,
          usuario: response.data.smtp_config.usuario || '',
          contraseña: response.data.smtp_config.contraseña || '',
          usar_tls: response.data.smtp_config.usar_tls ?? true
        });
      }
      
      setFormGeneral({
        dia_cobro_por_defecto: response.data.dia_cobro_por_defecto,
        gastos_mensuales_tarifa_defecto: response.data.gastos_mensuales_tarifa_defecto
      });
    } catch (error) {
      toast.error('Error al cargar ajustes');
    }
  };

  const guardarEmpresa = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      await axios.put(`${API}/ajustes`, {
        datos_empresa: formEmpresa
      });
      toast.success('Datos de empresa guardados correctamente');
      cargarAjustes();
    } catch (error) {
      toast.error('Error al guardar datos de empresa');
    } finally {
      setCargando(false);
    }
  };

  const guardarSMTP = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      await axios.put(`${API}/ajustes`, {
        smtp_config: {
          ...formSMTP,
          puerto: parseInt(formSMTP.puerto)
        }
      });
      toast.success('Configuración SMTP guardada correctamente');
      cargarAjustes();
    } catch (error) {
      toast.error('Error al guardar configuración SMTP');
    } finally {
      setCargando(false);
    }
  };

  const guardarGeneral = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      await axios.put(`${API}/ajustes`, {
        dia_cobro_por_defecto: parseInt(formGeneral.dia_cobro_por_defecto),
        gastos_mensuales_tarifa_defecto: parseFloat(formGeneral.gastos_mensuales_tarifa_defecto)
      });
      toast.success('Ajustes generales guardados correctamente');
      cargarAjustes();
    } catch (error) {
      toast.error('Error al guardar ajustes generales');
    } finally {
      setCargando(false);
    }
  };

  if (!ajustes) {
    return <div className="text-gray-600">Cargando...</div>;
  }

  return (
    <div data-testid="ajustes-page">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Ajustes</h1>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="empresa">Datos de Empresa</TabsTrigger>
          <TabsTrigger value="smtp">Configuración SMTP</TabsTrigger>
          <TabsTrigger value="general">Ajustes Generales</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={guardarEmpresa} className="space-y-4">
                <div>
                  <Label htmlFor="nombre_empresa">Nombre de la empresa</Label>
                  <Input
                    id="nombre_empresa"
                    value={formEmpresa.nombre}
                    onChange={(e) => setFormEmpresa({...formEmpresa, nombre: e.target.value})}
                    data-testid="empresa-nombre-input"
                  />
                </div>
                <div>
                  <Label htmlFor="cif">CIF/NIF</Label>
                  <Input
                    id="cif"
                    value={formEmpresa.cif_nif}
                    onChange={(e) => setFormEmpresa({...formEmpresa, cif_nif: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="direccion_empresa">Dirección</Label>
                  <Input
                    id="direccion_empresa"
                    value={formEmpresa.direccion}
                    onChange={(e) => setFormEmpresa({...formEmpresa, direccion: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email_empresa">Email</Label>
                  <Input
                    id="email_empresa"
                    type="email"
                    value={formEmpresa.email}
                    onChange={(e) => setFormEmpresa({...formEmpresa, email: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="telefono_empresa">Teléfono</Label>
                  <Input
                    id="telefono_empresa"
                    value={formEmpresa.telefono}
                    onChange={(e) => setFormEmpresa({...formEmpresa, telefono: e.target.value})}
                  />
                </div>
                <Button type="submit" disabled={cargando} data-testid="guardar-empresa-button">
                  <Save size={16} className="mr-2" />
                  {cargando ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle>Configuración SMTP para Envío de Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={guardarSMTP} className="space-y-4">
                <div>
                  <Label htmlFor="servidor">Servidor SMTP</Label>
                  <Input
                    id="servidor"
                    value={formSMTP.servidor}
                    onChange={(e) => setFormSMTP({...formSMTP, servidor: e.target.value})}
                    placeholder="smtp.gmail.com"
                    data-testid="smtp-servidor-input"
                  />
                </div>
                <div>
                  <Label htmlFor="puerto">Puerto</Label>
                  <Input
                    id="puerto"
                    type="number"
                    value={formSMTP.puerto}
                    onChange={(e) => setFormSMTP({...formSMTP, puerto: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="usuario_smtp">Usuario</Label>
                  <Input
                    id="usuario_smtp"
                    value={formSMTP.usuario}
                    onChange={(e) => setFormSMTP({...formSMTP, usuario: e.target.value})}
                    placeholder="tu-email@gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password_smtp">Contraseña</Label>
                  <Input
                    id="password_smtp"
                    type="password"
                    value={formSMTP.contraseña}
                    onChange={(e) => setFormSMTP({...formSMTP, contraseña: e.target.value})}
                    placeholder="Contraseña o App Password"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="usar_tls"
                    checked={formSMTP.usar_tls}
                    onChange={(e) => setFormSMTP({...formSMTP, usar_tls: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="usar_tls" className="cursor-pointer">
                    Usar TLS
                  </Label>
                </div>
                <Button type="submit" disabled={cargando} data-testid="guardar-smtp-button">
                  <Save size={16} className="mr-2" />
                  {cargando ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Ajustes Generales del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={guardarGeneral} className="space-y-4">
                <div>
                  <Label htmlFor="dia_cobro">Día de cobro por defecto (1-31)</Label>
                  <Input
                    id="dia_cobro"
                    type="number"
                    min="1"
                    max="31"
                    value={formGeneral.dia_cobro_por_defecto}
                    onChange={(e) => setFormGeneral({...formGeneral, dia_cobro_por_defecto: e.target.value})}
                    data-testid="dia-cobro-input"
                  />
                </div>
                <div>
                  <Label htmlFor="gastos_defecto">Tarifa de gastos mensuales por defecto (€)</Label>
                  <Input
                    id="gastos_defecto"
                    type="number"
                    step="0.01"
                    value={formGeneral.gastos_mensuales_tarifa_defecto}
                    onChange={(e) => setFormGeneral({...formGeneral, gastos_mensuales_tarifa_defecto: e.target.value})}
                    data-testid="gastos-defecto-input"
                  />
                </div>
                <Button type="submit" disabled={cargando} data-testid="guardar-general-button">
                  <Save size={16} className="mr-2" />
                  {cargando ? 'Guardando...' : 'Guardar Ajustes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ajustes;
