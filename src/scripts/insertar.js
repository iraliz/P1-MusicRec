// Función para insertar usuario desde el formulario
async function insertarUsuarioForm(event) {
    event.preventDefault();
    const nombre = document.getElementById('user-name').value.trim();
    const ciudad = document.getElementById('user-city').value.trim();
    const msg = document.getElementById('msg-user');
    if (!nombre || !ciudad) {
        msg.textContent = "Por favor, complete todos los campos.";
        return;
    }
    try{
        const id = await window.api.insertarUsuario(nombre, ciudad);
        msg.textContent = `Se ha añadido con la ID ${id} el registro de usuario.`;
    }catch (error) {
        msg.textContent = "Error al insertar usuario.";
    }
}

// Función para insertar canción desde el formulario
async function insertarCancionForm(event) {
    event.preventDefault();
    const artista = document.getElementById('song-artist').value.trim();
    const titulo = document.getElementById('song-title').value.trim();
    const genero = document.getElementById('song-genre').value.trim();
    const duracion = parseFloat(document.getElementById('song-duration').value);
    const msg = document.getElementById('msg-song');

    if (!artista || !titulo || !genero || isNaN(duracion)) {
        msg.textContent = "Por favor, complete todos los campos.";
        return;
    }

    try {
        const id = await window.api.insertarCancion({artista, titulo, genero, duracion});
        msg.textContent = `Se ha añadido con la ID ${id.toString()} el registro de canción.`;
    } catch (error) {
        msg.textContent = "Error al insertar canción.";
    }

}

// Función para insertar escucha desde el formulario
async function insertarEscuchaForm(event) {
    event.preventDefault();
    const idUsuario = document.getElementById('listen-user').value.trim();
    const idCancion = document.getElementById('listen-song').value.trim();
    const fecha = document.getElementById('listen-date').value.trim();
    const msg = document.getElementById('msg-listen');
    if (!idUsuario || !idCancion) {
        msg.textContent = "Por favor, complete todos los campos obligatorios.";
        return;
    }
    try{
        const id = await window.api.insertarEscucha(idUsuario, idCancion, fecha);
        msg.textContent = `Se ha añadido con la ID ${id} el registro escucha.`;
    } catch (error) {
        msg.textContent = "Error al insertar escucha.";
    }
}

// Asignar eventos a los formularios
document.addEventListener('DOMContentLoaded', () => {
    const formUser = document.getElementById('form-user');
    if (formUser) formUser.addEventListener('submit', insertarUsuarioForm);

    const formSong = document.getElementById('form-song');
    if (formSong) formSong.addEventListener('submit', insertarCancionForm);

    const formListen = document.getElementById('form-listen');
    if (formListen) formListen.addEventListener('submit', insertarEscuchaForm);
});