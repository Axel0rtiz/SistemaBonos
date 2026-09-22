//Importacion de herramientas
const db = require('../config/db');
const bcrypt = require('bcrypt');

//Función para obtener la lista de usuarios para el panel de administración
const listarUsuarios = async (req, res) => {
  try {
    const [rows] = await db.execute(
      //Consulta SQL para obtener la lista de usuarios
      'SELECT id_usuario AS id, nombre, correo, rol FROM usuarios ORDER BY id_usuario'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar usuarios:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar los usuarios' });
  }
};

//Función para obtener las estadísticas generales del sistema
const obtenerEstadisticas = async (req, res) => {
  try {
    //Consultas SQL para obtener las estadísticas
    const [[usuarios]] = await db.execute('SELECT COUNT(*) AS total FROM usuarios');
    const [[partidos]] = await db.execute('SELECT COUNT(*) AS total FROM Partidos');
    const [[filas]] = await db.execute('SELECT COUNT(*) AS total FROM Filas');
    const [[asientos]] = await db.execute('SELECT COUNT(*) AS total FROM Asientos');
    const [[torneos]] = await db.execute('SELECT COUNT(*) AS total FROM Torneos');
    //Envio de los datos obtenidos
    res.json({
      usuarios: usuarios.total,
      partidos: partidos.total,
      filas: filas.total,
      asientos: asientos.total,
      torneos: torneos.total
    });
  } catch (error) {
    //En caso de error al obtener las estadísticas
    console.error('Error al obtener estadísticas:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar las estadísticas' });
  }
};

//Función para crear un nuevo usuario
const crearUsuario = async (req, res) => {
  const { nombre, correo, password, rol } = req.body;
  //Validacion de que los campos no esten vacios
  if (!nombre || !correo || !password) {
    return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos' });
  }

  try {
    //Consulta SQL para verificar si existe un usuario con el mismo correo
    const [existe] = await db.execute('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
    //Si existe el correo mandamos error
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe un usuario con ese correo' });
    }
    
    const hash = await bcrypt.hash(password, 10);
    //Definimos el rol del nuevo usuario
    const rolFinal = rol === 'admin' ? 'admin' : 'editor';
    //Insertamos el nuevo usuario en la base de datos
    await db.execute(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, correo, hash, rolFinal]
    );

    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    res.status(500).json({ message: 'No se pudo crear el usuario' });
  }
};

//Función para actualizar un usuario existente
const actualizarUsuario = async (req, res) => {
  const userId = Number(req.params.id);
  const { nombre, correo, password, rol } = req.body;

  //Valida que el Id sea un entero
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  try {
    //Consulta SQL para verificar si existe el usuario
    const [usuario] = await db.execute('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [userId]);
    //Revisar si el usuario existe
    if (usuario.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    //Si se crea una nueva contraseña, se genera el hash
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      //Actualizamos los datos del usuario
      await db.execute(
        'UPDATE usuarios SET nombre = ?, correo = ?, password_hash = ?, rol = ? WHERE id_usuario = ?',
        [nombre, correo, hash, rol || 'editor', userId]
      );
    } else {
      //Actualizamos los datos del usuario sin cambiar la contraseña
      await db.execute(
        'UPDATE usuarios SET nombre = ?, correo = ?, rol = ? WHERE id_usuario = ?',
        [nombre, correo, rol || 'editor', userId]
      );
    }

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el usuario' });
  }
};

//Función para eliminar un usuario
const eliminarUsuario = async (req, res) => {
  const userId = Number(req.params.id);

  //Valida que el Id sea un entero
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  //No permitir que el admin se elimine a sí mismo
  if (userId === req.usuario.id) {
    return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta' });
  }

  try {
    //Eliminamos el usuario
    const [result] = await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [userId]);
    //Revisa si se eliminó el usuario
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error.message);
    res.status(500).json({ message: 'No se pudo eliminar el usuario' });
  }
};

module.exports = { listarUsuarios, obtenerEstadisticas, crearUsuario, actualizarUsuario, eliminarUsuario };
