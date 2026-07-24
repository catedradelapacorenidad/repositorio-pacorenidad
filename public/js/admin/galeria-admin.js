import {
    subirArchivo,
    eliminarArchivo,
    obtenerRutaDesdeUrl
} from "../utils/storage.js";

import {
    guardarRegistro,
    listarRegistros,
    eliminarRegistro
} from "../utils/database.js";

const BUCKET = "galeria";
const TABLA = "galeria";
const LIMITE_MB = 20;

const tituloInput = document.getElementById("titulo");
const descripcionInput = document.getElementById("descripcion");
const categoriaSelect = document.getElementById("categoria");
const archivoInput = document.getElementById("archivo");
const subirButton = document.getElementById("subir");
const mensaje = document.getElementById("mensaje");
const listaGaleria = document.getElementById("lista-admin-galeria");

let usuarioActual = null;

/* =========================================
   INICIAR EL MÓDULO
========================================= */

async function iniciarGaleria() {
    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (!session) {
            window.location.href = "login.html";
            return;
        }

        usuarioActual = session.user;

        await cargarGaleria();
    } catch (error) {
        console.error("Error al iniciar la galería:", error);
        mostrarMensaje(
            "No fue posible verificar la sesión.",
            "error"
        );
    }
}

/* =========================================
   PUBLICAR CONTENIDO
========================================= */

subirButton.addEventListener("click", async function () {
    const titulo = tituloInput.value.trim();
    const descripcion = descripcionInput.value.trim();
    const categoria = categoriaSelect.value;
    const archivo = archivoInput.files[0];

    if (!titulo) {
        mostrarMensaje("Escribe un título.", "error");
        tituloInput.focus();
        return;
    }

    if (!archivo) {
        mostrarMensaje(
            "Selecciona una imagen, un video o un audio.",
            "error"
        );
        return;
    }

    if (!esArchivoMultimedia(archivo)) {
        mostrarMensaje(
            "Solo se permiten imágenes, videos o audios.",
            "error"
        );
        archivoInput.value = "";
        return;
    }

    if (!usuarioActual) {
        mostrarMensaje(
            "No se encontró un usuario autenticado.",
            "error"
        );
        return;
    }

    let archivoSubido = null;

    try {
        bloquearFormulario(true);
        mostrarMensaje("Publicando contenido...", "cargando");

        archivoSubido = await subirArchivo({
            supabaseClient,
            bucket: BUCKET,
            archivo,
            usuarioId: usuarioActual.id,
            limiteMB: LIMITE_MB
        });

        await guardarRegistro(
            supabaseClient,
            TABLA,
            {
                titulo,
                descripcion: descripcion || null,
                categoria,
                archivo_url: archivoSubido.urlPublica,
                archivo_nombre: archivoSubido.nombreOriginal,
                tipo_archivo: archivoSubido.tipoArchivo
            }
        );

        limpiarFormulario();

        mostrarMensaje(
            "Contenido publicado correctamente.",
            "exito"
        );

        await cargarGaleria();
    } catch (error) {
        console.error("Error al publicar:", error);

        /*
         Si el archivo alcanzó a subirse, pero falló el registro
         en la base de datos, lo eliminamos de Storage para evitar
         archivos abandonados.
        */
        if (archivoSubido?.ruta) {
            try {
                await eliminarArchivo({
                    supabaseClient,
                    bucket: BUCKET,
                    rutaArchivo: archivoSubido.ruta
                });
            } catch (errorLimpieza) {
                console.error(
                    "No se pudo limpiar el archivo:",
                    errorLimpieza
                );
            }
        }

        mostrarMensaje(
            `No fue posible publicar: ${error.message}`,
            "error"
        );
    } finally {
        bloquearFormulario(false);
    }
});

/* =========================================
   CARGAR CONTENIDO PUBLICADO
========================================= */

async function cargarGaleria() {
    listaGaleria.textContent = "Cargando contenido...";

    try {
        const contenidos = await listarRegistros(
            supabaseClient,
            TABLA
        );

        listaGaleria.innerHTML = "";

        if (!contenidos || contenidos.length === 0) {
            const aviso = document.createElement("p");
            aviso.textContent =
                "Todavía no hay contenido publicado.";
            listaGaleria.appendChild(aviso);
            return;
        }

        const contenedor = document.createElement("div");
        contenedor.className = "grid-admin-multimedia";

        contenidos.forEach((contenido) => {
            const tarjeta = crearTarjeta(contenido);
            contenedor.appendChild(tarjeta);
        });

        listaGaleria.appendChild(contenedor);
    } catch (error) {
        console.error("Error al cargar la galería:", error);

        listaGaleria.textContent =
            `No fue posible cargar el contenido: ${error.message}`;
    }
}

/* =========================================
   CREAR TARJETA MULTIMEDIA
========================================= */

function crearTarjeta(contenido) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-admin-multimedia";

    const vistaPrevia = crearVistaPrevia(contenido);
    tarjeta.appendChild(vistaPrevia);

    const informacion = document.createElement("div");
    informacion.className = "informacion-multimedia";

    const titulo = document.createElement("h3");
    titulo.textContent = contenido.titulo || "Sin título";

    const categoria = document.createElement("p");
    categoria.className = "categoria-multimedia";
    categoria.textContent =
        contenido.categoria || "Sin categoría";

    informacion.appendChild(titulo);
    informacion.appendChild(categoria);

    if (contenido.descripcion) {
        const descripcion = document.createElement("p");
        descripcion.textContent = contenido.descripcion;
        informacion.appendChild(descripcion);
    }

    const nombreArchivo = document.createElement("small");
    nombreArchivo.textContent =
        contenido.archivo_nombre || "Archivo multimedia";

    informacion.appendChild(nombreArchivo);

    const acciones = document.createElement("div");
    acciones.className = "acciones-multimedia";

    const abrir = document.createElement("a");
    abrir.href = contenido.archivo_url;
    abrir.target = "_blank";
    abrir.rel = "noopener noreferrer";
    abrir.className = "boton-abrir";
    abrir.textContent = "Abrir";

    const eliminar = document.createElement("button");
    eliminar.type = "button";
    eliminar.className = "boton-eliminar";
    eliminar.textContent = "Eliminar";

    eliminar.addEventListener("click", function () {
        eliminarContenido(contenido, eliminar);
    });

    acciones.appendChild(abrir);
    acciones.appendChild(eliminar);

    informacion.appendChild(acciones);
    tarjeta.appendChild(informacion);

    return tarjeta;
}

/* =========================================
   CREAR VISTA PREVIA
========================================= */

function crearVistaPrevia(contenido) {
    const contenedor = document.createElement("div");
    contenedor.className = "vista-previa-multimedia";

    const tipo = contenido.tipo_archivo || "";

    if (tipo.startsWith("image/")) {
        const imagen = document.createElement("img");
        imagen.src = contenido.archivo_url;
        imagen.alt = contenido.titulo || "Imagen de la galería";
        imagen.loading = "lazy";

        contenedor.appendChild(imagen);
        return contenedor;
    }

    if (tipo.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = contenido.archivo_url;
        video.controls = true;
        video.preload = "metadata";

        contenedor.appendChild(video);
        return contenedor;
    }

    if (tipo.startsWith("audio/")) {
        const audioIcono = document.createElement("div");
        audioIcono.className = "icono-audio";
        audioIcono.textContent = "🎵";

        const audio = document.createElement("audio");
        audio.src = contenido.archivo_url;
        audio.controls = true;
        audio.preload = "metadata";

        contenedor.appendChild(audioIcono);
        contenedor.appendChild(audio);
        return contenedor;
    }

    const archivoGenerico = document.createElement("div");
    archivoGenerico.className = "archivo-generico";
    archivoGenerico.textContent = "Archivo multimedia";

    contenedor.appendChild(archivoGenerico);

    return contenedor;
}

/* =========================================
   ELIMINAR CONTENIDO
========================================= */

async function eliminarContenido(contenido, boton) {
    const confirmacion = window.confirm(
        `¿Seguro que deseas eliminar "${contenido.titulo}"?`
    );

    if (!confirmacion) {
        return;
    }

    try {
        boton.disabled = true;
        boton.textContent = "Eliminando...";

        const rutaArchivo = obtenerRutaDesdeUrl(
            contenido.archivo_url,
            BUCKET
        );

        if (!rutaArchivo) {
            throw new Error(
                "No fue posible identificar la ruta del archivo."
            );
        }

        await eliminarArchivo({
            supabaseClient,
            bucket: BUCKET,
            rutaArchivo
        });

        await eliminarRegistro(
            supabaseClient,
            TABLA,
            contenido.id
        );

        mostrarMensaje(
            "Contenido eliminado correctamente.",
            "exito"
        );

        await cargarGaleria();
    } catch (error) {
        console.error("Error al eliminar:", error);

        mostrarMensaje(
            `No fue posible eliminar: ${error.message}`,
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Eliminar";
    }
}

/* =========================================
   FUNCIONES AUXILIARES
========================================= */

function esArchivoMultimedia(archivo) {
    return (
        archivo.type.startsWith("image/") ||
        archivo.type.startsWith("video/") ||
        archivo.type.startsWith("audio/")
    );
}

function limpiarFormulario() {
    tituloInput.value = "";
    descripcionInput.value = "";
    categoriaSelect.selectedIndex = 0;
    archivoInput.value = "";
}

function bloquearFormulario(bloquear) {
    tituloInput.disabled = bloquear;
    descripcionInput.disabled = bloquear;
    categoriaSelect.disabled = bloquear;
    archivoInput.disabled = bloquear;
    subirButton.disabled = bloquear;

    subirButton.textContent = bloquear
        ? "Publicando..."
        : "Publicar contenido";
}

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;

    const estilos = {
        exito: "#18743c",
        error: "#b52b2b",
        cargando: "#8b6514"
    };

    mensaje.style.color = estilos[tipo] || "#333";
}

/* =========================================
   EJECUTAR
========================================= */

iniciarGaleria();