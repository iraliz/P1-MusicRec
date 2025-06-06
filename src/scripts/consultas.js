document.addEventListener('DOMContentLoaded', () => {
    // --- Mostrar sección de consultas al hacer click en "Consultar registros" ---
    const btnQuery = document.getElementById('btn-query');
    const mainMenu = document.getElementById('main-menu');
    const querySection = document.getElementById('query-section');
    if (btnQuery && mainMenu && querySection) {
        btnQuery.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            querySection.classList.remove('hidden');
        });
    }

    const btnQueryUsers = document.getElementById('btn-query-users');
    const tableSection = document.getElementById('table-section');
    const table = document.getElementById('dynamic-table');

    const p = document.getElementById('table-p');


    if (btnQueryUsers && tableSection) {
        btnQueryUsers.addEventListener('click', async () => {
            try {
                // Llama a la función consultarUsuarios de preload.js
                p.textContent = 'Cargando usuarios...'; // Mensaje de carga
                const usuarios = await window.api.consultarUsuarios();

                mostrarTabla();

                // Si no hay usuarios, muestra mensaje
                if (!usuarios || usuarios.length === 0) {
                    p.textContent = 'No se encontraron usuarios.'; 

                    return;
                }

                // Construye la tabla con títulos fijos
                let tableHtml = '<table border="1"><thead><tr>';
                tableHtml += '<th>Usuario_id</th><th>nombre</th><th>ciudad</th>';
                tableHtml += '</tr></thead><tbody>';

                // Agrega las filas de usuarios
                usuarios.forEach(usuario => {
                    tableHtml += '<tr>';
                    tableHtml += `<td>${usuario.Usuario_id ?? ''}</td>`;
                    tableHtml += `<td>${usuario.nombre ?? ''}</td>`;
                    tableHtml += `<td>${usuario.ciudad ?? ''}</td>`;
                    tableHtml += '</tr>';
                });

                tableHtml += '</tbody></table>';

                // Inserta la tabla en la sección
                p.textContent = 'Tabla de usuarios:'; 
                table.innerHTML = tableHtml;
                
                
            } catch (error) {
                console.error('Error al consultar usuarios:', error);
                p.textContent  = 'Error al consultar usuarios.';
            }
        });
    }

    // Consulta escuchas diarias por usuario
    const btnDailyUser = document.getElementById('btn-daily-user');
    if (btnDailyUser && tableSection) {
        btnDailyUser.addEventListener('click', async () => {
            try {
                p.textContent = 'Cargando escuchas por usuario...';
                const escuchas = await window.api.consultarEscuchasDiariasUsuario();

                mostrarTabla();

                if (!escuchas || escuchas.length === 0) {
                    p.textContent = 'No se encontraron escuchas por usuario.';
                    return;
                }

                let tableHtml = '<table border="1"><thead><tr>';
                tableHtml += '<th>Usuario_id</th><th>Fecha</th><th>Artista</th><th>Titulo</th><th>Genero</th><th>Minutos</th>';
                tableHtml += '</tr></thead><tbody>';

                escuchas.forEach(e => {
                    tableHtml += '<tr>';
                    tableHtml += `<td>${e.Usuario_id ?? ''}</td>`;
                    tableHtml += `<td>${e.Fecha ?? ''}</td>`;
                    tableHtml += `<td>${e.Artista ?? ''}</td>`;
                    tableHtml += `<td>${e.Titulo ?? ''}</td>`;
                    tableHtml += `<td>${e.Genero ?? ''}</td>`;
                    tableHtml += `<td>${e.Minutos ?? ''}</td>`;
                    tableHtml += '</tr>';
                });

                tableHtml += '</tbody></table>';

                p.textContent = 'Escuchas diarias por usuario:';
                table.innerHTML = tableHtml;
            } catch (error) {
                console.error('Error al consultar escuchas por usuario:', error);
                p.textContent = 'Error al consultar escuchas por usuario.';
            }
        });
    }

    // Consulta escuchas diarias por género
    const btnDailyGenre = document.getElementById('btn-daily-genre');
    if (btnDailyGenre && tableSection) {
        btnDailyGenre.addEventListener('click', async () => {
            try {
                p.textContent = 'Cargando escuchas por género...';
                const escuchas = await window.api.consultarEscuchasDiariasGenero();

                mostrarTabla();

                if (!escuchas || escuchas.length === 0) {
                    p.textContent = 'No se encontraron escuchas por género.';
                    return;
                }

                let tableHtml = '<table border="1"><thead><tr>';
                tableHtml += '<th>Genero</th><th>Fecha</th><th>Artista</th><th>Titulo</th><th>Minutos</th>';
                tableHtml += '</tr></thead><tbody>';

                escuchas.forEach(e => {
                    tableHtml += '<tr>';
                    tableHtml += `<td>${e.Genero ?? ''}</td>`;
                    tableHtml += `<td>${e.Fecha ?? ''}</td>`;
                    tableHtml += `<td>${e.Artista ?? ''}</td>`;
                    tableHtml += `<td>${e.Titulo ?? ''}</td>`;
                    tableHtml += `<td>${e.Minutos ?? ''}</td>`;
                    tableHtml += '</tr>';
                });

                tableHtml += '</tbody></table>';

                p.textContent = 'Escuchas diarias por género:';
                table.innerHTML = tableHtml;
            } catch (error) {
                console.error('Error al consultar escuchas por género:', error);
                p.textContent = 'Error al consultar escuchas por género.';
            }
        });
    }

    // Consulta escuchas diarias por ciudad
    const btnDailyCity = document.getElementById('btn-daily-city');
    if (btnDailyCity && tableSection) {
        btnDailyCity.addEventListener('click', async () => {
            try {
                p.textContent = 'Cargando escuchas por ciudad...';
                const escuchas = await window.api.consultarEscuchasDiariasCiudad();

                mostrarTabla();

                if (!escuchas || escuchas.length === 0) {
                    p.textContent = 'No se encontraron escuchas por ciudad.';
                    return;
                }

                let tableHtml = '<table border="1"><thead><tr>';
                tableHtml += '<th>Ciudad</th><th>Fecha</th><th>Artista</th><th>Titulo</th><th>Genero</th><th>Minutos</th>';
                tableHtml += '</tr></thead><tbody>';

                escuchas.forEach(e => {
                    tableHtml += '<tr>';
                    tableHtml += `<td>${e.Ciudad ?? ''}</td>`;
                    tableHtml += `<td>${e.Fecha ?? ''}</td>`;
                    tableHtml += `<td>${e.Artista ?? ''}</td>`;
                    tableHtml += `<td>${e.Titulo ?? ''}</td>`;
                    tableHtml += `<td>${e.Genero ?? ''}</td>`;
                    tableHtml += `<td>${e.Minutos ?? ''}</td>`;
                    tableHtml += '</tr>';
                });

                tableHtml += '</tbody></table>';

                p.textContent = 'Escuchas diarias por ciudad:';
                table.innerHTML = tableHtml;
            } catch (error) {
                console.error('Error al consultar escuchas por ciudad:', error);
                p.textContent = 'Error al consultar escuchas por ciudad.';
            }
        });
    }

    // Consulta canciones
    const btnQuerySongs = document.getElementById('btn-query-songs');
    if (btnQuerySongs && tableSection) {
        btnQuerySongs.addEventListener('click', async () => {
            try {
                p.textContent = 'Cargando canciones...';
                const canciones = await window.api.consultarCanciones();

                mostrarTabla();

                if (!canciones || canciones.length === 0) {
                    p.textContent = 'No se encontraron canciones.';
                    return;
                }

                let tableHtml = '<table border="1"><thead><tr>';
                tableHtml += '<th>ID</th><th>Titulo</th><th>Artista</th><th>Genero</th><th>Duracion</th>';
                tableHtml += '</tr></thead><tbody>';

                canciones.forEach(c => {
                    tableHtml += '<tr>';
                    tableHtml += `<td>${c.ID ?? ''}</td>`;
                    tableHtml += `<td>${c.Titulo ?? ''}</td>`;
                    tableHtml += `<td>${c.Artista ?? ''}</td>`;
                    tableHtml += `<td>${c.Genero ?? ''}</td>`;
                    tableHtml += `<td>${c.Duracion ?? ''}</td>`;
                    tableHtml += '</tr>';
                });

                tableHtml += '</tbody></table>';

                p.textContent = 'Tabla de canciones:';
                table.innerHTML = tableHtml;
            } catch (error) {
                console.error('Error al consultar canciones:', error);
                p.textContent = 'Error al consultar canciones.';
            }
        });
    }

    // --- Top Canciones por Usuario, Género y Ciudad ---
    // Helper para renderizar tabla de top canciones
    function renderTopTable(resultados) {
        const table = document.getElementById('dynamic-table');
        const p = document.getElementById('table-p');
        if (!resultados || resultados.length === 0) {
            p.textContent = 'No se encontraron resultados.';
            table.innerHTML = '';
            return;
        }
        let tableHtml = '<table border="1"><thead><tr>';
        tableHtml += '<th>Titulo</th><th>Artista</th><th>TotalMinutos</th>';
        tableHtml += '</tr></thead><tbody>';
        resultados.forEach(r => {
            tableHtml += '<tr>';
            tableHtml += `<td>${r.Titulo ?? ''}</td>`;
            tableHtml += `<td>${r.Artista ?? ''}</td>`;
            tableHtml += `<td>${r.TotalMinutos ?? ''}</td>`;
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table>';
        p.textContent = 'Resultados:';
        table.innerHTML = tableHtml;
    }

    // Top Canciones por Usuario
    const topUserForm = document.querySelector('#top-user-section form');
    if (topUserForm) {
        topUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('input-top-user');
            const valor = input.value.trim();
            if (!valor) return;
            const p = document.getElementById('table-p');
            p.textContent = 'Buscando...';
            try {
                const resultados = await window.api.buscarMinutosPorUsuario(valor);
                mostrarTabla();
                renderTopTable(resultados);
            } catch (error) {
                p.textContent = 'Error al consultar top canciones por usuario.';
            }
        });
    }

    // Top Canciones por Género
    const topGenreForm = document.querySelector('#top-genre-section form');
    if (topGenreForm) {
        topGenreForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('input-top-genre');
            const valor = input.value.trim();
            if (!valor) return;
            const p = document.getElementById('table-p');
            p.textContent = 'Buscando...';
            try {
                const resultados = await window.api.buscarMinutosPorGenero(valor);
                mostrarTabla();
                renderTopTable(resultados);
            } catch (error) {
                p.textContent = 'Error al consultar top canciones por género.';
            }
        });
    }

    // Top Canciones por Ciudad
    const topCityForm = document.querySelector('#top-city-section form');
    if (topCityForm) {
        topCityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('input-top-city');
            const valor = input.value.trim();
            if (!valor) return;
            const p = document.getElementById('table-p');
            p.textContent = 'Buscando...';
            try {
                const resultados = await window.api.buscarMinutosPorCiudad(valor);
                mostrarTabla();
                renderTopTable(resultados);
            } catch (error) {
                p.textContent = 'Error al consultar top canciones por ciudad.';
            }
        });
    }

});
