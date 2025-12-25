from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Optional

from models import (
    Usuario, UsuarioCreate, UsuarioUpdate,
    Piso, PisoCreate, PisoUpdate,
    Habitacion, HabitacionCreate, HabitacionUpdate,
    Inquilino, InquilinoCreate, InquilinoUpdate,
    Contrato, ContratoCreate, ContratoUpdate,
    Pago, PagoCreate, PagoUpdate,
    Gasto, GastoCreate, GastoUpdate,
    Ajustes, AjustesUpdate,
    LoginRequest, LoginResponse
)
from auth import (
    crear_access_token, verificar_contraseña, obtener_hash_contraseña,
    obtener_usuario_actual, verificar_rol
)
from database import (
    usuarios_collection, pisos_collection, habitaciones_collection,
    inquilinos_collection, contratos_collection, pagos_collection,
    gastos_collection, ajustes_collection, cerrar_conexion
)

# Inicialización de datos
async def inicializar_datos():
    """Crea usuario admin por defecto si no existe"""
    admin_existente = await usuarios_collection.find_one({"email": "admin@admin.com"})
    if not admin_existente:
        admin = {
            "_id": str(ObjectId()),
            "nombre": "Administrador",
            "whatsapp": "+34600000000",
            "email": "admin@admin.com",
            "contraseña_hash": obtener_hash_contraseña("Admin123"),
            "rol": "admin",
            "activo": True
        }
        await usuarios_collection.insert_one(admin)
        print("✓ Usuario admin creado: admin@admin.com / Admin123")
    
    # Crear ajustes por defecto si no existen
    ajustes_existentes = await ajustes_collection.find_one({})
    if not ajustes_existentes:
        ajustes_defecto = {
            "_id": str(ObjectId()),
            "datos_empresa": {},
            "smtp_config": {},
            "dia_cobro_por_defecto": 5,
            "gastos_mensuales_tarifa_defecto": 50.0
        }
        await ajustes_collection.insert_one(ajustes_defecto)
        print("✓ Ajustes por defecto creados")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await inicializar_datos()
    yield
    # Shutdown
    await cerrar_conexion()

app = FastAPI(title="Sistema de Gestión de Alquileres", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= AUTH =============
@app.post("/api/auth/login", response_model=LoginResponse)
async def login(datos: LoginRequest):
    """Login de usuario"""
    usuario_db = await usuarios_collection.find_one({"email": datos.email}, {"_id": 1, "nombre": 1, "email": 1, "whatsapp": 1, "rol": 1, "activo": 1, "contraseña_hash": 1})
    
    if not usuario_db:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    if not usuario_db.get("activo"):
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    
    if not verificar_contraseña(datos.contraseña, usuario_db["contraseña_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    # Crear token
    token_data = {
        "sub": usuario_db["_id"],
        "email": usuario_db["email"],
        "rol": usuario_db["rol"]
    }
    access_token = crear_access_token(token_data)
    
    # Preparar usuario sin contraseña
    del usuario_db["contraseña_hash"]
    
    return LoginResponse(
        access_token=access_token,
        usuario=Usuario(**usuario_db)
    )

@app.get("/api/auth/me", response_model=Usuario)
async def obtener_perfil(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene el perfil del usuario actual"""
    usuario_db = await usuarios_collection.find_one({"_id": usuario_actual["sub"]}, {"_id": 1, "nombre": 1, "email": 1, "whatsapp": 1, "rol": 1, "activo": 1})
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return Usuario(**usuario_db)

# ============= USUARIOS (solo admin) =============
@app.get("/api/usuarios", response_model=List[Usuario])
async def listar_usuarios(usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Lista todos los usuarios"""
    usuarios = await usuarios_collection.find({}, {"contraseña_hash": 0}).to_list(1000)
    return [Usuario(**u) for u in usuarios]

@app.post("/api/usuarios", response_model=Usuario, status_code=status.HTTP_201_CREATED)
async def crear_usuario(datos: UsuarioCreate, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Crea un nuevo usuario"""
    # Verificar si el email ya existe
    existente = await usuarios_collection.find_one({"email": datos.email})
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    usuario_dict = datos.model_dump()
    contraseña = usuario_dict.pop("contraseña")
    usuario_dict["contraseña_hash"] = obtener_hash_contraseña(contraseña)
    usuario_dict["_id"] = str(ObjectId())
    
    await usuarios_collection.insert_one(usuario_dict)
    del usuario_dict["contraseña_hash"]
    return Usuario(**usuario_dict)

@app.get("/api/usuarios/{usuario_id}", response_model=Usuario)
async def obtener_usuario(usuario_id: str, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Obtiene un usuario por ID"""
    usuario = await usuarios_collection.find_one({"_id": usuario_id}, {"contraseña_hash": 0})
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return Usuario(**usuario)

@app.put("/api/usuarios/{usuario_id}", response_model=Usuario)
async def actualizar_usuario(usuario_id: str, datos: UsuarioUpdate, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Actualiza un usuario"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    
    if "contraseña" in update_data:
        contraseña = update_data.pop("contraseña")
        update_data["contraseña_hash"] = obtener_hash_contraseña(contraseña)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    resultado = await usuarios_collection.update_one(
        {"_id": usuario_id},
        {"$set": update_data}
    )
    
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario = await usuarios_collection.find_one({"_id": usuario_id}, {"contraseña_hash": 0})
    return Usuario(**usuario)

@app.delete("/api/usuarios/{usuario_id}")
async def eliminar_usuario(usuario_id: str, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Elimina un usuario"""
    if usuario_id == usuario_actual["sub"]:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propio usuario")
    
    resultado = await usuarios_collection.delete_one({"_id": usuario_id})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"mensaje": "Usuario eliminado correctamente"}

# ============= PISOS =============
@app.get("/api/pisos", response_model=List[Piso])
async def listar_pisos(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Lista todos los pisos"""
    pisos = await pisos_collection.find({}).to_list(1000)
    return [Piso(**p) for p in pisos]

@app.post("/api/pisos", response_model=Piso, status_code=status.HTTP_201_CREATED)
async def crear_piso(datos: PisoCreate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Crea un nuevo piso"""
    piso_dict = datos.model_dump()
    piso_dict["_id"] = str(ObjectId())
    await pisos_collection.insert_one(piso_dict)
    return Piso(**piso_dict)

@app.get("/api/pisos/{piso_id}", response_model=Piso)
async def obtener_piso(piso_id: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene un piso por ID"""
    piso = await pisos_collection.find_one({"_id": piso_id})
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    return Piso(**piso)

@app.put("/api/pisos/{piso_id}", response_model=Piso)
async def actualizar_piso(piso_id: str, datos: PisoUpdate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Actualiza un piso"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    resultado = await pisos_collection.update_one({"_id": piso_id}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    
    piso = await pisos_collection.find_one({"_id": piso_id})
    return Piso(**piso)

@app.delete("/api/pisos/{piso_id}")
async def eliminar_piso(piso_id: str, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Elimina un piso"""
    # Verificar que no tenga habitaciones
    habitaciones = await habitaciones_collection.find_one({"piso_id": piso_id})
    if habitaciones:
        raise HTTPException(status_code=400, detail="No se puede eliminar un piso con habitaciones")
    
    resultado = await pisos_collection.delete_one({"_id": piso_id})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    return {"mensaje": "Piso eliminado correctamente"}

# ============= HABITACIONES =============
@app.get("/api/habitaciones", response_model=List[Habitacion])
async def listar_habitaciones(
    piso_id: Optional[str] = Query(None),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Lista todas las habitaciones o filtra por piso"""
    filtro = {"piso_id": piso_id} if piso_id else {}
    habitaciones = await habitaciones_collection.find(filtro).to_list(1000)
    return [Habitacion(**h) for h in habitaciones]

@app.post("/api/habitaciones", response_model=Habitacion, status_code=status.HTTP_201_CREATED)
async def crear_habitacion(datos: HabitacionCreate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Crea una nueva habitación"""
    # Verificar que el piso existe
    piso = await pisos_collection.find_one({"_id": datos.piso_id})
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    
    habitacion_dict = datos.model_dump()
    habitacion_dict["_id"] = str(ObjectId())
    await habitaciones_collection.insert_one(habitacion_dict)
    return Habitacion(**habitacion_dict)

@app.get("/api/habitaciones/{habitacion_id}", response_model=Habitacion)
async def obtener_habitacion(habitacion_id: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene una habitación por ID"""
    habitacion = await habitaciones_collection.find_one({"_id": habitacion_id})
    if not habitacion:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    return Habitacion(**habitacion)

@app.put("/api/habitaciones/{habitacion_id}", response_model=Habitacion)
async def actualizar_habitacion(habitacion_id: str, datos: HabitacionUpdate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Actualiza una habitación"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    resultado = await habitaciones_collection.update_one({"_id": habitacion_id}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    
    habitacion = await habitaciones_collection.find_one({"_id": habitacion_id})
    return Habitacion(**habitacion)

@app.delete("/api/habitaciones/{habitacion_id}")
async def eliminar_habitacion(habitacion_id: str, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Elimina una habitación"""
    # Verificar que no tenga contratos
    contratos = await contratos_collection.find_one({"habitacion_id": habitacion_id})
    if contratos:
        raise HTTPException(status_code=400, detail="No se puede eliminar una habitación con contratos")
    
    resultado = await habitaciones_collection.delete_one({"_id": habitacion_id})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    return {"mensaje": "Habitación eliminada correctamente"}

# ============= INQUILINOS =============
@app.get("/api/inquilinos", response_model=List[Inquilino])
async def listar_inquilinos(
    busqueda: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Lista todos los inquilinos con búsqueda opcional"""
    filtro = {}
    if activo is not None:
        filtro["activo"] = activo
    if busqueda:
        filtro["$or"] = [
            {"nombre": {"$regex": busqueda, "$options": "i"}},
            {"email": {"$regex": busqueda, "$options": "i"}},
            {"telefono": {"$regex": busqueda, "$options": "i"}},
            {"dni": {"$regex": busqueda, "$options": "i"}}
        ]
    
    inquilinos = await inquilinos_collection.find(filtro).to_list(1000)
    return [Inquilino(**i) for i in inquilinos]

@app.post("/api/inquilinos", response_model=Inquilino, status_code=status.HTTP_201_CREATED)
async def crear_inquilino(datos: InquilinoCreate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Crea un nuevo inquilino"""
    # Verificar DNI único
    existente = await inquilinos_collection.find_one({"dni": datos.dni})
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un inquilino con ese DNI")
    
    inquilino_dict = datos.model_dump()
    inquilino_dict["_id"] = str(ObjectId())
    await inquilinos_collection.insert_one(inquilino_dict)
    return Inquilino(**inquilino_dict)

@app.get("/api/inquilinos/{inquilino_id}", response_model=Inquilino)
async def obtener_inquilino(inquilino_id: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene un inquilino por ID"""
    inquilino = await inquilinos_collection.find_one({"_id": inquilino_id})
    if not inquilino:
        raise HTTPException(status_code=404, detail="Inquilino no encontrado")
    return Inquilino(**inquilino)

@app.put("/api/inquilinos/{inquilino_id}", response_model=Inquilino)
async def actualizar_inquilino(inquilino_id: str, datos: InquilinoUpdate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Actualiza un inquilino"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    resultado = await inquilinos_collection.update_one({"_id": inquilino_id}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquilino no encontrado")
    
    inquilino = await inquilinos_collection.find_one({"_id": inquilino_id})
    return Inquilino(**inquilino)

# ============= CONTRATOS =============
@app.get("/api/contratos", response_model=List[Contrato])
async def listar_contratos(
    piso_id: Optional[str] = Query(None),
    habitacion_id: Optional[str] = Query(None),
    inquilino_id: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Lista todos los contratos con filtros opcionales"""
    filtro = {}
    if piso_id:
        # Obtener habitaciones del piso
        habitaciones = await habitaciones_collection.find({"piso_id": piso_id}).to_list(1000)
        habitaciones_ids = [h["_id"] for h in habitaciones]
        filtro["habitacion_id"] = {"$in": habitaciones_ids}
    if habitacion_id:
        filtro["habitacion_id"] = habitacion_id
    if inquilino_id:
        filtro["inquilino_id"] = inquilino_id
    if estado:
        filtro["estado"] = estado
    
    contratos = await contratos_collection.find(filtro).to_list(1000)
    return [Contrato(**c) for c in contratos]

@app.post("/api/contratos", response_model=Contrato, status_code=status.HTTP_201_CREATED)
async def crear_contrato(datos: ContratoCreate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Crea un nuevo contrato"""
    # Verificar que habitación e inquilino existen
    habitacion = await habitaciones_collection.find_one({"_id": datos.habitacion_id})
    if not habitacion:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    
    inquilino = await inquilinos_collection.find_one({"_id": datos.inquilino_id})
    if not inquilino:
        raise HTTPException(status_code=404, detail="Inquilino no encontrado")
    
    # Verificar que no haya contrato activo en esa habitación
    contrato_activo = await contratos_collection.find_one({
        "habitacion_id": datos.habitacion_id,
        "estado": "activo"
    })
    if contrato_activo:
        raise HTTPException(status_code=400, detail="Ya existe un contrato activo en esta habitación")
    
    contrato_dict = datos.model_dump()
    contrato_dict["_id"] = str(ObjectId())
    contrato_dict["resultado_liquidacion_fianza"] = {
        "estado": "pendiente",
        "importe_a_devolver": None,
        "fecha_liquidacion": None
    }
    await contratos_collection.insert_one(contrato_dict)
    return Contrato(**contrato_dict)

@app.get("/api/contratos/{contrato_id}", response_model=Contrato)
async def obtener_contrato(contrato_id: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene un contrato por ID"""
    contrato = await contratos_collection.find_one({"_id": contrato_id})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    return Contrato(**contrato)

@app.put("/api/contratos/{contrato_id}", response_model=Contrato)
async def actualizar_contrato(contrato_id: str, datos: ContratoUpdate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Actualiza un contrato"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    resultado = await contratos_collection.update_one({"_id": contrato_id}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    contrato = await contratos_collection.find_one({"_id": contrato_id})
    return Contrato(**contrato)

# ============= PAGOS =============
@app.get("/api/pagos", response_model=List[Pago])
async def listar_pagos(
    contrato_id: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    mes_anio: Optional[str] = Query(None),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Lista todos los pagos con filtros opcionales"""
    filtro = {}
    if contrato_id:
        filtro["contrato_id"] = contrato_id
    if tipo:
        filtro["tipo"] = tipo
    if estado:
        filtro["estado"] = estado
    if mes_anio:
        filtro["mes_anio"] = mes_anio
    
    pagos = await pagos_collection.find(filtro).to_list(1000)
    return [Pago(**p) for p in pagos]

@app.post("/api/pagos", response_model=Pago, status_code=status.HTTP_201_CREATED)
async def crear_pago(datos: PagoCreate, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Crea un nuevo pago"""
    # Verificar que el contrato existe
    contrato = await contratos_collection.find_one({"_id": datos.contrato_id})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    pago_dict = datos.model_dump()
    pago_dict["_id"] = str(ObjectId())
    pago_dict["fecha_creacion"] = datetime.now(timezone.utc)
    pago_dict["fecha_ultima_actualizacion"] = None
    
    # Si el usuario es cobros, el pago pasa a en_revision
    if usuario_actual["rol"] == "cobros" and pago_dict["estado"] == "pendiente":
        pago_dict["estado"] = "en_revision"
    
    await pagos_collection.insert_one(pago_dict)
    return Pago(**pago_dict)

@app.get("/api/pagos/{pago_id}", response_model=Pago)
async def obtener_pago(pago_id: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene un pago por ID"""
    pago = await pagos_collection.find_one({"_id": pago_id})
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return Pago(**pago)

@app.put("/api/pagos/{pago_id}", response_model=Pago)
async def actualizar_pago(pago_id: str, datos: PagoUpdate, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Actualiza un pago"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    # Validar permisos para cambiar estado
    if "estado" in update_data:
        if update_data["estado"] == "pagado" and usuario_actual["rol"] == "cobros":
            raise HTTPException(status_code=403, detail="No tienes permiso para marcar pagos como pagados")
        # Si se cambia a pagado, registrar quién lo revisó
        if update_data["estado"] == "pagado":
            update_data["revisado_por_usuario_id"] = usuario_actual["sub"]
    
    # Actualizar fecha de última modificación
    update_data["fecha_ultima_actualizacion"] = datetime.now(timezone.utc)
    
    resultado = await pagos_collection.update_one({"_id": pago_id}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    pago = await pagos_collection.find_one({"_id": pago_id})
    return Pago(**pago)

@app.get("/api/pagos/pendientes/mes")
async def pagos_pendientes_por_mes(
    mes_anio: str = Query(..., description="Formato: YYYY-MM"),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Obtiene pagos pendientes o atrasados de un mes específico"""
    pagos = await pagos_collection.find({
        "mes_anio": mes_anio,
        "tipo": "alquiler",
        "estado": {"$in": ["pendiente", "atrasado"]}
    }).to_list(1000)
    
    # Enriquecer con datos de contrato, habitación, piso e inquilino
    resultado = []
    for pago in pagos:
        contrato = await contratos_collection.find_one({"_id": pago["contrato_id"]})
        if contrato:
            habitacion = await habitaciones_collection.find_one({"_id": contrato["habitacion_id"]})
            piso = await pisos_collection.find_one({"_id": habitacion["piso_id"]}) if habitacion else None
            inquilino = await inquilinos_collection.find_one({"_id": contrato["inquilino_id"]})
            
            resultado.append({
                "pago": Pago(**pago),
                "contrato": Contrato(**contrato),
                "habitacion": Habitacion(**habitacion) if habitacion else None,
                "piso": Piso(**piso) if piso else None,
                "inquilino": Inquilino(**inquilino) if inquilino else None
            })
    
    return resultado

# ============= GASTOS =============
@app.get("/api/gastos", response_model=List[Gasto])
async def listar_gastos(
    contrato_id: Optional[str] = Query(None),
    usuario_actual: dict = Depends(obtener_usuario_actual)
):
    """Lista todos los gastos"""
    filtro = {"contrato_id": contrato_id} if contrato_id else {}
    gastos = await gastos_collection.find(filtro).to_list(1000)
    return [Gasto(**g) for g in gastos]

@app.post("/api/gastos", response_model=Gasto, status_code=status.HTTP_201_CREATED)
async def crear_gasto(datos: GastoCreate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Crea un nuevo gasto"""
    # Verificar que el contrato existe
    contrato = await contratos_collection.find_one({"_id": datos.contrato_id})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    gasto_dict = datos.model_dump()
    gasto_dict["_id"] = str(ObjectId())
    await gastos_collection.insert_one(gasto_dict)
    return Gasto(**gasto_dict)

@app.get("/api/gastos/{gasto_id}", response_model=Gasto)
async def obtener_gasto(gasto_id: str, usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene un gasto por ID"""
    gasto = await gastos_collection.find_one({"_id": gasto_id})
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return Gasto(**gasto)

@app.put("/api/gastos/{gasto_id}", response_model=Gasto)
async def actualizar_gasto(gasto_id: str, datos: GastoUpdate, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Actualiza un gasto"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    resultado = await gastos_collection.update_one({"_id": gasto_id}, {"$set": update_data})
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    gasto = await gastos_collection.find_one({"_id": gasto_id})
    return Gasto(**gasto)

@app.delete("/api/gastos/{gasto_id}")
async def eliminar_gasto(gasto_id: str, usuario_actual: dict = Depends(verificar_rol(["admin", "supervisor"]))):
    """Elimina un gasto"""
    resultado = await gastos_collection.delete_one({"_id": gasto_id})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    return {"mensaje": "Gasto eliminado correctamente"}

# ============= AJUSTES (solo admin) =============
@app.get("/api/ajustes", response_model=Ajustes)
async def obtener_ajustes(usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Obtiene la configuración del sistema"""
    ajustes = await ajustes_collection.find_one({})
    if not ajustes:
        raise HTTPException(status_code=404, detail="Ajustes no encontrados")
    return Ajustes(**ajustes)

@app.put("/api/ajustes", response_model=Ajustes)
async def actualizar_ajustes(datos: AjustesUpdate, usuario_actual: dict = Depends(verificar_rol(["admin"]))):
    """Actualiza la configuración del sistema"""
    update_data = {k: v for k, v in datos.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    ajustes = await ajustes_collection.find_one({})
    if not ajustes:
        raise HTTPException(status_code=404, detail="Ajustes no encontrados")
    
    resultado = await ajustes_collection.update_one(
        {"_id": ajustes["_id"]},
        {"$set": update_data}
    )
    
    ajustes_actualizados = await ajustes_collection.find_one({"_id": ajustes["_id"]})
    return Ajustes(**ajustes_actualizados)

# ============= DASHBOARD =============
@app.get("/api/dashboard/stats")
async def obtener_estadisticas(usuario_actual: dict = Depends(obtener_usuario_actual)):
    """Obtiene estadísticas para el dashboard"""
    # Total de habitaciones
    total_habitaciones = await habitaciones_collection.count_documents({})
    
    # Habitaciones ocupadas (con contrato activo)
    contratos_activos = await contratos_collection.find({"estado": "activo"}).to_list(1000)
    habitaciones_ocupadas = len(contratos_activos)
    habitaciones_libres = total_habitaciones - habitaciones_ocupadas
    
    # Ingresos del mes actual
    mes_actual = datetime.now(timezone.utc).strftime("%Y-%m")
    pagos_mes = await pagos_collection.find({
        "mes_anio": mes_actual,
        "estado": "pagado"
    }).to_list(1000)
    ingresos_mes = sum(p["importe"] for p in pagos_mes)
    
    # Pagos pendientes/atrasados
    pagos_pendientes = await pagos_collection.count_documents({
        "estado": {"$in": ["pendiente", "atrasado", "en_revision"]}
    })
    
    # Contratos que terminan en 30 días
    fecha_limite = datetime.now(timezone.utc)
    from datetime import timedelta
    fecha_30_dias = fecha_limite + timedelta(days=30)
    
    contratos_proximos = await contratos_collection.count_documents({
        "estado": "activo",
        "fecha_fin": {"$lte": fecha_30_dias}
    })
    
    return {
        "total_habitaciones": total_habitaciones,
        "habitaciones_ocupadas": habitaciones_ocupadas,
        "habitaciones_libres": habitaciones_libres,
        "ingresos_mes_actual": round(ingresos_mes, 2),
        "pagos_pendientes": pagos_pendientes,
        "contratos_proximos_vencer": contratos_proximos
    }
