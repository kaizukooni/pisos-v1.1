import requests
import sys
import json
from datetime import datetime, timezone, timedelta

class RentalSystemAPITester:
    def __init__(self, base_url="https://roomrent-manager-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_ids = {
            'piso': None,
            'habitacion': None,
            'inquilino': None,
            'contrato': None,
            'pago': None,
            'gasto': None,
            'usuario': None
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.content else {}
                    # Handle both 'id' and '_id' fields
                    if '_id' in response_data:
                        response_data['id'] = response_data['_id']
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e),
                'endpoint': endpoint
            })
            return False, {}

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@admin.com", "contraseña": "Admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_auth_me(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get Current User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_habitaciones', 'habitaciones_ocupadas', 'habitaciones_libres', 
                             'ingresos_mes_actual', 'pagos_pendientes', 'contratos_proximos_vencer']
            for field in required_fields:
                if field not in response:
                    print(f"   Warning: Missing field {field} in dashboard stats")
        return success

    def test_pisos_crud(self):
        """Test Pisos CRUD operations"""
        # Create Piso
        piso_data = {
            "nombre": "Piso Test",
            "direccion": "Calle Test 123",
            "notas": "Piso de prueba",
            "tiene_servicio_limpieza": True,
            "importe_limpieza_mensual": 100.0
        }
        success, response = self.run_test(
            "Create Piso",
            "POST",
            "pisos",
            201,
            data=piso_data
        )
        if success and 'id' in response:
            self.created_ids['piso'] = response['id']
            print(f"   Created Piso ID: {self.created_ids['piso']}")
        elif success:
            # Try to get the ID from the response
            print(f"   Response: {response}")
            if '_id' in response:
                self.created_ids['piso'] = response['_id']
            elif 'id' in response:
                self.created_ids['piso'] = response['id']

        # List Pisos
        self.run_test("List Pisos", "GET", "pisos", 200)

        # Get Piso by ID
        if self.created_ids['piso']:
            self.run_test(
                "Get Piso by ID",
                "GET",
                f"pisos/{self.created_ids['piso']}",
                200
            )

            # Update Piso
            update_data = {"nombre": "Piso Test Actualizado"}
            self.run_test(
                "Update Piso",
                "PUT",
                f"pisos/{self.created_ids['piso']}",
                200,
                data=update_data
            )

        return success

    def test_habitaciones_crud(self):
        """Test Habitaciones CRUD operations"""
        if not self.created_ids['piso']:
            print("❌ Cannot test habitaciones without piso")
            return False

        # Create Habitacion
        habitacion_data = {
            "piso_id": self.created_ids['piso'],
            "nombre": "Habitación Test",
            "metros": 15.5,
            "precio_base": 400.0
        }
        success, response = self.run_test(
            "Create Habitacion",
            "POST",
            "habitaciones",
            201,
            data=habitacion_data
        )
        if success and 'id' in response:
            self.created_ids['habitacion'] = response['id']
            print(f"   Created Habitacion ID: {self.created_ids['habitacion']}")

        # List Habitaciones
        self.run_test("List Habitaciones", "GET", "habitaciones", 200)

        # List Habitaciones by Piso
        self.run_test(
            "List Habitaciones by Piso",
            "GET",
            f"habitaciones?piso_id={self.created_ids['piso']}",
            200
        )

        # Get Habitacion by ID
        if self.created_ids['habitacion']:
            self.run_test(
                "Get Habitacion by ID",
                "GET",
                f"habitaciones/{self.created_ids['habitacion']}",
                200
            )

        return success

    def test_inquilinos_crud(self):
        """Test Inquilinos CRUD operations"""
        # Create Inquilino with unique DNI
        import random
        dni_suffix = random.randint(1000, 9999)
        inquilino_data = {
            "nombre": "Juan Test",
            "email": f"juan.test{dni_suffix}@example.com",
            "telefono": "+34600123456",
            "dni": f"1234567{dni_suffix}Z",
            "activo": True
        }
        success, response = self.run_test(
            "Create Inquilino",
            "POST",
            "inquilinos",
            201,
            data=inquilino_data
        )
        if success and 'id' in response:
            self.created_ids['inquilino'] = response['id']
            print(f"   Created Inquilino ID: {self.created_ids['inquilino']}")

        # List Inquilinos
        self.run_test("List Inquilinos", "GET", "inquilinos", 200)

        # Search Inquilinos
        self.run_test(
            "Search Inquilinos",
            "GET",
            "inquilinos?busqueda=Juan",
            200
        )

        # Get Inquilino by ID
        if self.created_ids['inquilino']:
            self.run_test(
                "Get Inquilino by ID",
                "GET",
                f"inquilinos/{self.created_ids['inquilino']}",
                200
            )

        return success

    def test_contratos_crud(self):
        """Test Contratos CRUD operations"""
        if not self.created_ids['habitacion'] or not self.created_ids['inquilino']:
            print("❌ Cannot test contratos without habitacion and inquilino")
            return False

        # Create Contrato
        fecha_inicio = datetime.now(timezone.utc)
        fecha_fin = fecha_inicio + timedelta(days=365)
        
        contrato_data = {
            "habitacion_id": self.created_ids['habitacion'],
            "inquilino_id": self.created_ids['inquilino'],
            "fecha_inicio": fecha_inicio.isoformat(),
            "fecha_fin": fecha_fin.isoformat(),
            "renta_mensual": 400.0,
            "fianza": 800.0,
            "gastos_mensuales_tarifa": 50.0,
            "tiene_limpieza": False,
            "estado": "activo"
        }
        success, response = self.run_test(
            "Create Contrato",
            "POST",
            "contratos",
            201,
            data=contrato_data
        )
        if success and 'id' in response:
            self.created_ids['contrato'] = response['id']
            print(f"   Created Contrato ID: {self.created_ids['contrato']}")

        # List Contratos
        self.run_test("List Contratos", "GET", "contratos", 200)

        # Test duplicate contract validation
        self.run_test(
            "Create Duplicate Contrato (should fail)",
            "POST",
            "contratos",
            400,
            data=contrato_data
        )

        return success

    def test_pagos_crud(self):
        """Test Pagos CRUD operations"""
        if not self.created_ids['contrato']:
            print("❌ Cannot test pagos without contrato")
            return False

        # Create Pago
        mes_actual = datetime.now(timezone.utc).strftime("%Y-%m")
        pago_data = {
            "contrato_id": self.created_ids['contrato'],
            "mes_anio": mes_actual,
            "tipo": "alquiler",
            "importe": 400.0,
            "metodo": "transferencia",
            "estado": "pendiente",
            "creado_por_usuario_id": "admin_id",
            "notas": "Pago de prueba"
        }
        success, response = self.run_test(
            "Create Pago",
            "POST",
            "pagos",
            201,
            data=pago_data
        )
        if success and 'id' in response:
            self.created_ids['pago'] = response['id']
            print(f"   Created Pago ID: {self.created_ids['pago']}")

        # List Pagos
        self.run_test("List Pagos", "GET", "pagos", 200)

        # Get Pagos Pendientes
        self.run_test(
            "Get Pagos Pendientes",
            "GET",
            f"pagos/pendientes/mes?mes_anio={mes_actual}",
            200
        )

        return success

    def test_gastos_crud(self):
        """Test Gastos CRUD operations"""
        if not self.created_ids['contrato']:
            print("❌ Cannot test gastos without contrato")
            return False

        # Create Gasto
        gasto_data = {
            "contrato_id": self.created_ids['contrato'],
            "fecha": datetime.now(timezone.utc).isoformat(),
            "concepto": "Reparación test",
            "importe": 50.0,
            "descontar_fianza": True
        }
        success, response = self.run_test(
            "Create Gasto",
            "POST",
            "gastos",
            201,
            data=gasto_data
        )
        if success and 'id' in response:
            self.created_ids['gasto'] = response['id']
            print(f"   Created Gasto ID: {self.created_ids['gasto']}")

        # List Gastos
        self.run_test("List Gastos", "GET", "gastos", 200)

        return success

    def test_usuarios_crud(self):
        """Test Usuarios CRUD operations (admin only)"""
        # List Usuarios
        success, response = self.run_test("List Usuarios", "GET", "usuarios", 200)

        # Create Usuario with unique email
        import random
        user_suffix = random.randint(1000, 9999)
        usuario_data = {
            "nombre": "Test Supervisor",
            "whatsapp": "+34600999888",
            "email": f"supervisor.test{user_suffix}@example.com",
            "rol": "supervisor",
            "activo": True,
            "contraseña": "TestPass123"
        }
        success, response = self.run_test(
            "Create Usuario",
            "POST",
            "usuarios",
            201,
            data=usuario_data
        )
        if success and 'id' in response:
            self.created_ids['usuario'] = response['id']
            print(f"   Created Usuario ID: {self.created_ids['usuario']}")

        return success

    def test_ajustes(self):
        """Test Ajustes operations"""
        # Get Ajustes
        success, response = self.run_test("Get Ajustes", "GET", "ajustes", 200)

        # Update Ajustes
        ajustes_data = {
            "dia_cobro_por_defecto": 10,
            "gastos_mensuales_tarifa_defecto": 60.0
        }
        self.run_test(
            "Update Ajustes",
            "PUT",
            "ajustes",
            200,
            data=ajustes_data
        )

        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order of dependencies
        if self.created_ids['gasto']:
            self.run_test("Delete Gasto", "DELETE", f"gastos/{self.created_ids['gasto']}", 200)
        
        if self.created_ids['pago']:
            # Note: No delete endpoint for pagos in the API
            pass
            
        if self.created_ids['contrato']:
            # Note: No delete endpoint for contratos in the API
            pass
            
        if self.created_ids['inquilino']:
            # Note: No delete endpoint for inquilinos in the API
            pass
            
        if self.created_ids['habitacion']:
            self.run_test("Delete Habitacion", "DELETE", f"habitaciones/{self.created_ids['habitacion']}", 200)
            
        if self.created_ids['piso']:
            self.run_test("Delete Piso", "DELETE", f"pisos/{self.created_ids['piso']}", 200)
            
        if self.created_ids['usuario']:
            self.run_test("Delete Usuario", "DELETE", f"usuarios/{self.created_ids['usuario']}", 200)

def main():
    print("🏠 Starting Rental Management System API Tests")
    print("=" * 50)
    
    tester = RentalSystemAPITester()
    
    # Test authentication first
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        return 1

    # Test auth endpoints
    tester.test_auth_me()
    
    # Test dashboard
    tester.test_dashboard_stats()
    
    # Test CRUD operations
    tester.test_pisos_crud()
    tester.test_habitaciones_crud()
    tester.test_inquilinos_crud()
    tester.test_contratos_crud()
    tester.test_pagos_crud()
    tester.test_gastos_crud()
    tester.test_usuarios_crud()
    tester.test_ajustes()
    
    # Cleanup
    tester.cleanup()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.failed_tests:
        print("\n❌ Failed tests:")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"   - {test['test']}: {error_msg}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"✅ Success rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())