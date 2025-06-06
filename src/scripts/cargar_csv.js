document.addEventListener('DOMContentLoaded', () => {
    const msg = document.getElementById('import-msg');
    const btnUsers = document.getElementById('btn-import-users');
    const btnSongs = document.getElementById('btn-import-songs');
    const btnListens = document.getElementById('btn-import-listens');

    if (btnUsers) {
        btnUsers.addEventListener('click', async () => {
            msg.textContent = "Importando usuarios...";
            try {
                const res = await window.api.insertarUsuariosCSV();
                msg.textContent = res;
            } catch (e) {
                msg.textContent = "Error al importar usuarios.";
            }
        });
    }

    if (btnSongs) {
        btnSongs.addEventListener('click', async () => {
            msg.textContent = "Importando canciones...";
            try {
                const res = await window.api.insertarCancionesCSV();
                msg.textContent = res;
            } catch (e) {
                msg.textContent = "Error al importar canciones.";
            }
        });
    }

    if (btnListens) {
        btnListens.addEventListener('click', async () => {
            msg.textContent = "Importando escuchas...";
            try {
                const res = await window.api.insertarEscuchasCSV();
                msg.textContent = res;
            } catch (e) {
                msg.textContent = "Error al importar escuchas.";
            }
        });
    }
});