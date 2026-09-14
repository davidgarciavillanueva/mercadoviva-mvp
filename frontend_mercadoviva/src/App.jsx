import { useState } from 'react';
import './App.css'; 

// ¡Asegúrate de que esta sea la URL de tu Render sin barra al final!
const API_URL = "https://mercadoviva-backend.onrender.com";

function App() {
  const [vista, setVista] = useState('cliente'); // 'cliente', 'consultar', 'agente'

  // Estados del Formulario (Cliente)
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [emailCliente, setEmailCliente] = useState(""); // Correo del cliente
  const [telefono, setTelefono] = useState("");         // Teléfono del cliente
  const [tipo, setTipo] = useState("Queja");
  const [descripcion, setDescripcion] = useState("");
  const [archivo, setArchivo] = useState(null); 

  // Estados de Consulta (Cliente)
  const [cedulaConsulta, setCedulaConsulta] = useState("");
  const [misPqrs, setMisPqrs] = useState([]);

  // Estados del Agente
  const [emailAdmin, setEmailAdmin] = useState("");
  const [password, setPassword] = useState("");
  const [logueado, setLogueado] = useState(false);
  const [todasPqrs, setTodasPqrs] = useState([]);

  // ==========================================
  // LÓGICA DEL CLIENTE (RADICAR PQR)
  // ==========================================
  const enviarPQR = async (e) => {
    e.preventDefault();
    
    // Usamos FormData para empaquetar textos y archivos juntos
    const formData = new FormData();
    formData.append("cedula", cedula);
    formData.append("nombre", nombre);
    formData.append("email", emailCliente);
    formData.append("telefono", telefono);
    formData.append("tipo", tipo);
    formData.append("descripcion", descripcion);
    
    if (archivo) {
      formData.append("evidencia", archivo);
    }

    try {
      const response = await fetch(API_URL + "/pqrs", {
        method: "POST",
        body: formData, 
      });

      if (response.ok) {
        alert("¡PQR radicada con éxito!");
        // Limpiar el formulario completo
        setCedula("");
        setNombre("");
        setEmailCliente("");
        setTelefono("");
        setDescripcion("");
        setArchivo(null);
        document.getElementById("archivo-input").value = ""; 
      } else {
        alert("Hubo un error al enviar la PQR");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor", error);
      alert("Error al conectar con el servidor");
    }
  };

  // ==========================================
  // LÓGICA DEL CLIENTE (CONSULTAR ESTADO)
  // ==========================================
  const consultarPQR = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL + "/pqrs/" + cedulaConsulta);
      if (response.ok) {
        const data = await response.json();
        setMisPqrs(data);
        if (data.length === 0) {
          alert("No se encontraron PQRs asociadas a esta cédula.");
        }
      }
    } catch (error) {
      alert("Error al consultar.");
    }
  };

  // ==========================================
  // LÓGICA DEL AGENTE
  // ==========================================
  const loginAgente = async (e) => {
    e.preventDefault();
    if (emailAdmin === "agente@mercadoviva.com" && password === "admin123") {
      setLogueado(true);
      cargarTodasLasPqrs();
    } else {
      alert("Credenciales incorrectas (Status 401)");
    }
  };

  const cargarTodasLasPqrs = async () => {
    try {
      const response = await fetch(API_URL + "/pqrs");
      if (response.ok) {
        const data = await response.json();
        setTodasPqrs(data);
      }
    } catch (error) {
      console.error("Error cargando PQRs", error);
    }
  };

  const marcarResuelto = async (id) => {
    try {
      const response = await fetch(API_URL + "/pqrs/" + id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ estado: "Resuelto" })
      });

      if (response.ok) {
        alert("El estado del ticket se ha actualizado a Resuelto.");
        cargarTodasLasPqrs(); 
      }
    } catch (error) {
      alert("Error al actualizar el estado");
    }
  };

  // ==========================================
  // RENDERIZADO VISUAL
  // ==========================================
  return (
    <div className="app-container">
      {/* BARRA DE NAVEGACIÓN */}
      <nav>
        <div>
          <button onClick={() => setVista('cliente')} style={{marginRight: '10px'}}>Radicar PQR</button>
          <button onClick={() => setVista('consultar')}>Consultar Estado</button>
        </div>
        <button onClick={() => setVista('agente')} style={{background: '#334155'}}>Acceso Agentes</button>
      </nav>

      {/* VISTA 1: RADICAR PQR (CLIENTE) */}
      {vista === 'cliente' && (
        <form onSubmit={enviarPQR} className="tarjeta">
          <h2>Radicar Nueva PQR - Mercado VIVA</h2>
          
          <label>Cédula:</label>
          <input type="text" required value={cedula} onChange={(e) => setCedula(e.target.value)} />

          <label>Nombre Completo:</label>
          <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />

          <label>Correo Electrónico:</label>
          <input type="email" required value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} />

          <label>Teléfono:</label>
          <input type="text" required value={telefono} onChange={(e) => setTelefono(e.target.value)} />

          <label>Tipo de Solicitud:</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="Petición">Petición</option>
            <option value="Queja">Queja</option>
            <option value="Reclamo">Reclamo</option>
          </select>

          <label>Descripción detallada:</label>
          <textarea required rows="4" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}></textarea>

          <label>Adjuntar Evidencia (Foto o PDF opcional):</label>
          <input 
            id="archivo-input"
            type="file" 
            accept="image/*, application/pdf" 
            onChange={(e) => setArchivo(e.target.files[0])} 
          />

          <button type="submit">Enviar Solicitud</button>
        </form>
      )}

      {/* VISTA 2: CONSULTAR PQR (CLIENTE) */}
      {vista === 'consultar' && (
        <div className="tarjeta">
          <h2>Consultar Mis Solicitudes</h2>
          <form onSubmit={consultarPQR} style={{boxShadow: 'none', padding: '0', border: 'none', marginBottom: '20px'}}>
            <label>Ingrese su Cédula:</label>
            <input type="text" required value={cedulaConsulta} onChange={(e) => setCedulaConsulta(e.target.value)} />
            <button type="submit">Buscar PQRs</button>
          </form>

          {misPqrs.map(pqr => (
            <div key={pqr.id} className="tarjeta" style={{borderLeft: pqr.estado === 'Resuelto' ? '5px solid #10b981' : '5px solid #f59e0b'}}>
              <h3>{pqr.tipo} - ID: {pqr.id}</h3>
              <p><strong>Estado:</strong> {pqr.estado}</p>
              <p><strong>Descripción:</strong> {pqr.descripcion}</p>
              {pqr.url_evidencia && (
                <a href={pqr.url_evidencia} target="_blank" rel="noopener noreferrer" className="enlace-evidencia">
                  📎 Ver Evidencia Adjunta
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VISTA 3: ACCESO AGENTES (LOGIN Y PANEL UNIFICADO) */}
      {vista === 'agente' && !logueado && (
        <form onSubmit={loginAgente} className="tarjeta">
          <h2>Acceso Administrativo Seguro</h2>
          <label>Correo Electrónico:</label>
          <input type="email" required value={emailAdmin} onChange={(e) => setEmailAdmin(e.target.value)} />
          
          <label>Contraseña:</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          
          <button type="submit">Iniciar Sesión</button>
        </form>
      )}

      {vista === 'agente' && logueado && (
        <div className="tarjeta">
          <h2>Historial Unificado de PQRs</h2>
          <button onClick={cargarTodasLasPqrs} style={{marginBottom: '20px', background: '#3b82f6'}}>🔄 Actualizar Lista</button>
          
          {todasPqrs.map(pqr => (
            <div key={pqr.id} className="tarjeta" style={{borderLeft: pqr.estado === 'Resuelto' ? '5px solid #10b981' : '5px solid #f59e0b', background: '#f8fafc'}}>
              <h3>{pqr.tipo} - ID: {pqr.id} (Cédula: {pqr.cedula})</h3>
              <p><strong>Nombre:</strong> {pqr.nombre}</p>
              <p><strong>Estado actual:</strong> {pqr.estado}</p>
              <p><strong>Descripción:</strong> {pqr.descripcion}</p>
              
              {pqr.url_evidencia && (
                <p>
                  <a href={pqr.url_evidencia} target="_blank" rel="noopener noreferrer" className="enlace-evidencia">
                    📎 Ver Evidencia Subida por Cliente
                  </a>
                </p>
              )}

              {pqr.estado !== 'Resuelto' && (
                <button onClick={() => marcarResuelto(pqr.id)}>Marcar como Resuelto</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
