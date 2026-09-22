const db = require('../config/db');

//Mapeos de estados entre el frontend y la base de datos
const ESTADOS_VALIDOS = ['available', 'reserved', 'sold'];
const ESTADOS_DB = { available: 'disponible', reserved: 'apartado', sold: 'vendido' };
const ESTADOS_FRONT = { disponible: 'available', apartado: 'reserved', vendido: 'sold' };
const TRANSICIONES_PERMITIDAS = {
  disponible: ['apartado', 'vendido'],
  apartado: ['vendido', 'disponible'],
  vendido: []
};

//Se obtiene la lista de todos los asientos y el ultimo cambio que se tiene
const listarAsientos = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT
        app.id_asiento_partido AS id,
        app.id_partido AS gameId,
        CONCAT('J', p.jornada) AS label,
        p.nombre_partido AS title,
        p.fecha,
        CONCAT(REPLACE(f.nombre_fila, '/ Fila ', '/'), '/', a.numero_asiento) AS seat,
        LOWER(z.nombre_zona) AS zone,
        CASE app.estado WHEN 'disponible' THEN 'available' WHEN 'apartado' THEN 'reserved' WHEN 'vendido' THEN 'sold' END AS status,
        h.id_usuario AS lastUserId,
        u.nombre AS lastUser,
        h.fecha_cambio AS lastChangedAt
      FROM Asientos_Por_Partido app
      INNER JOIN Partidos p ON p.id_partido = app.id_partido
      INNER JOIN Asientos a ON a.id_asiento = app.id_asiento
      INNER JOIN Filas f ON f.id_fila = a.id_fila
      INNER JOIN Zonas z ON z.id_zona = f.id_zona
      LEFT JOIN Historial_Cambios h ON h.id_historial = (
        SELECT h2.id_historial
        FROM Historial_Cambios h2
        WHERE h2.id_asiento_partido = app.id_asiento_partido
        ORDER BY h2.fecha_cambio DESC, h2.id_historial DESC
        LIMIT 1
      )
      LEFT JOIN Usuarios u ON u.id_usuario = h.id_usuario
      ORDER BY p.fecha, app.id_asiento_partido
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al listar asientos:', error.message);
    res.status(500).json({ message: 'No se pudieron cargar los asientos' });
  }
};

//Actualizar el estado de un asiento y registra la modificacion
const actualizarEstado = async (req, res) => {
  const { estado } = req.body;
  const asientoId = Number(req.params.id);
  const estadoDb = ESTADOS_DB[estado];

  //Valida los datos(Asiento, Estado)
  if (!Number.isInteger(asientoId) || !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ message: 'Asiento o estado inválido' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    //Consultar estado actual del asiento
    const [asientos] = await connection.execute(
      'SELECT estado FROM Asientos_Por_Partido WHERE id_asiento_partido = ? FOR UPDATE',
      [asientoId]
    );

    if (asientos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Asiento no encontrado' });
    }

    const estadoAnterior = asientos[0].estado;
    if (estadoAnterior === estadoDb) {
      await connection.commit();
      return res.json({ message: 'El asiento ya tiene ese estado', status: estado });
    }

    if (!TRANSICIONES_PERMITIDAS[estadoAnterior]?.includes(estadoDb)) {
      await connection.rollback();
      return res.status(409).json({
        message: estadoAnterior === 'vendido'
          ? 'Un asiento vendido no puede cambiar de estado'
          : 'La transición de estado solicitada no está permitida'
      });
    }

    //Se guarda el nuevo estado del asiento
    await connection.execute(
      'UPDATE Asientos_Por_Partido SET estado = ? WHERE id_asiento_partido = ?',
      [estadoDb, asientoId]
    );

    //Se registra el cambio en la tabla de historial de cambios
    await connection.execute(
      `INSERT INTO Historial_Cambios
        (id_asiento_partido, id_usuario, estado_anterior, estado_nuevo, fecha_cambio)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [asientoId, req.usuario.id, estadoAnterior, estadoDb]
    );

    await connection.commit();
    res.json({ message: 'Estado actualizado', status: ESTADOS_FRONT[estadoDb] });
  } catch (error) {
    await connection.rollback();
    console.error('Error al actualizar estado del asiento:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el estado del asiento' });
  } finally {
    connection.release();
  }
};

module.exports = { listarAsientos, actualizarEstado };
