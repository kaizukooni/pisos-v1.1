from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone
from bson import ObjectId

# Modelo base para respuestas con id como string
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

# Usuario
class UsuarioBase(BaseModel):
    nombre: str
    whatsapp: str
    email: EmailStr
    rol: Literal["admin", "supervisor", "cobros"]
    activo: bool = True

class UsuarioCreate(UsuarioBase):
    contraseña: str

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[EmailStr] = None
    rol: Optional[Literal["admin", "supervisor", "cobros"]] = None
    activo: Optional[bool] = None
    contraseña: Optional[str] = None

class Usuario(UsuarioBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")

# Piso
class PisoBase(BaseModel):
    nombre: str
    direccion: str
    notas: Optional[str] = None
    tiene_servicio_limpieza: bool = False
    importe_limpieza_mensual: Optional[float] = None

class PisoCreate(PisoBase):
    pass

class PisoUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    notas: Optional[str] = None
    tiene_servicio_limpieza: Optional[bool] = None
    importe_limpieza_mensual: Optional[float] = None

class Piso(PisoBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")

# Habitación
class HabitacionBase(BaseModel):
    piso_id: str
    nombre: str
    metros: float
    precio_base: float

class HabitacionCreate(HabitacionBase):
    pass

class HabitacionUpdate(BaseModel):
    nombre: Optional[str] = None
    metros: Optional[float] = None
    precio_base: Optional[float] = None

class Habitacion(HabitacionBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")

# Inquilino
class InquilinoBase(BaseModel):
    nombre: str
    email: EmailStr
    telefono: str
    dni: str
    activo: bool = True

class InquilinoCreate(InquilinoBase):
    pass

class InquilinoUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    dni: Optional[str] = None
    activo: Optional[bool] = None

class Inquilino(InquilinoBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")

# Contrato
class ResultadoLiquidacionFianza(BaseModel):
    estado: Literal["pendiente", "calculada", "devuelta_total", "devuelta_parcial"] = "pendiente"
    importe_a_devolver: Optional[float] = None
    fecha_liquidacion: Optional[datetime] = None

class ContratoBase(BaseModel):
    habitacion_id: str
    inquilino_id: str
    fecha_inicio: datetime
    fecha_fin: datetime
    renta_mensual: float
    fianza: float
    gastos_mensuales_tarifa: float = 50.0
    tiene_limpieza: bool = False
    estado: Literal["activo", "finalizado"] = "activo"
    archivado: bool = False

class ContratoCreate(ContratoBase):
    pass

class ContratoUpdate(BaseModel):
    fecha_fin: Optional[datetime] = None
    renta_mensual: Optional[float] = None
    estado: Optional[Literal["activo", "finalizado"]] = None
    archivado: Optional[bool] = None
    resultado_liquidacion_fianza: Optional[ResultadoLiquidacionFianza] = None

class Contrato(ContratoBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")
    resultado_liquidacion_fianza: ResultadoLiquidacionFianza = Field(default_factory=lambda: ResultadoLiquidacionFianza())

# Pago
class PagoBase(BaseModel):
    contrato_id: str
    mes_anio: str  # Formato: "2025-01"
    fecha_pago: Optional[datetime] = None
    tipo: Literal["alquiler", "gastos", "fianza_cobrada", "fianza_devuelta"]
    importe: float
    metodo: Literal["efectivo", "transferencia"] = "efectivo"
    estado: Literal["pendiente", "en_revision", "pagado", "atrasado"] = "pendiente"
    notas: Optional[str] = None

class PagoCreate(PagoBase):
    creado_por_usuario_id: str

class PagoUpdate(BaseModel):
    fecha_pago: Optional[datetime] = None
    importe: Optional[float] = None
    metodo: Optional[Literal["efectivo", "transferencia", "tarjeta", "otro"]] = None
    estado: Optional[Literal["pendiente", "en_revision", "pagado", "atrasado"]] = None
    revisado_por_usuario_id: Optional[str] = None
    notas: Optional[str] = None

class Pago(PagoBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")
    creado_por_usuario_id: str
    revisado_por_usuario_id: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_ultima_actualizacion: Optional[datetime] = None

# Gasto
class GastoBase(BaseModel):
    contrato_id: str
    fecha: datetime
    concepto: str
    importe: float
    descontar_fianza: bool = False

class GastoCreate(GastoBase):
    pass

class GastoUpdate(BaseModel):
    fecha: Optional[datetime] = None
    concepto: Optional[str] = None
    importe: Optional[float] = None
    descontar_fianza: Optional[bool] = None

class Gasto(GastoBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")

# Ajustes
class DatosEmpresa(BaseModel):
    nombre: Optional[str] = None
    cif_nif: Optional[str] = None
    direccion: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    logo: Optional[str] = None

class SMTPConfig(BaseModel):
    servidor: Optional[str] = None
    puerto: Optional[int] = None
    usuario: Optional[str] = None
    contraseña: Optional[str] = None
    usar_tls: bool = True

class AjustesBase(BaseModel):
    datos_empresa: DatosEmpresa = Field(default_factory=DatosEmpresa)
    smtp_config: SMTPConfig = Field(default_factory=SMTPConfig)
    dia_cobro_por_defecto: int = 5
    gastos_mensuales_tarifa_defecto: float = 50.0

class AjustesUpdate(BaseModel):
    datos_empresa: Optional[DatosEmpresa] = None
    smtp_config: Optional[SMTPConfig] = None
    dia_cobro_por_defecto: Optional[int] = None
    gastos_mensuales_tarifa_defecto: Optional[float] = None

class Ajustes(AjustesBase):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
    id: str = Field(alias="_id")

# Auth
class LoginRequest(BaseModel):
    email: EmailStr
    contraseña: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: Usuario
