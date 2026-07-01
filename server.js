const express = require('express');
const app = express();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
// Para poder leer JSON en el body
app.use(express.json());

// Para servir archivos estáticos (index.html, styles.css)
app.use(express.static('public'));  // o la carpeta donde tengas index.html y styles.css

// CLAVE SECRETA - Cambiar en producción (usar variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esta_clave_secreta_por_una_muy_larga_y_aleatoria_2026';
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_EXPIRES = '8h'; // El token expira en 8 horas

// Contraseña del admin (se hashea al iniciar)
const ADMIN_PASSWORD_PLAIN = 'admin123';
let ADMIN_PASSWORD_HASH = '';

const DB_FILE = path.join(__dirname, 'pedidos.json');

// Hashear contraseña al iniciar
(async () => {
  ADMIN_PASSWORD_HASH = await bcrypt.hash(ADMIN_PASSWORD_PLAIN, 10);
  console.log('Contraseña del admin hasheada correctamente');
})();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Base de datos JSON ----------
function leerDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ pedidos: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function guardarDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---------- Middleware de autenticación JWT ----------
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ ok: false, mensaje: 'Token no proporcionado' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, mensaje: 'Token inválido o expirado' });
  }
}

// ---------- RUTAS PÚBLICAS ----------

// Login del admin (pública)
app.post('/api/login', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ ok: false, mensaje: 'Contraseña requerida' });
  }

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ ok: false, mensaje: 'Contraseña incorrecta' });
  }

  // Generar token JWT
  const token = jwt.sign(
    { rol: 'admin', iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({
    ok: true,
    mensaje: 'Acceso concedido',
    token,
    expiraEn: JWT_EXPIRES
  });
});

// Verificar si el token sigue válido (útil al recargar página)
app.get('/api/verify', verificarToken, (req, res) => {
  res.json({ ok: true, admin: req.admin });
});

// ---------- RUTAS PROTEGIDAS (solo admin) ----------

// Obtener todos los pedidos
app.get('/api/pedidos', verificarToken, (req, res) => {
  const data = leerDB();
  res.json(data.pedidos);
});

// Estadísticas
app.get('/api/stats', verificarToken, (req, res) => {
  const data = leerDB();
  const pedidos = data.pedidos;

  const totalGeneral = pedidos.reduce((sum, p) => sum + p.cantidad, 0);
  const totalPersonas = pedidos.length;

  const escaleras = ['1Baja', '1Media', '1Alta', '2', '3', '4'];
  const porEscalera = {};
  escaleras.forEach(e => porEscalera[e] = 0);
  pedidos.forEach(p => {
    if (porEscalera[p.escalera] !== undefined) {
      porEscalera[p.escalera] += p.cantidad;
    }
  });

  res.json({ totalGeneral, totalPersonas, porEscalera });
});

// Eliminar un pedido
app.delete('/api/pedidos/:id', verificarToken, (req, res) => {
  const id = parseInt(req.params.id);
  const data = leerDB();
  const antes = data.pedidos.length;
  data.pedidos = data.pedidos.filter(p => p.id !== id);
  guardarDB(data);
  res.json({ mensaje: 'Pedido eliminado', eliminados: antes - data.pedidos.length });
});

// Eliminar todos
app.delete('/api/pedidos', verificarToken, (req, res) => {
  guardarDB({ pedidos: [] });
  res.json({ mensaje: 'Todos los pedidos eliminados' });
});

// ---------- RUTA PÚBLICA: crear pedido (usuarios) ----------
app.post('/api/pedidos', (req, res) => {
  const { nombres, apellidos, cantidad, escalera, celular } = req.body;

  if (!nombres || !apellidos || !cantidad || !escalera || !celular) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const data = leerDB();
  const nuevoPedido = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    nombres,
    apellidos,
    cantidad: parseInt(cantidad),
    escalera,
    celular,
    fecha: new Date().toISOString()
  };

  data.pedidos.push(nuevoPedido);
  guardarDB(data);

  res.status(201).json({ mensaje: 'Pedido registrado', pedido: nuevoPedido });
});

// ---------- Iniciar servidor ----------
app.listen(PORT, () => {
  console.log(`\n Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`JWT activo - Expira en ${JWT_EXPIRES}`);
  console.log(`Abre esta URL en tu móvil (misma red WiFi)`);
  console.log(`Presiona Ctrl+C para detener\n`);
});
