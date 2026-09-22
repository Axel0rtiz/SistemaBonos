const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const { listarAsientos, actualizarEstado } = require('../controllers/asientosController');

const router = express.Router();

router.use(verificarToken);
router.get('/', listarAsientos);
router.patch('/:id/estado', actualizarEstado);

module.exports = router;