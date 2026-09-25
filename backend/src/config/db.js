//Configuracion de la conexion con la base de datos
//Importacion de herramientas
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

//Configuracion del pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, 
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

// Probar conexión
pool.getConnection().then(connection => {
console.log('Conexión a la base de datos MySQL exitosa');
connection.release();
})
.catch(err => {
console.error('Error al conectar con la base de datos:', err.message);
});

module.exports = pool;