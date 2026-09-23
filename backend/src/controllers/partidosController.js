//Importacion de Herramientas
const db = require('../config/db');

function dateOnly(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value || '').slice(0, 10);
}

function isDateWithinRange(date, start, end) {
  const matchDate = dateOnly(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(matchDate) && matchDate >= dateOnly(start) && matchDate <= dateOnly(end);
}

async function getTournamentRange(connection, tournamentId) {
  const [rows] = await connection.execute(
    'SELECT fecha_inicio, fecha_fin FROM Torneos WHERE id_torneo = ?',
    [tournamentId]
  );
  return rows[0] || null;
}

//Obtiene la lista de partidos con estadísticas de asientos por partido
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

//Obtiene la lista de torneos
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

//Función para crear un nuevo partido y generar sus asientos correspondientes
const crearPartido = async (req, res) => {
  //Datos del partido
  const { nombre_partido, jornada, fecha, id_torneo } = req.body;

  //Valida que los datos del partido sean correctos
  if (!nombre_partido || !jornada || !fecha) {
    return res.status(400).json({ message: 'Nombre, jornada y fecha son requeridos' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const torneoId = Number(id_torneo) || 1;
    const torneo = await getTournamentRange(connection, torneoId);
    if (!torneo) {
      await connection.rollback();
      return res.status(400).json({ message: 'El torneo seleccionado no existe' });
    }
    if (!isDateWithinRange(fecha, torneo.fecha_inicio, torneo.fecha_fin)) {
      await connection.rollback();
      return res.status(400).json({ message: 'La fecha del partido debe estar dentro del periodo del torneo' });
    }

    //Se inserta el nuevo partido
    const [result] = await connection.execute(
      'INSERT INTO Partidos (nombre_partido, jornada, fecha, id_torneo) VALUES (?, ?, ?, ?)',
      [nombre_partido, jornada, fecha, torneoId]
    );
    //Se obtiene el id del nuevo partido
    const partidoId = result.insertId;

    //Se obtienen los asientos de la tabla Asientos
    const [asientos] = await connection.execute('SELECT id_asiento FROM Asientos');
    //Si se encuentran asientos
    if (asientos.length > 0) {
      //Se obtienen los ids de los asientos
      const values = asientos.map(a => `(${partidoId}, ${a.id_asiento}, 'disponible')`).join(',');
      //Se insertan los asientos en la tabla Asientos_Por_Partido
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

//Función para actualizar un partido
const actualizarPartido = async (req, res) => {
  const { id } = req.params;
  const { nombre_partido, jornada, fecha } = req.body;

  try {
    const [[partidoActual]] = await db.execute(
      `SELECT p.fecha, p.id_torneo, t.fecha_inicio, t.fecha_fin
       FROM Partidos p
       INNER JOIN Torneos t ON t.id_torneo = p.id_torneo
       WHERE p.id_partido = ?`,
      [id]
    );
    if (!partidoActual) {
      return res.status(404).json({ message: 'Partido no encontrado' });
    }

    const fechaFinal = fecha || partidoActual.fecha;
    if (!isDateWithinRange(fechaFinal, partidoActual.fecha_inicio, partidoActual.fecha_fin)) {
      return res.status(400).json({ message: 'La fecha del partido debe estar dentro del periodo del torneo' });
    }

    //Se preparan los campos a actualizar
    const fields = [];
    const values = [];
    //Se valida que los campos sean correctos
    if (nombre_partido) { fields.push('nombre_partido = ?'); values.push(nombre_partido); }
    if (jornada !== undefined) { fields.push('jornada = ?'); values.push(jornada); }
    if (fecha) { fields.push('fecha = ?'); values.push(fecha); }

    //Si no hay campos a actualizar
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Nada que actualizar' });
    }

    values.push(id);
    //Se actualiza el partido
    const [result] = await db.execute(`UPDATE Partidos SET ${fields.join(', ')} WHERE id_partido = ?`, values);

    //Si no se encuentra el partido
    res.json({ message: 'Partido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar partido:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el partido' });
  }
};

//Función para eliminar un partido
const eliminarPartido = async (req, res) => {
  const { id } = req.params;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    //Se eliminan los asientos del partido
    await connection.execute('DELETE FROM Historial_Cambios WHERE id_asiento_partido IN (SELECT id_asiento_partido FROM Asientos_Por_Partido WHERE id_partido = ?)', [id]);
    await connection.execute('DELETE FROM Asientos_Por_Partido WHERE id_partido = ?', [id]);
    //Se elimina el partido
    const [result] = await connection.execute('DELETE FROM Partidos WHERE id_partido = ?', [id]);

    //Si no se encuentra el partido
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

//Función para crear un nuevo torneo
const crearTorneo = async (req, res) => {
  //Datos del torneo
  const { nombre_torneo, fecha_inicio, fecha_fin } = req.body;

  //Valida que el nombre del torneo sea correcto
  if (!nombre_torneo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ message: 'Nombre, fecha de inicio y fecha de fin son requeridos' });
  }
  if (dateOnly(fecha_inicio) > dateOnly(fecha_fin)) {
    return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
  }
  try {
    //Se inserta el nuevo torneo
    const [result] = await db.execute(
      'INSERT INTO Torneos (nombre_torneo, fecha_inicio, fecha_fin) VALUES (?, ?, ?)',
      [nombre_torneo, fecha_inicio, fecha_fin]
    );
    res.status(201).json({ message: 'Torneo creado exitosamente', id: result.insertId });
  } catch (error) {
    console.error('Error al crear torneo:', error.message);
    res.status(500).json({ message: 'No se pudo crear el torneo' });
  }
};

const actualizarTorneo = async (req, res) => {
  const torneoId = Number(req.params.id);
  const { nombre_torneo, fecha_inicio, fecha_fin } = req.body;

  if (!Number.isInteger(torneoId) || !nombre_torneo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ message: 'Nombre, fecha de inicio y fecha de fin son requeridos' });
  }
  if (dateOnly(fecha_inicio) > dateOnly(fecha_fin)) {
    return res.status(400).json({ message: 'La fecha de inicio no puede ser posterior a la fecha de fin' });
  }

  try {
    const [torneos] = await db.execute('SELECT id_torneo FROM Torneos WHERE id_torneo = ?', [torneoId]);
    if (torneos.length === 0) {
      return res.status(404).json({ message: 'Torneo no encontrado' });
    }

    const [partidos] = await db.execute(
      'SELECT fecha FROM Partidos WHERE id_torneo = ?',
      [torneoId]
    );
    const partidoFueraDeRango = partidos.some(partido => !isDateWithinRange(partido.fecha, fecha_inicio, fecha_fin));
    if (partidoFueraDeRango) {
      return res.status(409).json({ message: 'El nuevo periodo deja uno o más partidos fuera del rango del torneo' });
    }

    await db.execute(
      'UPDATE Torneos SET nombre_torneo = ?, fecha_inicio = ?, fecha_fin = ? WHERE id_torneo = ?',
      [nombre_torneo, fecha_inicio, fecha_fin, torneoId]
    );
    res.json({ message: 'Torneo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar torneo:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el torneo' });
  }
};

module.exports = {
  listarPartidos,
  listarTorneos,
  crearPartido,
  actualizarPartido,
  eliminarPartido,
  crearTorneo,
  actualizarTorneo
};
