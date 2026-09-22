const db = require('../config/db');

// Listar todas las zonas con el resumen de filas y asientos
const listarZonasYFilas = async (req, res) => {
  try {
    const [zonas] = await db.execute(`
      SELECT 
        z.id_zona,
        z.nombre_zona,
        COUNT(DISTINCT f.id_fila) AS total_filas,
        COUNT(a.id_asiento) AS total_asientos
      FROM Zonas z
      LEFT JOIN Filas f ON f.id_zona = z.id_zona
      LEFT JOIN Asientos a ON a.id_fila = f.id_fila
      GROUP BY z.id_zona, z.nombre_zona
      ORDER BY z.id_zona ASC
    `);

    const [filas] = await db.execute(`
      SELECT 
        f.id_fila,
        f.id_zona,
        f.nombre_fila,
        z.nombre_zona,
        COUNT(a.id_asiento) AS total_asientos
      FROM Filas f
      INNER JOIN Zonas z ON z.id_zona = f.id_zona
      LEFT JOIN Asientos a ON a.id_fila = f.id_fila
      GROUP BY f.id_fila, f.id_zona, f.nombre_fila, z.nombre_zona
      ORDER BY f.id_zona ASC, f.id_fila ASC
    `);

    res.json({ zonas, filas });
  } catch (error) {
    console.error('Error al listar zonas y filas:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar zonas y filas' });
  }
};

// Obtener asientos de una fila (o de una zona)
const obtenerAsientos = async (req, res) => {
  const { id_fila, id_zona, id_partido } = req.query;

  try {
    let query = `
      SELECT 
        a.id_asiento,
        a.id_fila,
        a.numero_asiento,
        f.nombre_fila,
        f.id_zona,
        z.nombre_zona,
        COALESCE(app.estado, 'disponible') AS estado,
        app.id_asiento_partido
      FROM Asientos a
      INNER JOIN Filas f ON f.id_fila = a.id_fila
      INNER JOIN Zonas z ON z.id_zona = f.id_zona
      LEFT JOIN Asientos_Por_Partido app ON app.id_asiento = a.id_asiento 
        ${id_partido ? 'AND app.id_partido = ' + Number(id_partido) : 'AND app.id_partido = (SELECT MIN(id_partido) FROM Partidos)'}
      WHERE 1=1
    `;

    const params = [];
    if (id_fila) {
      query += ' AND a.id_fila = ?';
      params.push(Number(id_fila));
    } else if (id_zona) {
      query += ' AND f.id_zona = ?';
      params.push(Number(id_zona));
    }

    query += ' ORDER BY f.id_fila ASC, a.numero_asiento ASC';

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener asientos:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar los asientos' });
  }
};

// Crear nueva fila
const crearFila = async (req, res) => {
  const { nombre_fila, id_zona } = req.body;
  if (!nombre_fila || !id_zona) {
    return res.status(400).json({ message: 'Nombre de fila y zona son requeridos' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO Filas (nombre_fila, id_zona) VALUES (?, ?)',
      [nombre_fila, Number(id_zona)]
    );
    res.status(201).json({ message: 'Fila creada exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error al crear fila:', error.message);
    res.status(500).json({ message: 'No se pudo crear la fila' });
  }
};

// Crear nuevo asiento
const crearAsiento = async (req, res) => {
  const { id_fila, numero_asiento } = req.body;
  if (!id_fila || numero_asiento === undefined) {
    return res.status(400).json({ message: 'Fila y número de asiento son requeridos' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      'INSERT INTO Asientos (id_fila, numero_asiento) VALUES (?, ?)',
      [Number(id_fila), Number(numero_asiento)]
    );

    const asientoId = result.insertId;

    // Vincular con todos los partidos existentes en Asientos_Por_Partido
    const [partidos] = await connection.execute('SELECT id_partido FROM Partidos');
    if (partidos.length > 0) {
      const values = partidos.map(p => `(${p.id_partido}, ${asientoId}, 'disponible')`).join(',');
      await connection.query(`INSERT INTO Asientos_Por_Partido (id_partido, id_asiento, estado) VALUES ${values}`);
    }

    await connection.commit();
    res.status(201).json({ message: 'Asiento creado exitosamente', id: asientoId });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear asiento:', error.message);
    res.status(500).json({ message: 'No se pudo crear el asiento' });
  } finally {
    connection.release();
  }
};

// Cambiar estado de un asiento para un partido
const actualizarEstadoAsiento = async (req, res) => {
  const { id } = req.params; // id_asiento
  const { estado, id_partido } = req.body; // 'disponible', 'apartado', 'vendido'

  if (!['disponible', 'apartado', 'vendido'].includes(estado)) {
    return res.status(400).json({ message: 'Estado inválido' });
  }

  try {
    let partidoId = id_partido;
    if (!partidoId) {
      const [[p]] = await db.execute('SELECT MIN(id_partido) as minId FROM Partidos');
      partidoId = p ? p.minId : 1;
    }

    const [result] = await db.execute(
      'UPDATE Asientos_Por_Partido SET estado = ? WHERE id_asiento = ? AND id_partido = ?',
      [estado, Number(id), Number(partidoId)]
    );

    res.json({ message: 'Estado del asiento actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar estado de asiento:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el estado del asiento' });
  }
};

// Eliminar un asiento
const eliminarAsiento = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM Historial_Cambios WHERE id_asiento_partido IN (SELECT id_asiento_partido FROM Asientos_Por_Partido WHERE id_asiento = ?)', [id]);
    await connection.execute('DELETE FROM Asientos_Por_Partido WHERE id_asiento = ?', [id]);
    const [result] = await connection.execute('DELETE FROM Asientos WHERE id_asiento = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Asiento no encontrado' });
    }

    await connection.commit();
    res.json({ message: 'Asiento eliminado exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar asiento:', error.message);
    res.status(500).json({ message: 'No se pudo eliminar el asiento' });
  } finally {
    connection.release();
  }
};

// Eliminar una fila completa
const eliminarFila = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Obtener asientos de la fila
    const [asientos] = await connection.execute('SELECT id_asiento FROM Asientos WHERE id_fila = ?', [id]);
    if (asientos.length > 0) {
      const ids = asientos.map(a => a.id_asiento);
      await connection.query(`DELETE FROM Historial_Cambios WHERE id_asiento_partido IN (SELECT id_asiento_partido FROM Asientos_Por_Partido WHERE id_asiento IN (${ids.join(',')}))`);
      await connection.query(`DELETE FROM Asientos_Por_Partido WHERE id_asiento IN (${ids.join(',')})`);
      await connection.execute('DELETE FROM Asientos WHERE id_fila = ?', [id]);
    }

    const [result] = await connection.execute('DELETE FROM Filas WHERE id_fila = ?', [id]);
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Fila no encontrada' });
    }

    await connection.commit();
    res.json({ message: 'Fila y sus asientos eliminados exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar fila:', error.message);
    res.status(500).json({ message: 'No se pudo eliminar la fila' });
  } finally {
    connection.release();
  }
};

// Actualizar datos del asiento (número o fila asignada)
const actualizarAsiento = async (req, res) => {
  const { id } = req.params;
  const { numero_asiento, id_fila } = req.body;

  try {
    const fields = [];
    const values = [];
    if (numero_asiento !== undefined) { fields.push('numero_asiento = ?'); values.push(Number(numero_asiento)); }
    if (id_fila !== undefined) { fields.push('id_fila = ?'); values.push(Number(id_fila)); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nada que actualizar' });
    }

    values.push(Number(id));
    const [result] = await db.execute(`UPDATE Asientos SET ${fields.join(', ')} WHERE id_asiento = ?`, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Asiento no encontrado' });
    }

    res.json({ message: 'Asiento actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar asiento:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el asiento' });
  }
};

module.exports = {
  listarZonasYFilas,
  obtenerAsientos,
  crearFila,
  crearAsiento,
  actualizarEstadoAsiento,
  actualizarAsiento,
  eliminarAsiento,
  eliminarFila
};

