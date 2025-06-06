

/// FUNCIONES CSV



///FUNCIONES CONSOLA



/**
 * Pausa la ejecución y limpia la pantalla de la consola.
 */
function limpiarPantalla() {
    readlineSync.question('\nPresiona cualquier tecla para continuar...');
    console.clear();
}

/**
 * Muestra el menú principal y devuelve la opción seleccionada.
 * @returns {string} Opción seleccionada.
 */
function mostrarMenuPrincipal() {
    limpiarPantalla();
    console.log('\n--- Menú Principal ---');
    console.log('1. Insertar registro');
    console.log('2. Consultar registros');
    console.log('3. Eliminar registro');
    console.log('4. Importar desde CSV');
    console.log('5. Salir');
    return readlineSync.question('Seleccione una opción: ');
}

/**
 * Bucle del menú de eliminaciones. Permite eliminar usuarios, canciones, escuchas y totales.
 */
async function menuEliminaciones() {
    let volver = false;
    while (!volver) {
        const opcion = mostrarMenuEliminaciones();
        switch (opcion) {
            case '1': {
                const usuarios = await consultarUsuarios();
                if (usuarios) {
                    await eliminarUsuario(usuarios);
                }
                break;
            }
            case '2': {
                const canciones = await consultarCanciones();
                if (canciones) {
                    await eliminarCancion(canciones);
                }
                break;
            }
            case '3': {
                const escuchas = await consultarEscuchasDiariasUsuario();
                if (escuchas) {
                    await eliminarEscuchaDiariaUsuario(escuchas);
                }
                break;
            }
            case '4': {
                const minutos = await consultarMinutosUsuario();
                if (minutos) {
                    await eliminarMinutosUsuario(minutos);
                }
                break;
            }
            case '5': {
                const minutos = await consultarMinutosGenero();
                if (minutos) {
                    await eliminarMinutosGenero(minutos);
                }
                break;
            }
            case '6': {
                const minutos = await consultarMinutosCiudad();
                if (minutos) {
                    await eliminarMinutosCiudad(minutos);
                }
                break;
            }
            case '7':
                volver = true;
                break;
            default:
                console.log('Opción no válida.');
        }
    }
}

/**
 * Muestra el menú de eliminaciones y devuelve la opción seleccionada.
 * @returns {string} Opción seleccionada.
 */
function mostrarMenuEliminaciones() {
    limpiarPantalla();
    console.log('\n--- Menú Eliminaciones ---');
    console.log('1. Eliminar usuario');
    console.log('2. Eliminar canción');
    console.log('3. Eliminar escucha diaria usuario');
    console.log('4. Eliminar minutos_usuario');
    console.log('5. Eliminar minutos_genero');
    console.log('6. Eliminar minutos_ciudad');
    console.log('7. Volver al menú principal');
    return readlineSync.question('Seleccione una opción: ');
}

/**
 * Muestra el menú de inserciones y devuelve la opción seleccionada.
 * @returns {string} Opción seleccionada.
 */
function mostrarMenuInserciones() {
    limpiarPantalla();
    console.log('\n--- Menú Inserciones ---');
    console.log('1. Insertar usuario');
    console.log('2. Insertar canción');
    console.log('3. Insertar escucha');
    console.log('4. Volver al menú principal');
    return readlineSync.question('Seleccione una opción: ');
}

/**
 * Bucle del menú de inserciones. Permite insertar usuarios, canciones y escuchas.
 */
async function menuInserciones() {
    let volver = false;
    while (!volver) {
        const opcion = mostrarMenuInserciones();
        switch (opcion) {
            case '1': {
                const nombre = readlineSync.question('Nombre del usuario: ');
                const ciudad = readlineSync.question('Ciudad: ');
                await insertarUsuario(nombre, ciudad);
                break;
            }
            case '2': {
                const artista = readlineSync.question('Artista: ');
                const titulo = readlineSync.question('Título: ');
                const genero = readlineSync.question('Género: ');
                const duracion = readlineSync.question('Duración (minutos): ');
                await insertarCancion({ artista, titulo, genero, duracion });
                break;
            }
            case '3': {
                // Insertar escucha
                const usuario_id = readlineSync.question('UUID del usuario: ');
                const cancion_id = readlineSync.question('UUID de la canción: ');
                const fecha_escucha = readlineSync.question('Fecha de escucha (YYYY-MM-DD, opcional, enter para hoy): ');
                // Buscar detalles usuario y canción
                const usuario = await buscarUsuarioPorId({ usuario_id });
                const cancion = await buscarCancionPorId({ cancion_id });
                if (!usuario) {
                    console.log('Usuario no encontrado.');
                    break;
                }
                if (!cancion) {
                    console.log('Canción no encontrada.');
                    break;
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
                break;
            }
            case '4':
                volver = true;
                break;
            default:
                console.log('Opción no válida.');
        }
    }
}

/**
 * Muestra el menú de consultas y devuelve la opción seleccionada.
 * @returns {string} Opción seleccionada.
 */
function mostrarMenuConsultas() {
    limpiarPantalla();
    console.log('\n--- Menú Consultas ---');
    console.log('1. Consultar usuarios');
    console.log('2. Consultar canciones');
    console.log('3. Consultar escuchas diarias por usuario');
    console.log('4. Consultar escuchas diarias por género');
    console.log('5. Consultar escuchas diarias por ciudad');
    console.log('6. Top canciones más escuchadas por usuario');
    console.log('7. Top canciones más escuchadas por género');
    console.log('8. Top canciones más escuchadas por ciudad');
    console.log('9. Volver al menú principal');
    return readlineSync.question('Seleccione una opción: ');
}

/**
 * Bucle del menú de consultas. Permite consultar usuarios, canciones, escuchas y tops.
 */
async function menuConsultas() {
    let volver = false;
    while (!volver) {
        const opcion = mostrarMenuConsultas();
        switch (opcion) {
            case '1':
                await consultarUsuarios();
                break;
            case '2':
                await consultarCanciones();
                break;
            case '3':
                await consultarEscuchasDiariasUsuario();
                break;
            case '4':
                await consultarEscuchasDiariasGenero();
                break;
            case '5':
                await consultarEscuchasDiariasCiudad();
                break;
            case '6': {
                const usuario_id = readlineSync.question('Ingrese el UUID del usuario: ');
                await buscarMinutosPorUsuario(usuario_id);
                break;
            }
            case '7': {
                const genero = readlineSync.question('Ingrese el género: ');
                await buscarMinutosPorGenero(genero);
                break;
            }
            case '8': {
                const ciudad = readlineSync.question('Ingrese la ciudad: ');
                await buscarMinutosPorCiudad(ciudad);
                break;
            }
            case '9':
                volver = true;
                break;
            default:
                console.log('Opción no válida.');
        }
    }
}

/**
 * Muestra el menú de importación desde CSV y devuelve la opción seleccionada.
 * @returns {string} Opción seleccionada.
 */
function mostrarMenuImportarCSV() {
    limpiarPantalla();
    console.log('\n--- Menú Importar desde CSV ---');
    console.log('1. Importar usuarios desde CSV');
    console.log('2. Importar canciones desde CSV');
    console.log('3. Importar escuchas desde CSV');
    console.log('4. Volver al menú principal');
    return readlineSync.question('Seleccione una opción: ');
}

/**
 * Bucle del menú de importación desde CSV. Permite importar usuarios, canciones y escuchas.
 */
async function menuImportarCSV() {
    let volver = false;
    while (!volver) {
        const opcion = mostrarMenuImportarCSV();
        switch (opcion) {
            case '1': {
                const filePath = './data/document/import/usuarios.csv';
                // Asegura que el directorio existe antes de intentar leer el archivo
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                await insertarUsuariosDesdeCSV(filePath);
                break;
            }
            case '2': {
                const filePath = './data/document/import/canciones.csv';
                // Asegura que el directorio existe antes de intentar leer el archivo
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                await insertarCancionesDesdeCSV(filePath);
                break;
            }
            case '3': {
                const filePath = './data/document/import/escuchas.csv';
                // Asegura que el directorio existe antes de intentar leer el archivo
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                await insertarEscuchasDesdeCSV(filePath);
                break;
            }
            case '4':
                volver = true;
                break;
            default:
                console.log('Opción no válida.');
        }
    }
}

/**
 * Bucle principal del menú de la aplicación. Permite navegar entre las distintas opciones.
 */
async function menuLoop() {
    let salir = false;
    while (!salir) {
        const opcion = mostrarMenuPrincipal();
        switch (opcion) {
            case '1':
                await menuInserciones();
                break;
            case '2':
                await menuConsultas();
                break;
            case '3':
                await menuEliminaciones();
                break;
            case '4':
                await menuImportarCSV();
                break;
            case '5':
                salir = true;
                break;
            default:
                console.log('Opción no válida.');
        }
    }
}







