const db = require('../config/db');
const bcrypt = require('bcrypt');

//Obtener lista de usuarios para el panel de administración
const listarUsuarios = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id_usuario AS id, nombre, correo, rol FROM usuarios ORDER BY id_usuario'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al listar usuarios:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar los usuarios' });
  }
};

//Obtener estadísticas generales del sistema
const obtenerEstadisticas = async (req, res) => {
  try {
    const [[usuarios]] = await db.execute('SELECT COUNT(*) AS total FROM usuarios');
    const [[partidos]] = await db.execute('SELECT COUNT(*) AS total FROM Partidos');
    const [[filas]] = await db.execute('SELECT COUNT(*) AS total FROM Filas');
    const [[asientos]] = await db.execute('SELECT COUNT(*) AS total FROM Asientos');
    const [[torneos]] = await db.execute('SELECT COUNT(*) AS total FROM Torneos');
    res.json({
      usuarios: usuarios.total,
      partidos: partidos.total,
      filas: filas.total,
      asientos: asientos.total,
      torneos: torneos.total
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar las estadísticas' });
  }
};

//Crear un nuevo usuario
const crearUsuario = async (req, res) => {
  const { nombre, correo, password, rol } = req.body;

  if (!nombre || !correo || !password) {
    return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos' });
  }

  try {
    const [existe] = await db.execute('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length > 0) {
      return res.status(409).json({ message: 'Ya existe un usuario con ese correo' });
    }

    const hash = await bcrypt.hash(password, 10);
    const rolFinal = rol === 'admin' ? 'admin' : 'editor';

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

//Actualizar un usuario existente
const actualizarUsuario = async (req, res) => {
  const userId = Number(req.params.id);
  const { nombre, correo, password, rol } = req.body;

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  try {
    const [usuario] = await db.execute('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [userId]);
    if (usuario.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    //Si se envió nueva contraseña, generar hash
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.execute(
        'UPDATE usuarios SET nombre = ?, correo = ?, password_hash = ?, rol = ? WHERE id_usuario = ?',
        [nombre, correo, hash, rol || 'editor', userId]
      );
    } else {
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

//Eliminar un usuario
const eliminarUsuario = async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  //No permitir que el admin se elimine a sí mismo
  if (userId === req.usuario.id) {
    return res.status(403).json({ message: 'No puedes eliminar tu propia cuenta' });
  }

  try {
    const [result] = await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [userId]);
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
