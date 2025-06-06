const { app, BrowserWindow, ipcMain } = require('electron')

const fs = require('fs');
const path = require('path');
// npm install cassandra-driver
const cassandra = require('cassandra-driver');
// npm install readline-sync
const readlineSync = require('readline-sync');
// npm install csv-parse
const { parse: csvParse } = require('csv-parse/sync');

const Uuid = cassandra.types.Uuid; // Para manejar valores UUID en Cassandra
const BigDecimal = cassandra.types.BigDecimal; // Para manejar valores decimales grandes
const LocalDate = cassandra.types.LocalDate; // Para manejar fechas sin hora (YYYY-MM-DD)

const prefix = `  Console  |`; /// Decorador
const ip = 'localhost'; // IP del Cassandra

// Configuración de conexión a Cassandra
const client = new cassandra.Client({
    contactPoints: [`${ip}`], 
    localDataCenter: 'datacenter1', // El data center en docker-compose.yml
});


/// FUNCIONES

// Inicializa el keyspace y todas las tablas necesarias para la aplicación.
// Esta función crea las tablas solo si no existen, usando IF NOT EXISTS.
// Se ejecuta al inicio del programa para asegurar que la estructura esté lista.
async function iniciar() {

    const createTableQueries = [

        // Tabla de usuarios por ID (búsqueda directa por UUID)
        `CREATE TABLE IF NOT EXISTS usuarios_id (
        usuario_id uuid PRIMARY KEY,
        nombre text,
        ciudad text
        );`,

        // Tabla de usuarios por ciudad (permite buscar usuarios por ciudad)
        `CREATE TABLE IF NOT EXISTS usuarios_ciudad (
        usuario_id uuid,
        nombre text,
        ciudad text,
        PRIMARY KEY ((ciudad), usuario_id)
        );`,

        // Tabla de canciones por ID (búsqueda directa por UUID)
        `CREATE TABLE IF NOT EXISTS canciones_id (
        cancion_id uuid PRIMARY KEY,
        artista text,
        titulo text,
        genero text,
        duracion decimal
        );`,

        // Tabla de canciones por artista (permite buscar canciones por artista y título)
        `CREATE TABLE IF NOT EXISTS canciones_artista (
        cancion_id uuid,
        artista text,
        titulo text,
        genero text,
        duracion decimal,
        PRIMARY KEY ((artista), titulo, cancion_id)
        );`,

        // Tabla de escuchas diarias por usuario (registra cada evento de escucha individual)
        `CREATE TABLE IF NOT EXISTS escuchas_diarias_usuario (
        usuario_id uuid,
        cancion_id uuid,
        fecha_escucha date,
        minutos_escucha decimal, 
        cancion_titulo text,
        cancion_artista text,
        cancion_genero text,
        PRIMARY KEY ((usuario_id), fecha_escucha, cancion_id)
        ) WITH CLUSTERING ORDER BY (fecha_escucha DESC);`,

        // Tabla de totales acumulados de minutos escuchados por usuario y canción
        `CREATE TABLE IF NOT EXISTS minutos_usuario (
        usuario_id uuid,
        cancion_id uuid,
        total_minutos decimal,
        PRIMARY KEY ((usuario_id), cancion_id)
        );`,

        // Tabla de top canciones más escuchadas por usuario
        `CREATE TABLE IF NOT EXISTS mas_escuchados_usuario (
        usuario_id uuid,
        cancion_id uuid,
        total_minutos decimal,
        PRIMARY KEY ((usuario_id), total_minutos, cancion_id)
        ) WITH CLUSTERING ORDER BY (total_minutos DESC);`,

        // Tabla de escuchas diarias por género
        `CREATE TABLE IF NOT EXISTS escuchas_diarias_genero (
        cancion_id uuid,
        fecha_escucha date,
        genero_cancion text,
        artista_cancion text,
        titulo_cancion text,
        minutos_escucha decimal, 
        PRIMARY KEY ((genero_cancion), fecha_escucha, cancion_id)
        ) WITH CLUSTERING ORDER BY (fecha_escucha DESC);`,

        // Tabla de totales acumulados de minutos escuchados por género y canción
        `CREATE TABLE IF NOT EXISTS minutos_genero (
        genero_cancion text,
        cancion_id uuid,
        total_minutos decimal,
        PRIMARY KEY ((genero_cancion), cancion_id)
        );`,

        // Tabla de top canciones más escuchadas por género
        `CREATE TABLE IF NOT EXISTS mas_escuchados_genero (
        genero_cancion text,
        cancion_id uuid,
        total_minutos decimal,
        PRIMARY KEY ((genero_cancion), total_minutos, cancion_id)
        ) WITH CLUSTERING ORDER BY (total_minutos DESC);`,

        // Tabla de escuchas diarias por ciudad
        `CREATE TABLE IF NOT EXISTS escuchas_diarias_ciudad (
        cancion_id uuid,
        ciudad text,
        fecha_escucha date,
        genero_cancion text,
        artista_cancion text,
        titulo_cancion text,
        minutos_escucha decimal,
        PRIMARY KEY ((ciudad), fecha_escucha, cancion_id)
        ) WITH CLUSTERING ORDER BY (fecha_escucha DESC);`,

        // Tabla de totales acumulados de minutos escuchados por ciudad y canción
        `CREATE TABLE IF NOT EXISTS minutos_ciudad (
        ciudad text,
        cancion_id uuid,
        total_minutos decimal,
        PRIMARY KEY ((ciudad), cancion_id)
        );`,
        
        // Tabla de top canciones más escuchadas por ciudad
        `CREATE TABLE IF NOT EXISTS mas_escuchados_ciudad (
        ciudad text,
        cancion_id uuid,
        total_minutos decimal,
        PRIMARY KEY ((ciudad), total_minutos, cancion_id)
        ) WITH CLUSTERING ORDER BY (total_minutos DESC);`,

    ];
    
    // Crea el keyspace si no existe y lo selecciona
    await client.execute(`CREATE KEYSPACE IF NOT EXISTS recom_musica WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};`);
    await client.execute(`USE recom_musica;`);

    console.log(`${prefix} Usando keyspace 'recom_musica'. Creando tablas. . .`);

    // Ejecuta cada consulta de creación de tabla
    for (const query of createTableQueries) {   
        await client.execute(query, { prepare: true });
        // Muestra el nombre de la tabla creada en el log
        console.log(`${prefix} Tabla creada: ${query.split(' ')[5]}`);
    }
    console.log(`${prefix} Tablas creadas correctamente.`);
}

async function iniciarCassandra(){
    try {

        await client.connect()
        console.log(`${prefix} Conectado a Cassandra [${ip}]`);

        await iniciar();
        console.log(`${prefix} Tablas inicializadas correctamente.`);

        
    } catch (error) {
        console.error(`${prefix} Error al conectar a Cassandra [${ip}]:`, error);
        throw new Error(`${prefix} Error al conectar a Cassandra [${ip}]:`, error);
        
    }
}

async function cerrarCassandra(){
    await client.shutdown();
    console.log(`${prefix} Conexión a Cassandra cerrada.`);
}


///FUNCIONES DE CONSULTAS

/**
 * Consulta todos los usuarios en la tabla 'usuarios_id' y los muestra en una tabla con índice.
 * @returns {Promise<Array>} Lista de usuarios con índice para selección/eliminación.
 */
async function consultarUsuarios() {
    try {
        const res = await client.execute('SELECT * FROM usuarios_id');
        // Generar la tabla con las claves correctas para el frontend
        const table = res.rows.map((u) => ({
            Usuario_id: u.usuario_id ? u.usuario_id.toString() : '',
            nombre: u.nombre ?? '',
            ciudad: u.ciudad ?? ''
        }));
        return table;
    } catch (err) {
        console.error('Error al consultar usuarios:', err);
        throw err;
    }
}

/**
 * Consulta todas las canciones en la tabla 'canciones_id' y las muestra en una tabla con índice.
 * @returns {Promise<Array>} Lista de canciones con índice para selección/eliminación.
 */
async function consultarCanciones() {
    try {
        const res = await client.execute('SELECT * FROM canciones_id');
        const table = res.rows.map((c) => ({
            ID: c.cancion_id.toString(),
            Titulo: c.titulo,
            Artista: c.artista,
            Genero: c.genero,
            Duracion: c.duracion.toString()
        }));

        return table;
    } catch (err) {
        console.error('Error al consultar canciones:', err);
        throw err;
    }
}

/**
 * Consulta todas las escuchas diarias por usuario en la tabla 'escuchas_diarias_usuario'.
 * @returns {Promise<Array>} Lista de escuchas diarias por usuario con índice.
 */
async function consultarEscuchasDiariasUsuario() {
    try {
        const res = await client.execute('SELECT * FROM escuchas_diarias_usuario');
        const table = res.rows.map((e) => ({

            Usuario_id: e.usuario_id.toString(),
            Fecha: e.fecha_escucha.toString(),
            Artista: e.cancion_artista,
            Titulo: e.cancion_titulo,
            Genero: e.cancion_genero,
            Minutos: e.minutos_escucha.toString(),
        }));
        return table;
    } catch (err) {
        console.error('Error al consultar escuchas diarias usuario:', err);
        throw err;
    }
}

/**
 * Consulta todas las escuchas diarias por género en la tabla 'escuchas_diarias_genero'.
 * @returns {Promise<Array>} Lista de escuchas diarias por género con índice.
 */
async function consultarEscuchasDiariasGenero() {
    try {
        const res = await client.execute('SELECT * FROM escuchas_diarias_genero');
        const table = res.rows.map((e) => ({
            
            Genero: e.genero_cancion,
            Fecha: e.fecha_escucha.toString(),
            Artista: e.artista_cancion,
            Titulo: e.titulo_cancion,
            Minutos: e.minutos_escucha.toString()
        }));

        return table;
    } catch (err) {
        console.error('Error al consultar escuchas diarias por género:', err);
        throw err;
    }
}

/**
 * Consulta todas las escuchas diarias por ciudad en la tabla 'escuchas_diarias_ciudad'.
 * @returns {Promise<Array>} Lista de escuchas diarias por ciudad con índice.
 */
async function consultarEscuchasDiariasCiudad() {
    try {
        const res = await client.execute('SELECT * FROM escuchas_diarias_ciudad');
        const table = res.rows.map((e) => ({
            
            Ciudad: e.ciudad,
            Fecha: e.fecha_escucha.toString(),
            Artista: e.artista_cancion,
            Titulo: e.titulo_cancion,
            Genero: e.genero_cancion,
            Minutos: e.minutos_escucha.toString()
        }));

        return table;
    } catch (err) {
        console.error('Error al consultar escuchas diarias por ciudad:', err);
        throw err;
    }
}

///FUNCIONES BUSQUEDA

/**
 * Busca la información de una canción por su ID en la tabla 'canciones_id'.
 * @param {object} params Objeto con { cancion_id }
 * @returns {Promise<object|null>} Objeto con los datos de la canción o null si no existe.
 */
async function buscarCancionPorId({ cancion_id }) {
    try {
        const res = await client.execute(
            'SELECT * FROM canciones_id WHERE cancion_id = ?',
            [
                typeof cancion_id === 'string' ? Uuid.fromString(cancion_id) : cancion_id
            ],
            { prepare: true }
        );
        if (res.rows.length > 0) {
            const c = res.rows[0];
            return {
                cancion_id: c.cancion_id,
                artista: c.artista,
                titulo: c.titulo,
                genero: c.genero,
                duracion: c.duracion
            };
        }
        return null;
    } catch (err) {
        console.error('Error al buscar canción por ID:', err);
        return null;
    }
}

/**
 * Busca la información de un usuario por su ID en la tabla 'usuarios_id'.
 * @param {object} params Objeto con { usuario_id }
 * @returns {Promise<object|null>} Objeto con los datos del usuario o null si no existe.
 */
async function buscarUsuarioPorId({ usuario_id }) {
    try {
        const res = await client.execute(
            'SELECT * FROM usuarios_id WHERE usuario_id = ?',
            [
                typeof usuario_id === 'string' ? Uuid.fromString(usuario_id) : usuario_id
            ],
            { prepare: true }
        );
        if (res.rows.length > 0) {
            const u = res.rows[0];
            return {
                usuario_id: u.usuario_id,
                nombre: u.nombre,
                ciudad: u.ciudad
            };
        }
        return null;
    } catch (err) {
        console.error('Error al buscar usuario por ID:', err);
        return null;
    }
}



/**
 * Busca los primeros 10 registros de canciones más escuchadas por usuario en la tabla mas_escuchados_usuario.
 * Solo muestra información relevante para análisis OLAP: Título, Artista, TotalMinutos.
 * @param {string} usuario_id UUID del usuario.
 * @returns {Promise<Array>} Lista de registros mas_escuchados_usuario.
 */
async function buscarMinutosPorUsuario(usuario_id) {
    try {
        // Se requiere JOIN manual para obtener título/artista, ya que mas_escuchados_usuario solo tiene IDs.
        const res = await client.execute(
            'SELECT * FROM mas_escuchados_usuario WHERE usuario_id = ? LIMIT 10',
            [typeof usuario_id === 'string' ? Uuid.fromString(usuario_id) : usuario_id],
            { prepare: true }
        );
        const registros = [];
        for (const m of res.rows) {
            // Buscar detalles de la canción
            const cancion = await buscarCancionPorId({ cancion_id: m.cancion_id });
            registros.push({
                Titulo: cancion ? cancion.titulo : 'N/A',
                Artista: cancion ? cancion.artista : 'N/A',
                TotalMinutos: m.total_minutos.toString()
            });
        }

        return registros;
    } catch (err) {
        console.error(`Error al buscar canciones más escuchadas por usuario '${usuario_id}':`, err);
        return [];
    }
}

/**
 * Busca los primeros 10 registros de canciones más escuchadas por género.
 * Solo muestra información relevante para análisis OLAP: Título, Artista, TotalMinutos.
 * @param {string} genero Nombre del género.
 * @returns {Promise<Array>} Lista de registros mas_escuchados_genero.
 */
async function buscarMinutosPorGenero(genero) {
    try {
        const res = await client.execute(
            'SELECT * FROM mas_escuchados_genero WHERE genero_cancion = ? LIMIT 10',
            [genero],
            { prepare: true }
        );
        const registros = [];
        for (const m of res.rows) {
            const cancion = await buscarCancionPorId({ cancion_id: m.cancion_id });
            registros.push({
                Titulo: cancion ? cancion.titulo : 'N/A',
                Artista: cancion ? cancion.artista : 'N/A',
                TotalMinutos: m.total_minutos.toString()
            });
        }

        return registros;
    } catch (err) {
        console.error(`Error al buscar canciones más escuchadas por género '${genero}':`, err);
        return [];
    }
}

/**
 * Busca los primeros 10 registros de canciones más escuchadas por ciudad.
 * Solo muestra información relevante para análisis OLAP: Título, Artista, TotalMinutos.
 * @param {string} ciudad Nombre de la ciudad.
 * @returns {Promise<Array>} Lista de registros mas_escuchados_ciudad.
 */
async function buscarMinutosPorCiudad(ciudad) {
    try {
        const res = await client.execute(
            'SELECT * FROM mas_escuchados_ciudad WHERE ciudad = ? LIMIT 10',
            [ciudad],
            { prepare: true }
        );
        const registros = [];
        for (const m of res.rows) {
            const cancion = await buscarCancionPorId({ cancion_id: m.cancion_id });
            registros.push({
                Titulo: cancion ? cancion.titulo : 'N/A',
                Artista: cancion ? cancion.artista : 'N/A',
                TotalMinutos: m.total_minutos.toString()
            });
        }

        return registros;
    } catch (err) {
        console.error(`Error al buscar canciones más escuchadas por ciudad '${ciudad}':`, err);
        return [];
    }
}


/// FUNCIONES INSERTAR

/**
 * Inserta un nuevo usuario en las tablas 'usuarios_id' y 'usuarios_ciudad' usando un batch.
 * @param {string} nombre Nombre del usuario.
 * @param {string} ciudad Ciudad del usuario.
 * @returns {Promise<Uuid>} El usuario_id generado.
 */
async function insertarUsuario(nombre, ciudad) {
    const usuarioId = Uuid.random();
    const queries = [
        {
            query: `INSERT INTO usuarios_id (usuario_id, nombre, ciudad) VALUES (?, ?, ?)`,
            params: [usuarioId, nombre, ciudad]
        },
        {
            query: `INSERT INTO usuarios_ciudad (usuario_id, nombre, ciudad) VALUES (?, ?, ?)`,
            params: [usuarioId, nombre, ciudad]
        }
    ];
    try {
        await client.batch(queries, { prepare: true, logged: false });
        console.log(`Usuario '${nombre}' (${usuarioId}) en '${ciudad}' insertado en ambas tablas.`);
        return usuarioId;
    } catch (err) {
        console.error(`Error al insertar usuario '${nombre}':`, err);
        throw err;
    }
}

/**
 * Inserta una nueva canción en las tablas 'canciones_id' y 'canciones_artista' usando un batch.
 * @param {object} songData Objeto con { artista, titulo, genero, duracion }
 * @returns {Promise<Uuid>}
 */
async function insertarCancion(songData) {
    const cancionId = Uuid.random();
    const duracion = songData.duracion;
    const duracionDecimal = BigDecimal.fromString(duracion.toString());

    const queries = [
        {
            query: `INSERT INTO canciones_id (cancion_id, artista, titulo, genero, duracion) VALUES (?, ?, ?, ?, ?)`,
            params: [cancionId, songData.artista, songData.titulo, songData.genero, duracionDecimal]
        },
        {
            query: `INSERT INTO canciones_artista (cancion_id, artista, titulo, genero, duracion) VALUES (?, ?, ?, ?, ?)`,
            params: [cancionId, songData.artista, songData.titulo, songData.genero, duracionDecimal]
        }
    ];

    try {
        await client.batch(queries, { prepare: true, logged: false });
        console.log(`Canción '${songData.titulo}' de '${songData.artista}' (${cancionId}) insertada en ambas tablas.`);
        return cancionId;
    } catch (err) {
        console.error(`Error al insertar canción '${songData.titulo}':`, err);
        throw err;
    }
}



/**
 * Registra una nueva escucha de canción y actualiza los totales acumulados
 * (minutos_usuario, minutos_genero, minutos_ciudad) usando un BATCH.
 * Para los totales acumulados, se sigue la lógica de:
 * 1. Leer el total_minutos actual.
 * 2. Eliminar el registro anterior con el total_minutos antiguo.
 * 3. Insertar un nuevo registro con el total_minutos actualizado.
 * Todas estas operaciones se agrupan en un batch para asegurar atomicidad.
 *
 * @param {string} usuarioId UUID del usuario que escuchó la canción.
 * @param {string} cancionId UUID de la canción escuchada.
 * @param {number} minutosEscucha Duración de esta escucha en minutos.
 * @param {object} songDetails Detalles de la canción para desnormalización { titulo, artista, genero }.
 * @param {string} ciudadUsuario Ciudad del usuario para escuchas_ciudad.
 * @param {object} [fecha] (Opcional) Instancia de LocalDate o string 'YYYY-MM-DD'. Si no se provee, se usa la fecha actual.
 */
async function registrarEscucha(usuarioId, cancionId, minutosEscucha, songDetails, ciudadUsuario, fecha) {
    let fechaActual;

    if (fecha) {
        if (typeof fecha === 'string') {
            fechaActual = LocalDate.fromString(fecha);
        } else {
            fechaActual = fecha;
        }
    } else {
        fechaActual = LocalDate.fromDate(new Date());
    }
    const queries = [];

    // --- Lógica para 'escuchas_diarias_usuario'  ---
    let oldMinutosEscuchaUsuario = 0;
    try {
        // 1. **SELECT**: Buscar si ya existe una escucha para este usuario, fecha y canción.
        const res = await client.execute(
        `SELECT minutos_escucha FROM escuchas_diarias_usuario WHERE usuario_id = ? AND fecha_escucha = ? AND cancion_id = ?`,
        [usuarioId, fechaActual, cancionId],
        { prepare: true }
        );
        if (res.rows.length > 0) {
        oldMinutosEscuchaUsuario = res.rows[0].minutos_escucha.toNumber(); // Convertir BigDecimal a número
        }
    } catch (err) {
        console.warn(`Advertencia: No se pudo obtener minutos_escucha de escuchas_diarias_usuario. Error: ${err.message}`);
    }

    const newMinutosEscuchaUsuario = BigDecimal.fromString((oldMinutosEscuchaUsuario + minutosEscucha).toString());
    // 2. **INSERT (como UPSERT)**: Si la clave primaria existe, la fila se actualiza. Si no, se inserta una nueva.
    queries.push({
        query: `INSERT INTO escuchas_diarias_usuario (usuario_id, cancion_id, fecha_escucha, minutos_escucha, cancion_titulo, cancion_artista, cancion_genero) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [
        usuarioId,
        cancionId,
        fechaActual,
        newMinutosEscuchaUsuario, // Este es el valor que se actualizará/insertará
        songDetails.titulo,
        songDetails.artista,
        songDetails.genero
        ]
    });

        // --- Lógica para minutos_usuario y mas_escuchados_usuario ---
        let oldTotalMinutosUsuario = null;
        try {
            // Leer el registro actual de minutos_usuario
            const res = await client.execute(
                `SELECT total_minutos FROM minutos_usuario WHERE usuario_id = ? AND cancion_id = ?`,
                [Uuid.fromString(usuarioId), Uuid.fromString(cancionId)],
                { prepare: true }
            );
            if (res.rows.length > 0) {
                oldTotalMinutosUsuario = res.rows[0].total_minutos;
                // Eliminar de minutos_usuario
                queries.push({
                    query: `DELETE FROM minutos_usuario WHERE usuario_id = ? AND cancion_id = ?`,
                    params: [Uuid.fromString(usuarioId), Uuid.fromString(cancionId)]
                });
                // Eliminar de mas_escuchados_usuario
                queries.push({
                    query: `DELETE FROM mas_escuchados_usuario WHERE usuario_id = ? AND total_minutos = ? AND cancion_id = ?`,
                    params: [Uuid.fromString(usuarioId), oldTotalMinutosUsuario, Uuid.fromString(cancionId)]
                });
                oldTotalMinutosUsuario = oldTotalMinutosUsuario.toNumber();
            }
        } catch (err) {
            console.warn(`Advertencia: No se pudo obtener el total_minutos_usuario para ${usuarioId} - ${cancionId}, asumiendo 0. Error: ${err.message}`);
        }

        let newTotalMinutosUsuario = oldTotalMinutosUsuario ? (oldTotalMinutosUsuario + minutosEscucha) : minutosEscucha;
        newTotalMinutosUsuario = BigDecimal.fromString(newTotalMinutosUsuario.toString());
        // Insertar nuevo registro en minutos_usuario
        queries.push({
            query: `INSERT INTO minutos_usuario (usuario_id, cancion_id, total_minutos) VALUES (?, ?, ?)`,
            params: [Uuid.fromString(usuarioId), Uuid.fromString(cancionId), newTotalMinutosUsuario]
        });
        // Insertar nuevo registro en mas_escuchados_usuario
        queries.push({
            query: `INSERT INTO mas_escuchados_usuario (usuario_id, total_minutos, cancion_id) VALUES (?, ?, ?)`,
            params: [Uuid.fromString(usuarioId), newTotalMinutosUsuario, Uuid.fromString(cancionId)]
        });

        // --- Lógica para minutos_genero y mas_escuchados_genero ---
        let oldTotalMinutosGenero = null;
        try {
            // Consulta el total de minutos escuchados para una canción específica dentro de un género
            const res = await client.execute(
                `SELECT total_minutos FROM minutos_genero WHERE genero_cancion = ? AND cancion_id = ?`,
                [songDetails.genero, Uuid.fromString(cancionId)],
                { prepare: true }
            );
            if (res.rows.length > 0) {
                oldTotalMinutosGenero = res.rows[0].total_minutos;
                // Eliminar de minutos_genero
                queries.push({
                    query: `DELETE FROM minutos_genero WHERE genero_cancion = ? AND cancion_id = ?`,
                    params: [songDetails.genero, Uuid.fromString(cancionId)]
                });
                // Eliminar de mas_escuchados_genero
                queries.push({
                    query: `DELETE FROM mas_escuchados_genero WHERE genero_cancion = ? AND total_minutos = ? AND cancion_id = ?`,
                    params: [songDetails.genero, oldTotalMinutosGenero, Uuid.fromString(cancionId)]
                });
                oldTotalMinutosGenero = oldTotalMinutosGenero.toNumber();
            }
        } catch (err) {
            console.warn(`Advertencia: No se pudo obtener el total_minutos_genero para ${songDetails.genero} - ${cancionId}, asumiendo 0. Error: ${err.message}`);
        }
        let newTotalMinutosGenero = oldTotalMinutosGenero ? (oldTotalMinutosGenero + minutosEscucha) : minutosEscucha;
        let newTotalMinutosGeneroDecimal = BigDecimal.fromString(newTotalMinutosGenero.toString());
        // Insertar nuevo registro en minutos_genero
        queries.push({
            query: `INSERT INTO minutos_genero (genero_cancion, cancion_id, total_minutos) VALUES (?, ?, ?)`,
            params: [songDetails.genero, Uuid.fromString(cancionId), newTotalMinutosGeneroDecimal]
        });
        // Insertar nuevo registro en mas_escuchados_genero
        queries.push({
            query: `INSERT INTO mas_escuchados_genero (genero_cancion, total_minutos, cancion_id) VALUES (?, ?, ?)`,
            params: [songDetails.genero, newTotalMinutosGeneroDecimal, Uuid.fromString(cancionId)]
        });

        // --- Lógica para escuchas_diarias_genero ---
        // Insertar/actualizar registro en escuchas_diarias_genero
        queries.push({
            query: `INSERT INTO escuchas_diarias_genero (cancion_id, fecha_escucha, genero_cancion, artista_cancion, titulo_cancion, minutos_escucha) VALUES (?, ?, ?, ?, ?, ?)`,
            params: [
                Uuid.fromString(cancionId),
                fechaActual,
                songDetails.genero,
                songDetails.artista,
                songDetails.titulo,
                BigDecimal.fromString(minutosEscucha.toString())
            ]
        });

        // --- Lógica para minutos_ciudad y mas_escuchados_ciudad ---
        let oldTotalMinutosCiudad = null;
        try {
            const res = await client.execute(
                `SELECT total_minutos FROM minutos_ciudad WHERE ciudad = ? AND cancion_id = ?`,
                [ciudadUsuario, Uuid.fromString(cancionId)],
                { prepare: true }
            );
            if (res.rows.length > 0) {
                oldTotalMinutosCiudad = res.rows[0].total_minutos;
                // Eliminar de minutos_ciudad
                queries.push({
                    query: `DELETE FROM minutos_ciudad WHERE ciudad = ? AND cancion_id = ?`,
                    params: [ciudadUsuario, Uuid.fromString(cancionId)]
                });
                // Eliminar de mas_escuchados_ciudad
                queries.push({
                    query: `DELETE FROM mas_escuchados_ciudad WHERE ciudad = ? AND total_minutos = ? AND cancion_id = ?`,
                    params: [ciudadUsuario, oldTotalMinutosCiudad, Uuid.fromString(cancionId)]
                });
                oldTotalMinutosCiudad = oldTotalMinutosCiudad.toNumber();
            }
        } catch (err) {
            console.warn(`Advertencia: No se pudo obtener el minutos_ciudad para ${ciudadUsuario} - ${cancionId}, asumiendo 0. Error: ${err.message}`);
        }

        let newTotalMinutosCiudad = oldTotalMinutosCiudad ? (oldTotalMinutosCiudad + minutosEscucha) : minutosEscucha;
        let newTotalMinutosCiudadDecimal = BigDecimal.fromString(newTotalMinutosCiudad.toString());

        // Insertar nuevo registro en minutos_ciudad
        queries.push({
            query: `INSERT INTO minutos_ciudad (ciudad, cancion_id, total_minutos) VALUES (?, ?, ?)`,
            params: [ciudadUsuario, Uuid.fromString(cancionId), newTotalMinutosCiudadDecimal]
        });
        // Insertar nuevo registro en mas_escuchados_ciudad
        queries.push({
            query: `INSERT INTO mas_escuchados_ciudad (ciudad, total_minutos, cancion_id) VALUES (?, ?, ?)`,
            params: [ciudadUsuario, newTotalMinutosCiudadDecimal, Uuid.fromString(cancionId)]
        });

        // --- Lógica para escuchas_diarias_ciudad ---
        // Insertar/actualizar registro en escuchas_diarias_ciudad
        queries.push({
            query: `INSERT INTO escuchas_diarias_ciudad (cancion_id, ciudad, fecha_escucha, genero_cancion, artista_cancion, titulo_cancion, minutos_escucha) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            params: [
                Uuid.fromString(cancionId),
                ciudadUsuario,
                fechaActual,
                songDetails.genero,
                songDetails.artista,
                songDetails.titulo,
                BigDecimal.fromString(minutosEscucha.toString())
            ]
        });

    try {
        // Ejecutar todas las operaciones en un BATCH no loggeado
        await client.batch(queries, { prepare: true, logged: false });
        console.log(`Escucha de canción (${songDetails.titulo}) y actualizaciones de totales registradas para usuario ${usuarioId}.`);
    } catch (err) {
        console.error(`Error al registrar escucha y actualizar totales para usuario ${usuarioId} y canción ${cancionId}:`, err);
        throw err;
    }
}

async function regisEscucha(usuario_id, cancion_id, fecha_escucha){

    const usuario = await buscarUsuarioPorId({ usuario_id });
    const cancion = await buscarCancionPorId({ cancion_id });
    if (!usuario) {
        console.log('Usuario no encontrado.');
        return;
    }
    if (!cancion) {
        console.log('Canción no encontrada.');
        return;
    }
    // Tomar la duración de la canción como minutos de escucha
    const minutosEscucha = cancion.duracion.toNumber ? cancion.duracion.toNumber() : Number(cancion.duracion);
    let fecha = fecha_escucha && fecha_escucha.trim() !== '' ? fecha_escucha.trim() : undefined;
    await registrarEscucha(
        usuario_id,
        cancion_id,
        minutosEscucha,
        {
            titulo: cancion.titulo,
            artista: cancion.artista,
            genero: cancion.genero
        },
        usuario.ciudad,
        fecha
    );

}


/// FUNCIONES CSV




/**
 * Inserta usuarios desde un archivo CSV usando un batch.
 * El CSV debe tener columnas: usuario_id, nombre, ciudad (con encabezado).
 * @param {string} filePath Ruta al archivo CSV.
 */
async function insertarUsuariosDesdeCSV(filePath) {
    try {
        const absPath = path.resolve(filePath);
        const csvContent = fs.readFileSync(absPath, 'utf8');
        const records = csvParse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (!Array.isArray(records) || records.length === 0) {
            console.log('El archivo CSV no contiene registros.');
            return;
        }

        const queries = [];
        for (const row of records) {
            if (!row.usuario_id || !row.nombre || !row.ciudad) continue;
            let usuarioId;
            try {
                usuarioId = Uuid.fromString(row.usuario_id);
            } catch {
                console.warn(`UUID inválido para usuario: ${row.usuario_id}, se omite.`);
                continue;
            }
            queries.push({
                query: 'INSERT INTO usuarios_id (usuario_id, nombre, ciudad) VALUES (?, ?, ?)',
                params: [usuarioId, row.nombre, row.ciudad]
            });
            queries.push({
                query: 'INSERT INTO usuarios_ciudad (usuario_id, nombre, ciudad) VALUES (?, ?, ?)',
                params: [usuarioId, row.nombre, row.ciudad]
            });
        }

        if (queries.length === 0) {
            console.log('No se encontraron usuarios válidos en el CSV.');
            return;
        }

        await client.batch(queries, { prepare: true, logged: false });
        return`Se insertaron ${queries.length / 2} usuarios desde el archivo CSV.`;
    } catch (err) {
        console.error('Error al insertar usuarios desde CSV:', err);
    }
}
/**
 * Inserta canciones desde un archivo CSV usando un batch.
 * El CSV debe tener columnas: cancion_id, artista, titulo, genero, duracion (con encabezado).
 * Inserta cada canción tanto en canciones_id como en canciones_artista.
 * @param {string} filePath Ruta al archivo CSV.
 */
async function insertarCancionesDesdeCSV(filePath) {
    try {
        // Obtiene la ruta absoluta del archivo
        const absPath = path.resolve(filePath);
        // Lee el contenido del archivo CSV
        const csvContent = fs.readFileSync(absPath, 'utf8');
        // Parsea el contenido CSV a objetos usando encabezados de columna
        const records = csvParse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (!Array.isArray(records) || records.length === 0) {
            console.log('El archivo CSV no contiene registros.');
            return;
        }

        const queries = [];
        for (const row of records) {
            // Valida que existan todos los campos requeridos
            if (!row.cancion_id || !row.artista || !row.titulo || !row.genero || !row.duracion) continue;
            let cancionId;
            try {
                // Convierte el ID de la canción a UUID
                cancionId = Uuid.fromString(row.cancion_id);
            } catch {
                console.warn(`UUID inválido para canción: ${row.cancion_id}, se omite.`);
                continue;
            }
            // Convierte la duración a BigDecimal
            const duracionDecimal = BigDecimal.fromString(row.duracion.toString());
            // Inserta en canciones_id
            queries.push({
                query: 'INSERT INTO canciones_id (cancion_id, artista, titulo, genero, duracion) VALUES (?, ?, ?, ?, ?)',
                params: [cancionId, row.artista, row.titulo, row.genero, duracionDecimal]
            });
            // Inserta en canciones_artista
            queries.push({
                query: 'INSERT INTO canciones_artista (cancion_id, artista, titulo, genero, duracion) VALUES (?, ?, ?, ?, ?)',
                params: [cancionId, row.artista, row.titulo, row.genero, duracionDecimal]
            });
        }

        if (queries.length === 0) {
            console.log('No se encontraron canciones válidas en el CSV.');
            return;
        }

        // Ejecuta el batch de inserciones
        await client.batch(queries, { prepare: true, logged: false });
        return `Se insertaron ${queries.length / 2} canciones desde el archivo CSV.`;
    } catch (err) {
        console.error('Error al insertar canciones desde CSV:', err);
    }
}

/**
 * Inserta escuchas de canciones de usuarios desde un archivo CSV.
 * El CSV debe tener columnas: usuario_id, cancion_id, fecha_escucha (YYYY-MM-DD).
 * Busca los datos completos de usuario y canción para rellenar los campos necesarios.
 * Utiliza la función registrarEscucha para cada registro.
 * @param {string} filePath Ruta al archivo CSV.
 */
async function insertarEscuchasDesdeCSV(filePath) {
    let insertados = 0;
    try {
        const absPath = path.resolve(filePath);
        const csvContent = fs.readFileSync(absPath, 'utf8');
        const records = csvParse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (!Array.isArray(records) || records.length === 0) {
            console.log('El archivo CSV no contiene registros.');
            return;
        }

        
        for (const row of records) {
            const usuario_id = row.usuario_id;
            const cancion_id = row.cancion_id;
            const fecha_escucha = row.fecha_escucha;

            if (!usuario_id || !cancion_id || !fecha_escucha) continue;

            // Buscar usuario y canción
            const usuario = await buscarUsuarioPorId({ usuario_id });
            const cancion = await buscarCancionPorId({ cancion_id });

            if (!usuario || !cancion) {
                console.warn(`No se encontró usuario o canción para usuario_id=${usuario_id}, cancion_id=${cancion_id}.`);
                continue;
            }

            // Se asume 1 escucha = duración total de la canción
            const minutosEscucha = cancion.duracion.toNumber ? cancion.duracion.toNumber() : Number(cancion.duracion);

            // Convertir la fecha de escucha a LocalDate usando la constante LocalDate ya definida
            const fechaLocalDate = LocalDate.fromString(fecha_escucha);

            await registrarEscucha(
                usuario_id,
                cancion_id,
                minutosEscucha,
                {
                    titulo: cancion.titulo,
                    artista: cancion.artista,
                    genero: cancion.genero
                },
                usuario.ciudad,
                fechaLocalDate 
            );

            insertados++;
        }
        return `Se insertaron ${insertados} escuchas desde el archivo CSV.`;
    } catch (err) {
        console.error('Error al insertar escuchas desde CSV:', err);
    }

    
}


/// FUNCIONES DE BUSQUEDA Y ELIMINACION

/**
 * Busca canciones por artista en la tabla 'canciones_artista'.
 * @param {string} artista Nombre del artista.
 * @returns {Promise<Array>} Lista de canciones del artista.
 */
async function buscarCancionesPorArtista(artista) {
    try {
        const res = await client.execute(
            'SELECT * FROM canciones_artista WHERE artista = ?',
            [artista],
            { prepare: true }
        );
        const canciones = res.rows.map(c => ({
            CancionID: c.cancion_id.toString(),
            Artista: c.artista,
            Titulo: c.titulo,
            Genero: c.genero,
            Duracion: c.duracion.toString()
        }));

        return canciones;
    } catch (err) {
        console.error(`Error al buscar canciones por artista '${artista}':`, err);
        return [];
    }
}

/**
 * Busca usuarios por ciudad en la tabla 'usuarios_ciudad'.
 * @param {string} ciudad Nombre de la ciudad.
 * @returns {Promise<Array>} Lista de usuarios en la ciudad.
 */
async function buscarUsuariosPorCiudad(ciudad) {
    try {
        const res = await client.execute(
            'SELECT * FROM usuarios_ciudad WHERE ciudad = ?',
            [ciudad],
            { prepare: true }
        );
        const usuarios = res.rows.map(u => ({
            UsuarioID: u.usuario_id.toString(),
            Nombre: u.nombre,
            Ciudad: u.ciudad
        }));

        return usuarios;
    } catch (err) {
        console.error(`Error al buscar usuarios por ciudad '${ciudad}':`, err);
        return [];
    }
}

/**
 * Busca los primeros 10 registros de escuchas diarias para un usuario en la tabla escuchas_diarias_usuario.
 * Solo muestra información relevante para análisis OLAP: Fecha, Título, Artista, Género, Minutos.
 * @param {string} usuario_id UUID del usuario.
 * @returns {Promise<Array>} Lista de registros escuchas_diarias_usuario.
 */
async function buscarEscuchasPorUsuario(usuario_id) {
    try {
        const res = await client.execute(
            'SELECT * FROM escuchas_diarias_usuario WHERE usuario_id = ? LIMIT 10',
            [typeof usuario_id === 'string' ? Uuid.fromString(usuario_id) : usuario_id],
            { prepare: true }
        );
        const registros = res.rows.map(e => ({
            Fecha: e.fecha_escucha.toString(),
            Titulo: e.cancion_titulo,
            Artista: e.cancion_artista,
            Genero: e.cancion_genero,
            Minutos: e.minutos_escucha.toString()
        }));

        return registros;
    } catch (err) {
        console.error(`Error al buscar escuchas diarias por usuario '${usuario_id}':`, err);
        return [];
    }
}

/**
 * Busca los primeros 10 registros de escuchas diarias por género en la tabla escuchas_diarias_genero.
 * Solo muestra información relevante para análisis OLAP: Fecha, Título, Artista, Minutos.
 * @param {string} genero Nombre del género.
 * @returns {Promise<Array>} Lista de registros escuchas_diarias_genero.
 */
async function buscarEscuchasPorGenero(genero) {
    try {
        const res = await client.execute(
            'SELECT * FROM escuchas_diarias_genero WHERE genero_cancion = ? LIMIT 10',
            [genero],
            { prepare: true }
        );
        const registros = res.rows.map(e => ({
            Fecha: e.fecha_escucha.toString(),
            Titulo: e.titulo_cancion,
            Artista: e.artista_cancion,
            Minutos: e.minutos_escucha.toString()
        }));

        return registros;
    } catch (err) {
        console.error(`Error al buscar escuchas por género '${genero}':`, err);
        return [];
    }
}

/**
 * Busca los primeros 10 registros de escuchas diarias por ciudad en la tabla escuchas_diarias_ciudad.
 * Solo muestra información relevante para análisis OLAP: Fecha, Título, Artista, Género, Minutos.
 * @param {string} ciudad Nombre de la ciudad.
 * @returns {Promise<Array>} Lista de registros escuchas_diarias_ciudad.
 */
async function buscarEscuchasPorCiudad(ciudad) {
    try {
        const res = await client.execute(
            'SELECT * FROM escuchas_diarias_ciudad WHERE ciudad = ? LIMIT 10',
            [ciudad],
            { prepare: true }
        );
        const registros = res.rows.map(e => ({
            Fecha: e.fecha_escucha.toString(),
            Titulo: e.titulo_cancion,
            Artista: e.artista_cancion,
            Genero: e.genero_cancion,
            Minutos: e.minutos_escucha.toString()
        }));

        return registros;
    } catch (err) {
        console.error(`Error al buscar escuchas por ciudad '${ciudad}':`, err);
        return [];
    }
}




// FUNCIONES PARA ELIMINAR REGISTROS

// Elimina un usuario de las tablas usuarios_id y usuarios_ciudad usando un batch.
// Recibe la lista de usuarios mostrada en consola para seleccionar por índice.
async function eliminarUsuario(usuarios) {
    if (!usuarios || usuarios.length === 0) {
        console.log('No hay usuarios para eliminar.');
        return;
    }
    const index = readlineSync.questionInt('Ingrese el índice del usuario a eliminar: ');
    const usuario = usuarios.find(u => u.idx === index);
    if (!usuario) {
        console.log('Índice inválido.');
        return;
    }
    const usuarioId = cassandra.types.Uuid.fromString(usuario.ID);
    const queries = [
        {
            query: 'DELETE FROM usuarios_id WHERE usuario_id = ?',
            params: [usuarioId]
        },
        {
            query: 'DELETE FROM usuarios_ciudad WHERE ciudad = ? AND usuario_id = ?',
            params: [usuario.Ciudad, usuarioId]
        }
    ];
    await client.batch(queries, { prepare: true, logged: false });
    console.log('Usuario eliminado de ambas tablas:');
    console.table([usuario]);
}

// Elimina una canción de las tablas canciones_id y canciones_artista usando un batch
// Recibe la lista de canciones mostrada en consola para seleccionar por índice
async function eliminarCancion(canciones) {
    if (!canciones || canciones.length === 0) {
        console.log('No hay canciones para eliminar.');
        return;
    }
    const index = readlineSync.questionInt('Ingrese el índice de la canción a eliminar: ');
    const cancion = canciones.find(c => c.idx === index);
    if (!cancion) {
        console.log('Índice inválido.');
        return;
    }
    const cancionId = cassandra.types.Uuid.fromString(cancion.ID);
    const queries = [
        {
            query: 'DELETE FROM canciones_id WHERE cancion_id = ?',
            params: [cancionId]
        },
        {
            query: 'DELETE FROM canciones_artista WHERE artista = ? AND titulo = ? AND cancion_id = ?',
            params: [cancion.Artista, cancion.Titulo, cancionId]
        }
    ];
    await client.batch(queries, { prepare: true, logged: false });
    console.log('Canción eliminada de ambas tablas:');
    console.table([cancion]);
}

// Elimina una escucha diaria de la tabla escuchas_diarias_usuario.
// Recibe la lista de escuchas mostrada en consola para seleccionar por índice.
async function eliminarEscuchaDiariaUsuario(escuchas) {
    if (!escuchas || escuchas.length === 0) {
        console.log('No hay escuchas diarias para eliminar.');
        return;
    }
    const index = readlineSync.questionInt('Ingrese el índice de la escucha a eliminar: ');
    const escucha = escuchas.find(e => e.idx === index);
    if (!escucha) {
        console.log('Índice inválido.');
        return;
    }
    await client.execute(
        'DELETE FROM escuchas_diarias_usuario WHERE usuario_id = ? AND fecha_escucha = ? AND cancion_id = ?',
        [
            cassandra.types.Uuid.fromString(escucha.UsuarioID),
            cassandra.types.LocalDate.fromString(escucha.Fecha),
            cassandra.types.Uuid.fromString(escucha.CancionID)
        ],
        { prepare: true }
    );
    console.log('Escucha diaria eliminada:');
    console.table([escucha]);
}

// Elimina un registro de minutos_usuario.
// Recibe la lista de registros mostrada en consola para seleccionar por índice.
async function eliminarMinutosUsuario(minutos) {
    if (!minutos || minutos.length === 0) {
        console.log('No hay registros minutos_usuario para eliminar.');
        return;
    }
    const index = readlineSync.questionInt('Ingrese el índice del registro a eliminar: ');
    const registro = minutos.find(m => m.idx === index);
    if (!registro) {
        console.log('Índice inválido.');
        return;
    }
    await client.execute(
        'DELETE FROM minutos_usuario WHERE usuario_id = ? AND total_minutos = ? AND cancion_id = ?',
        [
            cassandra.types.Uuid.fromString(registro.UsuarioID),
            cassandra.types.BigDecimal.fromString(registro.TotalMinutos),
            cassandra.types.Uuid.fromString(registro.CancionID)
        ],
        { prepare: true }
    );
    console.log('Registro minutos_usuario eliminado:');
    console.table([registro]);
}

// Elimina un registro de minutos_genero.
// Recibe la lista de registros mostrada en consola para seleccionar por índice.
async function eliminarMinutosGenero(minutos) {
    if (!minutos || minutos.length === 0) {
        console.log('No hay registros minutos_genero para eliminar.');
        return;
    }
    const index = readlineSync.questionInt('Ingrese el índice del registro a eliminar: ');
    const registro = minutos.find(m => m.idx === index);
    if (!registro) {
        console.log('Índice inválido.');
        return;
    }
    await client.execute(
        'DELETE FROM minutos_genero WHERE genero_cancion = ? AND total_minutos = ? AND cancion_id = ?',
        [
            registro.Genero,
            cassandra.types.BigDecimal.fromString(registro.TotalMinutos),
            cassandra.types.Uuid.fromString(registro.CancionID)
        ],
        { prepare: true }
    );
    console.log('Registro minutos_genero eliminado:');
    console.table([registro]);
}

// Elimina un registro de minutos_ciudad.
// Recibe la lista de registros mostrada en consola para seleccionar por índice.
async function eliminarMinutosCiudad(minutos) {
    if (!minutos || minutos.length === 0) {
        console.log('No hay registros minutos_ciudad para eliminar.');
        return;
    }
    const index = readlineSync.questionInt('Ingrese el índice del registro a eliminar: ');
    const registro = minutos.find(m => m.idx === index);
    if (!registro) {
        console.log('Índice inválido.');
        return;
    }
    await client.execute(
        'DELETE FROM minutos_ciudad WHERE ciudad = ? AND total_minutos = ? AND cancion_id = ?',
        [
            registro.Ciudad,
            cassandra.types.BigDecimal.fromString(registro.TotalMinutos),
            cassandra.types.Uuid.fromString(registro.CancionID)
        ],
        { prepare: true }
    );
    console.log('Registro minutos_ciudad eliminado:');
    console.table([registro]);
}


/// VENTANA

const createWindow = () => {
    const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences:{
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
    }
    });

    win.loadFile('./src/html/index.html')
};

///EVENTOS

app.on('ready', async () => {
    try{
        await iniciarCassandra();
        createWindow()
    }catch(error){
        console.error(`${prefix} Error al iniciar la aplicación:`, error);
        app.quit();
    }
});

app.on('window-all-closed', async() => {
    if (process.platform !== 'darwin') {
        await cerrarCassandra();
        app.quit();
    }
});


/// IPC

ipcMain.handle('consultar-usuarios', async()=> {
    try{

        const users = await consultarUsuarios();
        if (!users || users.length === 0) {
            console.log(`${prefix} No hay usuarios para mostrar.`);
            return [];
        }
        return users;

    }catch(error){
        throw error;
    }
});

ipcMain.handle('consultar-canciones', async () => {
    try {
        const canciones = await consultarCanciones();
        if (!canciones || canciones.length === 0) {
            console.log(`${prefix} No hay canciones para mostrar.`);
            return [];
        }
        return canciones;
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('consultar-escuchas-usuario', async () => {
    try {
        const canciones = await consultarEscuchasDiariasUsuario();
        if (!canciones || canciones.length === 0) {
            console.log(`${prefix} No hay escuchas para mostrar.`);
            return [];
        }
        return canciones;
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('consultar-escuchas-genero', async () => {
    try {
        const canciones = await consultarEscuchasDiariasGenero();
        if (!canciones || canciones.length === 0) {
            console.log(`${prefix} No hay escuchas para mostrar.`);
            return [];
        }
        return canciones;
    } catch (error) {
        throw error;
    }
});

ipcMain.handle('consultar-escuchas-ciudad', async () => {
    try {
        const canciones = await consultarEscuchasDiariasCiudad();
        if (!canciones || canciones.length === 0) {
            console.log(`${prefix} No hay escuchas para mostrar.`);
            return [];
        }
        return canciones;
    } catch (error) {
        throw error;
    }
});
ipcMain.handle('buscar-minutos-usuario', async (event, usuario_id) => {
    try {
        const resultados = await buscarMinutosPorUsuario(usuario_id);
        return resultados;
    } catch (error) {
        console.error(`${prefix} Error en buscar-minutos-usuario:`, error);
        throw error;
    }
});

ipcMain.handle('buscar-minutos-genero', async (event, genero) => {
    try {
        const resultados = await buscarMinutosPorGenero(genero);
        return resultados;
    } catch (error) {
        console.error(`${prefix} Error en buscar-minutos-genero:`, error);
        throw error;
    }
});

ipcMain.handle('buscar-minutos-ciudad', async (event, ciudad) => {
    try {
        const resultados = await buscarMinutosPorCiudad(ciudad);
        return resultados;
    } catch (error) {
        console.error(`${prefix} Error en buscar-minutos-ciudad:`, error);
        throw error;
    }
});

ipcMain.handle('insertar-usuario', async (event, nombre, ciudad) => {
    try {
        const usuarioId = await insertarUsuario(nombre, ciudad);
        return usuarioId.toString();
    } catch (error) {
        console.error(`${prefix} Error en insertar-usuario:`, error);
        throw error;
    }
});

ipcMain.handle('insertar-cancion', async (event, songData) => {
    try {
        const cancionId = await insertarCancion(songData);
        return cancionId.toString();
    } catch (error) {
        console.error(`${prefix} Error en insertar-cancion:`, error);
        throw error;
    }
});

ipcMain.handle('insertar-escucha', async (event, usuario_id, cancion_id, fecha_escucha) => {
    try {
        await regisEscucha(usuario_id, cancion_id, fecha_escucha);
        return { success: true };
    } catch (error) {
        console.error(`${prefix} Error en registrar-escucha:`, error);
        throw error;
    }
});

ipcMain.handle('insertar-usuarios-csv', async () => {
    try {
        const filePath = path.resolve(__dirname, './data/document/import/usuarios.csv');
        const resultado = await insertarUsuariosDesdeCSV(filePath);
        return resultado;
    } catch (error) {
        console.error(`${prefix} Error en insertar-usuarios-csv:`, error);
        throw error;
    }
});

ipcMain.handle('insertar-canciones-csv', async () => {
    try {
        const filePath = path.resolve(__dirname, './data/document/import/canciones.csv');
        const resultado = await insertarCancionesDesdeCSV(filePath);
        return resultado;
    } catch (error) {
        console.error(`${prefix} Error en insertar-canciones-csv:`, error);
        throw error;
    }
});

ipcMain.handle('insertar-escuchas-csv', async () => {
    try {
        const filePath = path.resolve(__dirname, './data/document/import/escuchas.csv');
        const resultado = await insertarEscuchasDesdeCSV(filePath);
        return resultado;
    } catch (error) {
        console.error(`${prefix} Error en insertar-escuchas-csv:`, error);
        throw error;
    }
});

/// npm start
