const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_por_defecto';

//Middleware para validar el token JWT en rutas protegidas
const verificarToken = (req, res, next) => {
    //Obtener encabezado de autorización
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ message: 'Token de acceso requerido' });
    }

    //Extraer el token del formato "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Formato de token inválido' });
    }

    try {
        //Verificar y decodificar el token con la clave secreta
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
};

module.exports = verificarToken;
