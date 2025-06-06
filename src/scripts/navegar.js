// Utilidad para mostrar una sección y ocultar las demás
function mostrarSeccion(idSeccion) {
    const secciones = [
        "main-menu",
        "insert-section",
        "query-section",
        "import-section",
        "table-section",
        "top-section",      // añadido
        "daily-section",     // añadido
        "top-user-section",
        "top-city-section",
        "top-genre-section",
    ];
    secciones.forEach(id => {
        const sec = document.getElementById(id);
        if (sec) sec.classList.toggle("hidden", id !== idSeccion);
    });
    // Oculta formularios de inserción si no estamos en insert-section
    if (idSeccion !== "insert-section") ocultarFormulariosInsertar();
}

// Oculta todos los formularios de insertar
function ocultarFormulariosInsertar() {
    ["form-user", "form-song", "form-listen"].forEach(id => {
        const f = document.getElementById(id);
        if (f) f.classList.add("hidden");
    });
}

// Mostrar formulario específico en insertar
function mostrarFormularioInsertar(idFormulario) {
    ocultarFormulariosInsertar();
    const f = document.getElementById(idFormulario);
    if (f) f.classList.remove("hidden");
}

// Mostrar solo la sección de la tabla dinámica
function mostrarTabla() {
    mostrarSeccion("table-section");
}



// --- Menú principal ---
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("btn-insert").onclick = () => mostrarSeccion("insert-section");
    document.getElementById("btn-query").onclick = () => mostrarSeccion("query-section");
    document.getElementById("btn-import").onclick = () => mostrarSeccion("import-section");
    document.getElementById("btn-back-table").onclick = () => mostrarSeccion("query-section");
    

    // --- Insertar registros ---
    document.getElementById("btn-back-insert").onclick = () => {
        mostrarSeccion("main-menu");
        ocultarFormulariosInsertar();
    };
    document.getElementById("btn-insert-user").onclick = () => mostrarFormularioInsertar("form-user");
    document.getElementById("btn-insert-song").onclick = () => mostrarFormularioInsertar("form-song");
    document.getElementById("btn-insert-listen").onclick = () => mostrarFormularioInsertar("form-listen");

    // --- Consultar registros ---
    document.getElementById("btn-query-listens").onclick = () => mostrarSeccion("daily-section"); // añadido
    document.getElementById("btn-query-top").onclick = () => mostrarSeccion("top-section");       // añadido

    document.getElementById("btn-top-user").onclick = () => mostrarSeccion("top-user-section");
    document.getElementById("btn-top-city").onclick = () => mostrarSeccion("top-city-section");
    document.getElementById("btn-top-genre").onclick = () => mostrarSeccion("top-genre-section");


    document.getElementById("btn-back-top-user").onclick = () => mostrarSeccion("top-section");
    document.getElementById("btn-back-top-city").onclick = () => mostrarSeccion("top-section");
    document.getElementById("btn-back-top-genre").onclick = () => mostrarSeccion("top-section");

    document.getElementById("btn-back-query").onclick = () => mostrarSeccion("main-menu");

    // Botones de volver para top-section y daily-section
    document.getElementById("btn-back-top").onclick = () => mostrarSeccion("query-section");
    document.getElementById("btn-back-daily").onclick = () => mostrarSeccion("query-section");


    // --- Importar CSV ---
    document.getElementById("btn-back-import").onclick = () => mostrarSeccion("main-menu");

    document.getElementById("btn-exit").onclick = () => window.close && window.close(); // O personaliza acción de salir

    // Inicializa mostrando solo el menú principal
    mostrarSeccion("main-menu");
});
