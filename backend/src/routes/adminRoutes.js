const express = require('express');
const verificarToken = require('../middlewares/verificarToken');
const { listarUsuarios, obtenerEstadisticas, crearUsuario, actualizarUsuario, eliminarUsuario } = require('../controllers/adminController');

const router = express.Router();

//Middleware: verificar token y que el usuario sea admin
router.use(verificarToken);
router.use((req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol de administrador' });
  }
  next();
});

router.get('/usuarios', listarUsuarios);
router.get('/estadisticas', obtenerEstadisticas);
router.post('/usuarios', crearUsuario);
router.patch('/usuarios/:id', actualizarUsuario);
router.delete('/usuarios/:id', eliminarUsuario);

module.exports = router;
