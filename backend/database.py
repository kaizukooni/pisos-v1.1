from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Conexión a MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Colecciones
usuarios_collection = db.usuarios
pisos_collection = db.pisos
habitaciones_collection = db.habitaciones
inquilinos_collection = db.inquilinos
contratos_collection = db.contratos
pagos_collection = db.pagos
gastos_collection = db.gastos
ajustes_collection = db.ajustes

async def cerrar_conexion():
    """Cierra la conexión a MongoDB"""
    client.close()
