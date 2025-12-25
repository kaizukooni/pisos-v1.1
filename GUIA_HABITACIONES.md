# GUÍA COMPLETA: Cómo Añadir Habitaciones a un Piso

## 📋 Flujo Completo

### PASO 1: Acceder a "Pisos y Habitaciones"
1. Inicia sesión en el sistema
2. Haz clic en el menú lateral: **"Pisos y Habitaciones"**
3. Verás una tabla con todos los pisos

### PASO 2: Ver Detalle de un Piso
En la tabla de pisos, cada fila tiene:
- **Nombre del piso** con el número de habitaciones: `Piso 1 (5 habitaciones)`
- **Dirección**
- **Habitaciones**: Total de habitaciones
- **Ocupación**: Cuántas están ocupadas y cuántas libres
- **Limpieza**: Si tiene servicio de limpieza
- **Acciones**: Botones Ver (👁), Editar (✏️), Eliminar (🗑️)

**Haz clic en el botón Ver (👁)** del piso donde quieres añadir habitaciones.

### PASO 3: Vista de Detalle del Piso
Se abre una nueva vista que muestra:

**A. Tarjetas de Estadísticas:**
- 🏠 Total Habitaciones: X
- 🚪 Ocupadas: Y (en verde)
- 🚪 Libres: Z (en gris)

**B. Información del Piso:**
Card con dirección, notas y servicio de limpieza

**C. Sección "Habitaciones de este Piso":**
- Título con botón **"Añadir Habitación"** (➕)
- Grid con cards de las habitaciones existentes

### PASO 4: Añadir Nueva Habitación
1. **Haz clic en "Añadir Habitación"** (botón con ➕)
2. Se abre un modal/dialog con el formulario:

```
┌─────────────────────────────────┐
│ Nueva Habitación                │
├─────────────────────────────────┤
│ Piso: Piso 1 - Calle Mayor     │  ← BLOQUEADO (no editable)
│                                 │
│ Nombre de la habitación *       │
│ [Ej: Habitación 1          ]   │
│                                 │
│ Metros cuadrados *              │
│ [20.5                      ]   │
│                                 │
│ Precio base mensual (€) *       │
│ [350.00                    ]   │
│                                 │
│    [Cancelar]  [Guardar]       │
└─────────────────────────────────┘
```

3. **Rellena los campos:**
   - ✅ El campo "Piso" ya viene relleno y bloqueado
   - ✅ Nombre: Ej: "Habitación 1", "Hab A", etc.
   - ✅ Metros: Número con decimales (ej: 20.5)
   - ✅ Precio base: Número con decimales (ej: 350.00)

4. **Haz clic en "Guardar"**
5. ✅ La habitación se crea automáticamente con el `piso_id` correcto
6. ✅ Aparece en la lista de habitaciones del piso

### PASO 5: Ver las Habitaciones
Cada habitación se muestra en un card con:

```
┌────────────────────────────┐
│ Habitación 1       [Ocupada]│  ← Badge verde o gris
├────────────────────────────┤
│ 20 m²                      │
│ 350.00 €/mes               │
│                            │
│ Ocupada por:               │  ← Solo si está ocupada
│ Juan Pérez                 │
│ +34 600 123 456            │
├────────────────────────────┤
│ [Ver] [✏️] [🗑️]            │
└────────────────────────────┘
```

**Estados de las habitaciones:**
- 🟢 **Ocupada** (badge verde): Tiene un contrato activo
  - Muestra nombre y teléfono del inquilino
- ⚪ **Libre** (badge gris): No tiene contrato activo
  - Lista para ser alquilada

### PASO 6: Ver Detalle de una Habitación
Haz clic en el botón **"Ver"** de cualquier habitación para ver:

**A. Información Básica:**
- Nombre, Piso, Metros, Precio base

**B. Contrato Actual** (si está ocupada):
- Card con fondo verde
- Inquilino: Nombre, Email, Teléfono, DNI
- Fechas de inicio y fin del contrato

**C. Historial de Contratos:**
- Lista de todos los contratos pasados
- Para cada contrato:
  - Nombre del inquilino
  - Email
  - Fechas de inicio y fin
  - Renta mensual y fianza
  - Estado (Activo/Finalizado)

### PASO 7: Editar o Eliminar Habitación
En la vista de detalle del piso, cada card de habitación tiene botones:
- **✏️ Editar**: Modificar nombre, metros o precio
  - ⚠️ El piso NO se puede cambiar (para evitar errores)
- **🗑️ Eliminar**: Solo si es Admin y no tiene contratos

## ✅ Validaciones Implementadas

1. **No se puede crear habitación sin piso:**
   - El piso_id es obligatorio
   - Se valida en el backend

2. **No se puede eliminar piso con habitaciones:**
   - Primero hay que eliminar todas las habitaciones

3. **No se puede eliminar habitación con contratos:**
   - Primero hay que finalizar los contratos

4. **El campo piso está bloqueado:**
   - Al crear desde detalle de piso
   - Al editar una habitación existente

## 🔄 Flujo de Navegación

```
Listado de Pisos
    ↓ [Clic en Ver 👁]
Vista Detalle de Piso
    ├─ [Botón Añadir Habitación]
    │      ↓
    │  Modal Nueva Habitación
    │      ↓ [Guardar]
    │  Habitación creada ✅
    │
    └─ [Clic en Ver de habitación]
           ↓
       Detalle de Habitación
       (Con contrato actual e historial)
```

## 📊 Endpoints del Backend

Todos los endpoints están funcionando y validados:

1. **GET /api/pisos/con-conteo**
   - Lista pisos con conteo de habitaciones

2. **GET /api/pisos/{piso_id}/detalle**
   - Detalle del piso con estadísticas

3. **GET /api/pisos/{piso_id}/habitaciones**
   - Habitaciones del piso con estado ocupación

4. **POST /api/habitaciones**
   - Crear habitación (requiere piso_id)

5. **PUT /api/habitaciones/{id}**
   - Editar habitación

6. **GET /api/habitaciones/{habitacion_id}/detalle**
   - Detalle completo con historial

## ✅ Estado Actual

- ✅ Todos los endpoints funcionando
- ✅ Frontend cargando correctamente
- ✅ Habitación de prueba creada exitosamente
- ✅ Flujo completo implementado
- ✅ Validaciones activas

## 🎯 Ejemplo de Uso Real

**Escenario:** Tienes "Piso 1 - Calle Mayor 10" y quieres añadir 3 habitaciones.

1. Ve a "Pisos y Habitaciones"
2. Busca "Piso 1" en la tabla
3. Haz clic en el ojo (👁)
4. Verás las 3 tarjetas de estadísticas
5. Haz clic en "Añadir Habitación"
6. Completa:
   - Nombre: "Habitación 1"
   - Metros: 20
   - Precio: 350
7. Guardar
8. Repite para "Habitación 2" y "Habitación 3"
9. Verás 3 cards en el grid, todas con badge "Libre"
10. Cuando crees contratos, cambiarán a "Ocupada" automáticamente

## 🚀 Próximos Pasos

Ahora que las habitaciones funcionan correctamente, puedes:
1. Crear contratos para las habitaciones
2. Registrar pagos
3. Ver el historial de ocupación
4. Generar reportes (FASE 2)
