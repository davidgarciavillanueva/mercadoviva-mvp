from fastapi import FastAPI, HTTPException, Header, Depends, Form, File, UploadFile
import uuid
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

# Conexión a Supabase (¡REEMPLAZA ESTO CON TUS CLAVES REALES!)
SUPABASE_URL = "https://kvgocwsqcoplibspwspt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2Z29jd3NxY29wbGlic3B3c3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MzIwMzAsImV4cCI6MjEwNDQwODAzMH0.UryxzjWs4_xZJH56ST35gnwoYuBVxLSkUljiReA4VhU"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

SECRET_KEY = "mercadoviva_secreto_mvp" 

# --- MODELOS DE DATOS ---
class LoginRequest(BaseModel):
    email: str
    password: str

class EstadoUpdate(BaseModel):
    estado: str

# --- SEGURIDAD: Función JWT ---
def verificar_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado: Token faltante")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado, vuelve a iniciar sesión")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# ==========================================
# ENDPOINTS (HISTORIAS DE USUARIO)
# ==========================================

@app.get("/")
def root():
    return {"mensaje": "¡El Backend de Mercado Viva está funcionando y listo para las PQR!"}

# HU1: Radicar PQR (Cliente) - ¡LA RUTA NUEVA PARA ARCHIVOS!
@app.post("/pqrs")
async def crear_pqr(
    cedula: str = Form(...),
    nombre: str = Form(...),
    email: str = Form(...),      
    telefono: str = Form(...),   
    tipo: str = Form(...),
    descripcion: str = Form(...),
    evidencia: UploadFile = File(None)
):
    url_archivo = None

    if evidencia:
        try:
            file_extension = evidencia.filename.split(".")[-1]
            file_name = f"{uuid.uuid4()}.{file_extension}"
            file_bytes = await evidencia.read()

            supabase.storage.from_("evidencias_pqrs").upload(
                path=file_name,
                file=file_bytes,
                file_options={"content-type": evidencia.content_type}
            )
            url_archivo = supabase.storage.from_("evidencias_pqrs").get_public_url(file_name)
        except Exception as e:
            print("Error al subir evidencia:", e)

    try:
        cliente_data = {
            "cedula": cedula,
            "nombre": nombre,
            "email": email,
            "telefono": telefono
        }
        supabase.table("clientes").upsert(cliente_data).execute()
    except Exception as e:
        print("Nota: No se guardó en tabla clientes:", e)

    try:
        nueva_pqr = {
            "cedula": cedula,
            "nombre": nombre,
            "tipo": tipo,
            "descripcion": descripcion,
            "estado": "Abierto",
            "url_evidencia": url_archivo
        }
        respuesta = supabase.table("pqrs").insert(nueva_pqr).execute()
        return {"mensaje": "PQR radicada con éxito", "data": respuesta.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# HU2: Consultar estado (Cliente) 
@app.get("/pqrs/{cedula}")
def consultar_estado(cedula: str):
    try:
        pqrs = supabase.table("pqrs").select("*").eq("cedula", cedula).execute()
        return pqrs.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# HU3: Login de Agente 
@app.post("/agentes/login")
def login_agente(credenciales: LoginRequest):
    try:
        agente = supabase.table("agentes").select("*").eq("email", credenciales.email).execute()
        
        if not agente.data or agente.data[0]["password_hash"] != credenciales.password:
            raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
        
        token = jwt.encode({
            "email": credenciales.email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")
        
        return {"token": token, "mensaje": "Inicio de sesión exitoso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error en el servidor al intentar iniciar sesión")

# HU4: Ver Panel e Historial de PQRs (Solo Agentes) 
@app.get("/pqrs")
def ver_todas_pqrs():
    try:
        todas_pqrs = supabase.table("pqrs").select("*").order("id", desc=True).execute()
        return todas_pqrs.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# HU5: Actualizar estado de PQR (Solo Agentes) 
@app.put("/pqrs/{pqr_id}")
def actualizar_estado_pqr(pqr_id: str, actualizacion: EstadoUpdate):
    try:
        resultado = supabase.table("pqrs").update({"estado": actualizacion.estado}).eq("id", pqr_id).execute()
        if not resultado.data:
            raise HTTPException(status_code=404, detail="PQR no encontrada")
        return {"mensaje": "Estado actualizado correctamente", "pqr": resultado.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
