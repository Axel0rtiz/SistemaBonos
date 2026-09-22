const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const { listarUsuarios, obtenerEstadisticas, crearUsuario, actualizarUsuario, eliminarUsuario } = require('../controllers/adminController');
const { listarPartidos, listarTorneos, crearPartido, actualizarPartido, eliminarPartido, crearTorneo } = require('../controllers/partidosController');
const { listarZonasYFilas, obtenerAsientos, crearFila, crearAsiento, actualizarEstadoAsiento, actualizarAsiento, eliminarAsiento, eliminarFila } = require('../controllers/filasController');

const router = express.Router();

//Middleware: verificar token y que el usuario sea admin
router.use(verificarToken);
router.use((req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
});

// Rutas de Usuarios y estadísticas
router.get('/usuarios', listarUsuarios);
router.get('/estadisticas', obtenerEstadisticas);
router.post('/usuarios', crearUsuario);
router.patch('/usuarios/:id', actualizarUsuario);
router.delete('/usuarios/:id', eliminarUsuario);

// Rutas de Partidos y Torneos
router.get('/partidos', listarPartidos);
router.post('/partidos', crearPartido);
router.patch('/partidos/:id', actualizarPartido);
router.delete('/partidos/:id', eliminarPartido);
router.get('/torneos', listarTorneos);
router.post('/torneos', crearTorneo);

// Rutas de Filas, Zonas y Asientos
router.get('/zonas-filas', listarZonasYFilas);
router.get('/asientos', obtenerAsientos);
router.post('/filas', crearFila);
router.delete('/filas/:id', eliminarFila);
router.post('/asientos', crearAsiento);
router.patch('/asientos/:id', actualizarAsiento);
router.patch('/asientos/:id/estado', actualizarEstadoAsiento);
router.delete('/asientos/:id', eliminarAsiento);

module.exports = router;

