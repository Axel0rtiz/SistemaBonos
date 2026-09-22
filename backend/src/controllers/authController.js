const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_por_defecto';

//Login de usuario
const login = async (req, res) => {
    try {
        const { username, password, rememberMe } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
        }

        //Buscar usuario por nombre o correo
        const [rows] = await db.execute(
            'SELECT * FROM usuarios WHERE nombre = ? OR correo = ? LIMIT 1',
            [username, username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        const usuario = rows[0];

        // Comparar contraseña con el hash almacenado
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        if (!passwordValida) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        //Generar token JWT: 30 días si eligió mantener sesión, o 24 horas por defecto
        const expiresIn = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo
            },
            JWT_SECRET,
            { expiresIn }
        );

        //Se responde con el token y los datos del usuario (sin contraseña)
        res.json({
            message: 'Inicio de sesión exitoso',
            token,
            user: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo
            }
        });

    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { login };
