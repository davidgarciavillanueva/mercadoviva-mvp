from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import jwt
import datetime

# Inicializamos FastAPI
app = FastAPI(title="API PQR - Mercado Viva", description="Backend MVP para gestión de PQRs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión a Supabase (¡PON TUS CREDENCIALES AQUÍ!)
SUPABASE_URL = "https://kvgocwsqcoplibspwspt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Z29jd3NxY29wbGlic3B3c3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzIwMzAsImV4cCI6MjEwNDQwODAzMH0.UryxzjWs4_xZJH56ST35gnwoYuBVxLSkUljiReA4VhU"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

SECRET_KEY = "mercadoviva_secreto_mvp" # Clave para firmar los tokens de seguridad

# --- MODELOS DE DATOS (Validación automática de la información que nos llega) ---
class PQRRequest(BaseModel):
    cedula: str
    nombre: str
    email: str
    telefono: str
    tipo: str
    descripcion: str

class LoginRequest(BaseModel):
    email: str
    password: str

class EstadoUpdate(BaseModel):
    estado: str

# --- SEGURIDAD: Función para verificar que el Agente tiene permiso (JWT) ---
def verificar_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado: Token faltante")
    token = authorization.split(" ")[1]
    try:
        # Intentamos decodificar el token con nuestra clave secreta
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado, vuelve a iniciar sesión")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# --- ENDPOINTS (CUMPLIMIENTO DE LAS 5 HISTORIAS DE USUARIO) ---

@app.get("/")
def root():
    return {"mensaje": "¡El Backend de Mercado Viva está funcionando y listo para las PQR!"}

# HU1: Radicar PQR (Cliente)
@app.post("/pqrs")
def crear_pqr(pqr: PQRRequest):
    # Verificamos si el cliente ya existe en el historial
    cliente = supabase.table("clientes").select("*").eq("cedula", pqr.cedula).execute()
    
    if not cliente.data:
        # Si no existe, lo creamos nuevo
        supabase.table("clientes").insert({
            "cedula": pqr.cedula,
            "nombre": pqr.nombre,
            "email": pqr.email,
            "telefono": pqr.telefono
        }).execute()
        
    # Guardamos la PQR (Ticket) asociada a su cédula
    nueva_pqr = supabase.table("pqrs").insert({
        "cedula_cliente": pqr.cedula,
        "tipo": pqr.tipo,
        "descripcion": pqr.descripcion,
        "estado": "Abierto"
    }).execute()
    
    return {"mensaje": "PQR radicada exitosamente", "ticket_id": nueva_pqr.data[0]["id"]}

# HU2: Consultar estado (Cliente)
@app.get("/pqrs/cliente/{cedula}")
def consultar_estado(cedula: str):
    pqrs = supabase.table("pqrs").select("*").eq("cedula_cliente", cedula).execute()
    if not pqrs.data:
        raise HTTPException(status_code=404, detail="No se encontraron PQRs para esta cédula")
    return {"historial_pqrs": pqrs.data}

# HU3: Login de Agente (Seguridad)
@app.post("/agentes/login")
def login_agente(credenciales: LoginRequest):
    agente = supabase.table("agentes").select("*").eq("email", credenciales.email).execute()
    
    # Validamos usuario y contraseña
    if not agente.data or agente.data[0]["password_hash"] != credenciales.password:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    # Generamos un Token JWT válido por 2 horas
    token = jwt.encode({
        "email": credenciales.email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, SECRET_KEY, algorithm="HS256")
    
    return {"token": token, "mensaje": "Inicio de sesión exitoso"}

# HU4: Ver Panel e Historial de PQRs (Solo Agentes)
@app.get("/admin/pqrs")
def ver_panel_admin(token: dict = Depends(verificar_token)):
    # Trae todas las PQRs y junta la información del cliente usando "clientes(nombre, email)"
    todas_pqrs = supabase.table("pqrs").select("*, clientes(nombre, email, telefono)").order("fecha_creacion", desc=True).execute()
    return {"pqrs": todas_pqrs.data}

# HU5: Actualizar estado de PQR (Solo Agentes)
@app.put("/admin/pqrs/{pqr_id}")
def actualizar_estado_pqr(pqr_id: str, actualizacion: EstadoUpdate, token: dict = Depends(verificar_token)):
    resultado = supabase.table("pqrs").update({"estado": actualizacion.estado}).eq("id", pqr_id).execute()
    if not resultado.data:
        raise HTTPException(status_code=404, detail="PQR no encontrada")
    return {"mensaje": "Estado actualizado correctamente", "pqr": resultado.data[0]}