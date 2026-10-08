const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const asientosRoutes = require('./routes/asientosRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '../../frontend');

// Middleware para que el servidor entienda formato JSON
app.use(express.json());

//Ruta raíz: redirigue al login como primera pantalla
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
});

// Servir archivos estáticos del frontend
app.use(express.static(frontendPath));

//Rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/asientos', asientosRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/estado', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT 1 AS ok');
        res.json({
            mensaje: 'El backend está conectado y listo para recibir peticiones',
            db: 'conectada',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            mensaje: 'El backend está corriendo pero hay un error con la base de datos',
            db: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
 
// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});