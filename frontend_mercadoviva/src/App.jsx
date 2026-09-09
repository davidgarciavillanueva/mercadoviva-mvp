import { useState, useEffect } from 'react';
import './App.css';

const API_URL = "[https://mercadoviva-backend.onrender.com](https://mercadoviva-backend.onrender.com)";

function App() {
  const [vistaActual, setVistaActual] = useState('cliente'); // 'cliente' o 'admin'
  
  // Estados para el Cliente
  const [tabCliente, setTabCliente] = useState('radicar'); // 'radicar' o 'consultar'
  const [formularioPQR, setFormularioPQR] = useState({ cedula: '', nombre: '', email: '', telefono: '', tipo: 'Petición', descripcion: '' });
  const [cedulaConsulta, setCedulaConsulta] = useState('');
  const [misPqrs, setMisPqrs] = useState([]);

  // Estados para el Admin (Agente)
  const [credenciales, setCredenciales] = useState({ email: '', password: '' });
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [pqrsAdmin, setPqrsAdmin] = useState([]);

  // --- FUNCIONES DEL CLIENTE (HU1 y HU2) ---
  const radicarPQR = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/pqrs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formularioPQR)
      });
      const data = await response.json();
      alert(data.mensaje + " - Ticket ID: " + data.ticket_id);
      setFormularioPQR({ cedula: '', nombre: '', email: '', telefono: '', tipo: 'Petición', descripcion: '' }); // Limpiar formulario
    } catch (error) {
      alert("Error al conectar con el servidor");
    }
  };

  const consultarPQR = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/pqrs/cliente/${cedulaConsulta}`);
      if (!response.ok) throw new Error("No se encontraron PQRs");
      const data = await response.json();
      setMisPqrs(data.historial_pqrs);
    } catch (error) {
      alert(error.message);
      setMisPqrs([]);
    }
  };

  // --- FUNCIONES DEL AGENTE (HU3, HU4 y HU5) ---
  const loginAdmin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/agentes/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales)
      });
      if (!response.ok) throw new Error("Credenciales incorrectas");
      const data = await response.json();
      setToken(data.token);
      localStorage.setItem('token', data.token); // Guardar sesión
    } catch (error) {
      alert(error.message);
    }
  };

  const cargarPanelAdmin = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/pqrs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPqrsAdmin(data.pqrs);
      }
    } catch (error) {
      console.error("Error al cargar panel");
    }
  };

  const actualizarEstado = async (id, nuevoEstado) => {
    try {
      const response = await fetch(`${API_URL}/admin/pqrs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (response.ok) {
        cargarPanelAdmin(); // Recargar la lista
      }
    } catch (error) {
      alert("Error al actualizar");
    }
  };

  const cerrarSesion = () => {
    setToken('');
    localStorage.removeItem('token');
  };

  // Cargar datos automáticamente al entrar al panel de admin
  useEffect(() => {
    if (token && vistaActual === 'admin') {
      cargarPanelAdmin();
    }
  }, [token, vistaActual]);


  // --- INTERFAZ GRÁFICA ---
  return (
    <div className="contenedor-principal">
      <header className="cabecera">
        <h1>Mercado VIVA - Centro de Ayuda</h1>
        <div className="botones-navegacion">
          <button onClick={() => setVistaActual('cliente')} className={vistaActual === 'cliente' ? 'activo' : ''}>Soy Cliente</button>
          <button onClick={() => setVistaActual('admin')} className={vistaActual === 'admin' ? 'activo' : ''}>Acceso Agentes</button>
        </div>
      </header>

      {/* --- VISTA CLIENTE --- */}
      {vistaActual === 'cliente' && (
        <div className="seccion">
          <div className="pestañas">
            <button onClick={() => setTabCliente('radicar')} className={tabCliente === 'radicar' ? 'activo' : ''}>Radicar PQR</button>
            <button onClick={() => setTabCliente('consultar')} className={tabCliente === 'consultar' ? 'activo' : ''}>Consultar Estado</button>
          </div>

          {tabCliente === 'radicar' ? (
            <form onSubmit={radicarPQR} className="formulario">
              <h2>Ingresa tu Solicitud</h2>
              <input type="text" placeholder="Cédula" required value={formularioPQR.cedula} onChange={e => setFormularioPQR({...formularioPQR, cedula: e.target.value})} />
              <input type="text" placeholder="Nombre completo" required value={formularioPQR.nombre} onChange={e => setFormularioPQR({...formularioPQR, nombre: e.target.value})} />
              <input type="email" placeholder="Correo electrónico" required value={formularioPQR.email} onChange={e => setFormularioPQR({...formularioPQR, email: e.target.value})} />
              <input type="text" placeholder="Teléfono" required value={formularioPQR.telefono} onChange={e => setFormularioPQR({...formularioPQR, telefono: e.target.value})} />
              <select value={formularioPQR.tipo} onChange={e => setFormularioPQR({...formularioPQR, tipo: e.target.value})}>
                <option>Petición</option>
                <option>Queja</option>
                <option>Reclamo</option>
              </select>
              <textarea placeholder="Describe tu caso detalladamente..." required rows="4" value={formularioPQR.descripcion} onChange={e => setFormularioPQR({...formularioPQR, descripcion: e.target.value})}></textarea>
              <button type="submit" className="btn-primario">Enviar PQR</button>
            </form>
          ) : (
            <div className="formulario">
              <h2>Consulta tu Historial</h2>
              <form onSubmit={consultarPQR} style={{display: 'flex', gap: '10px'}}>
                <input type="text" placeholder="Ingresa tu Cédula" required value={cedulaConsulta} onChange={e => setCedulaConsulta(e.target.value)} />
                <button type="submit" className="btn-primario">Buscar</button>
              </form>
              
              <div className="lista-pqrs">
                {misPqrs.map(pqr => (
                  <div key={pqr.id} className={`tarjeta-pqr ${pqr.estado.toLowerCase()}`}>
                    <strong>{pqr.tipo}</strong> - {new Date(pqr.fecha_creacion).toLocaleDateString()}
                    <p>{pqr.descripcion}</p>
                    <span className="etiqueta-estado">Estado: {pqr.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- VISTA ADMIN --- */}
      {vistaActual === 'admin' && (
        <div className="seccion">
          {!token ? (
            <form onSubmit={loginAdmin} className="formulario">
              <h2>Inicio de Sesión - Agentes</h2>
              <input type="email" placeholder="Correo corporativo" required value={credenciales.email} onChange={e => setCredenciales({...credenciales, email: e.target.value})} />
              <input type="password" placeholder="Contraseña" required value={credenciales.password} onChange={e => setCredenciales({...credenciales, password: e.target.value})} />
              <button type="submit" className="btn-primario">Ingresar</button>
            </form>
          ) : (
            <div className="panel-admin">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h2>Panel de Gestión (Historial Unificado)</h2>
                <button onClick={cerrarSesion} className="btn-secundario">Cerrar Sesión</button>
              </div>
              
              <div className="lista-admin">
                {pqrsAdmin.map(pqr => (
                  <div key={pqr.id} className={`tarjeta-admin ${pqr.estado.toLowerCase()}`}>
                    <div className="info-cliente">
                      <strong>Cliente:</strong> {pqr.clientes.nombre} | <strong>Cédula:</strong> {pqr.cedula_cliente} <br/>
                      <strong>Contacto:</strong> {pqr.clientes.email} - {pqr.clientes.telefono}
                    </div>
                    <div className="info-ticket">
                      <strong>Ticket [{pqr.tipo}]:</strong> {pqr.descripcion}
                    </div>
                    <div className="acciones">
                      <span className="etiqueta-estado">Estado actual: {pqr.estado}</span>
                      {pqr.estado === 'Abierto' && (
                        <button onClick={() => actualizarEstado(pqr.id, 'Resuelto')} className="btn-resolver">Marcar como Resuelto</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
