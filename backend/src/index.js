const express = require('express');
const path = require('path'); // 1. Importamos 'path' para manejar las rutas de las carpetas

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para que el servidor entienda formato JSON
app.use(express.json());

// 2. Le decimos a Express dónde está tu carpeta frontend
// Como este archivo está en backend/src, subimos dos niveles ('../../') para llegar a frontend
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// 3. Cambiamos la ruta de prueba para que sea un "endpoint" de API real
app.get('/api/estado', (req, res) => {
    res.json({ mensaje: 'El backend está conectado y listo para recibir peticiones' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});