//Importacion de herramientas
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Se define la clave secreta para la generacion de tokens JWT
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_por_defecto';

//Función para el Login de usuario
const login = async (req, res) => {
    try {
        //Se reciben los datos del usuario
        const { username, password, rememberMe } = req.body;

        //Valida que el usuario y la contraseña sean correctos
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
        }

        //Busca el usuario por nombre o correo
        const [rows] = await db.execute(
            'SELECT * FROM usuarios WHERE nombre = ? OR correo = ? LIMIT 1',
            [username, username]
        );

        //Si no se encuentra el usuario
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        //Se obtiene el usuario
        const usuario = rows[0];

        //Se compara la contraseña con el hash almacenado
        const passwordValida = await bcrypt.compare(password, usuario.password_hash);

        //Si la contraseña es incorrecta
        if (!passwordValida) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        //Se genera el token JWT: 30 días si eligió mantener sesión, o 24 horas por defecto
        const expiresIn = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
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
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { login };
