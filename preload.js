const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('api', {
    consultarUsuarios: async () => {
        const usuarios = await ipcRenderer.invoke('consultar-usuarios');
        return usuarios;
    },

    consultarCanciones: async () => {
        const canciones = await ipcRenderer.invoke('consultar-canciones');
        return canciones;
    },
    consultarEscuchasDiariasUsuario: async () => {
        const escuchas = await ipcRenderer.invoke('consultar-escuchas-usuario');
        return escuchas;
    },
    consultarEscuchasDiariasGenero: async () => {
        const escuchas = await ipcRenderer.invoke('consultar-escuchas-genero');
        return escuchas;
    },
    consultarEscuchasDiariasCiudad: async () => {
        const escuchas = await ipcRenderer.invoke('consultar-escuchas-ciudad');
        return escuchas;
    },
    buscarMinutosPorUsuario: async (usuario_id) => {
        const resultados = await ipcRenderer.invoke('buscar-minutos-usuario', usuario_id);
        return resultados;
    },
    buscarMinutosPorGenero: async (genero) => {
        const resultados = await ipcRenderer.invoke('buscar-minutos-genero', genero);
        return resultados;
    },
    buscarMinutosPorCiudad: async (ciudad) => {
        const resultados = await ipcRenderer.invoke('buscar-minutos-ciudad', ciudad);
        return resultados;
    },
    insertarUsuario: async (nombre,ciudad) => {
        const resultado = await ipcRenderer.invoke('insertar-usuario', nombre, ciudad);
        return resultado;
    },
    insertarCancion: async (songData) => {
        const resultado = await ipcRenderer.invoke('insertar-cancion', songData);
        return resultado;
    }
    ,
    insertarEscucha: async (usuario_id, cancion_id, fecha_escucha) => {
        const resultado = await ipcRenderer.invoke('insertar-escucha', usuario_id, cancion_id, fecha_escucha);
        return resultado;
    }
    ,
    insertarUsuariosCSV: async () => {
        const resultado = await ipcRenderer.invoke('insertar-usuarios-csv');
        return resultado;
    },
    insertarCancionesCSV: async () => {
        const resultado = await ipcRenderer.invoke('insertar-canciones-csv');
        return resultado;
    },
    insertarEscuchasCSV: async () => {
        const resultado = await ipcRenderer.invoke('insertar-escuchas-csv');
        return resultado;
    }
});