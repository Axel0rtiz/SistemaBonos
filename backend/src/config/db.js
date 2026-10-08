//Configuracion de la conexion con la base de datos
//Importacion de herramientas
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Determinar si estamos en producción (Render) o local
const isProduction = process.env.NODE_ENV === 'production' ||
                     (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost'));

//Configuracion del pool de conexiones
const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
    ...(isProduction && {
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    })
};

console.log(`Conectando a DB: ${poolConfig.host}:${poolConfig.port}/${poolConfig.database} (SSL: ${isProduction ? 'habilitado' : 'deshabilitado'})`);

const pool = mysql.createPool(poolConfig);

// Probar conexión
pool.getConnection().then(connection => {
    console.log('Conexión a la base de datos MySQL/TiDB exitosa');
    connection.release();
})
.catch(err => {
    console.error('Error al conectar con la base de datos:', err.message);
    console.error('Detalles del error:', err.code, err.errno);
});

module.exports = pool;