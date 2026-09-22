const db = require('../config/db');

// Obtener lista de partidos con estadísticas de asientos por partido
const listarPartidos = async (req, res) => {
  try {
    const [partidos] = await db.execute(`
      SELECT 
        p.id_partido AS id,
        p.nombre_partido,
        p.jornada,
        p.fecha,
        p.id_torneo,
        t.nombre_torneo,
        COALESCE(SUM(CASE WHEN app.estado = 'disponible' THEN 1 ELSE 0 END), 0) AS disponibles,
        COALESCE(SUM(CASE WHEN app.estado = 'apartado' THEN 1 ELSE 0 END), 0) AS apartados,
        COALESCE(SUM(CASE WHEN app.estado = 'vendido' THEN 1 ELSE 0 END), 0) AS vendidos,
        COUNT(app.id_asiento_partido) AS total_asientos
      FROM Partidos p
      LEFT JOIN Torneos t ON t.id_torneo = p.id_torneo
      LEFT JOIN Asientos_Por_Partido app ON app.id_partido = p.id_partido
      GROUP BY p.id_partido, p.nombre_partido, p.jornada, p.fecha, p.id_torneo, t.nombre_torneo
      ORDER BY p.jornada ASC, p.fecha ASC
    `);

    res.json(partidos);
  } catch (error) {
    console.error('Error al listar partidos:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar los partidos' });
  }
};

// Obtener lista de torneos
const listarTorneos = async (req, res) => {
  try {
    const [torneos] = await db.execute(`
      SELECT 
        t.id_torneo AS id,
        t.nombre_torneo,
        t.fecha_inicio,
        t.fecha_fin,
        COUNT(p.id_partido) AS total_partidos
      FROM Torneos t
      LEFT JOIN Partidos p ON p.id_torneo = t.id_torneo
      GROUP BY t.id_torneo, t.nombre_torneo, t.fecha_inicio, t.fecha_fin
      ORDER BY t.id_torneo DESC
    `);
    res.json(torneos);
  } catch (error) {
    console.error('Error al listar torneos:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar los torneos' });
  }
};

// Crear un nuevo partido y generar sus asientos correspondientes
const crearPartido = async (req, res) => {
  const { nombre_partido, jornada, fecha, id_torneo } = req.body;

  if (!nombre_partido || !jornada || !fecha) {
    return res.status(400).json({ message: 'Nombre, jornada y fecha son requeridos' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const torneoId = id_torneo || 1;

    const [result] = await connection.execute(
      'INSERT INTO Partidos (nombre_partido, jornada, fecha, id_torneo) VALUES (?, ?, ?, ?)',
      [nombre_partido, jornada, fecha, torneoId]
    );

    const partidoId = result.insertId;

    // Poblar asientos para este nuevo partido tomando los existentes de la tabla Asientos
    const [asientos] = await connection.execute('SELECT id_asiento FROM Asientos');
    if (asientos.length > 0) {
      const values = asientos.map(a => `(${partidoId}, ${a.id_asiento}, 'disponible')`).join(',');
      await connection.query(`INSERT INTO Asientos_Por_Partido (id_partido, id_asiento, estado) VALUES ${values}`);
    }

    await connection.commit();
    res.status(201).json({ message: 'Partido creado exitosamente', id: partidoId });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear partido:', error.message);
    res.status(500).json({ message: 'No se pudo crear el partido' });
  } finally {
    connection.release();
  }
};

// Actualizar partido
const actualizarPartido = async (req, res) => {
  const { id } = req.params;
  const { nombre_partido, jornada, fecha } = req.body;

  try {
    const fields = [];
    const values = [];

    if (nombre_partido) { fields.push('nombre_partido = ?'); values.push(nombre_partido); }
    if (jornada !== undefined) { fields.push('jornada = ?'); values.push(jornada); }
    if (fecha) { fields.push('fecha = ?'); values.push(fecha); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nada que actualizar' });
    }

    values.push(id);
    const [result] = await db.execute(`UPDATE Partidos SET ${fields.join(', ')} WHERE id_partido = ?`, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Partido no encontrado' });
    }

    res.json({ message: 'Partido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar partido:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el partido' });
  }
};

// Eliminar partido
const eliminarPartido = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute('DELETE FROM Historial_Cambios WHERE id_asiento_partido IN (SELECT id_asiento_partido FROM Asientos_Por_Partido WHERE id_partido = ?)', [id]);
    await connection.execute('DELETE FROM Asientos_Por_Partido WHERE id_partido = ?', [id]);
    const [result] = await connection.execute('DELETE FROM Partidos WHERE id_partido = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Partido no encontrado' });
    }

    await connection.commit();
    res.json({ message: 'Partido eliminado exitosamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar partido:', error.message);
    res.status(500).json({ message: 'No se pudo eliminar el partido' });
  } finally {
    connection.release();
  }
};

// Crear torneo
const crearTorneo = async (req, res) => {
  const { nombre_torneo, fecha_inicio, fecha_fin } = req.body;
  if (!nombre_torneo) {
    return res.status(400).json({ message: 'Nombre del torneo es requerido' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO Torneos (nombre_torneo, fecha_inicio, fecha_fin) VALUES (?, ?, ?)',
      [nombre_torneo, fecha_inicio || new Date(), fecha_fin || new Date()]
    );
    res.status(201).json({ message: 'Torneo creado exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error al crear torneo:', error.message);
    res.status(500).json({ message: 'No se pudo crear el torneo' });
  }
};

module.exports = {
  listarPartidos,
  listarTorneos,
  crearPartido,
  actualizarPartido,
  eliminarPartido,
  crearTorneo
};
