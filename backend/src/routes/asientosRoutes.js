const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const { listarAsientos, actualizarEstado } = require('../controllers/asientosController');

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas de asientos
router.use(verificarToken);

// Ruta GET para consultar la lista de asientos
router.get('/', listarAsientos);

// Ruta PATCH para actualizar el estado de un asiento
router.patch('/:id/estado', actualizarEstado);

module.exports = router;