const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// Ruta POST para autenticar al usuario y generar token de sesión
router.post('/login', login);

module.exports = router;
