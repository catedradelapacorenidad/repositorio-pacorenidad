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

const tipoContenidoSelect = document.getElementById("tipo-contenido");
const tituloInput = document.getElementById("titulo");
const descripcionInput = document.getElementById("descripcion");
const categoriaSelect = document.getElementById("categoria");

const grupoArchivo = document.getElementById("grupo-archivo");
const archivoInput = document.getElementById("archivo");
const ayudaArchivo = document.getElementById("ayuda-archivo");

const grupoVideo = document.getElementById("grupo-video");
const enlaceExternoInput = document.getElementById("enlace-externo");

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

        actualizarTipoContenido();
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
   CAMBIAR TIPO DE CONTENIDO
========================================= */

tipoContenidoSelect.addEventListener(
    "change",
    actualizarTipoContenido
);

function actualizarTipoContenido() {
    const tipo = tipoContenidoSelect.value;

    archivoInput.value = "";
    enlaceExternoInput.value = "";

    if (tipo === "video_externo") {
        grupoArchivo.classList.add("campo-oculto");
        grupoVideo.classList.remove("campo-oculto");

        return;
    }

    grupoArchivo.classList.remove("campo-oculto");
    grupoVideo.classList.add("campo-oculto");

    if (tipo === "imagen") {
        archivoInput.accept = "image/*";
        ayudaArchivo.textContent =
            "Selecciona una fotografía o imagen.";
    }

    if (tipo === "audio") {
        archivoInput.accept = "audio/*";
        ayudaArchivo.textContent =
            "Selecciona un archivo de audio.";
    }
}

/* =========================================
   PUBLICAR CONTENIDO
========================================= */

subirButton.addEventListener("click", async function () {
    const titulo = tituloInput.value.trim();
    const descripcion = descripcionInput.value.trim();
    const categoria = categoriaSelect.value;
    const tipoContenido = tipoContenidoSelect.value;

    if (!titulo) {
        mostrarMensaje("Escribe un título.", "error");
        tituloInput.focus();
        return;
    }

    if (!usuarioActual) {
        mostrarMensaje(
            "No se encontró un usuario autenticado.",
            "error"
        );
        return;
    }

    if (tipoContenido === "video_externo") {
        await publicarVideoExterno({
            titulo,
            descripcion,
            categoria
        });

        return;
    }

    await publicarArchivo({
        titulo,
        descripcion,
        categoria,
        tipoContenido
    });
});

/* =========================================
   PUBLICAR ARCHIVO LOCAL
========================================= */

async function publicarArchivo({
    titulo,
    descripcion,
    categoria,
    tipoContenido
}) {
    const archivo = archivoInput.files[0];

    if (!archivo) {
        mostrarMensaje(
            tipoContenido === "audio"
                ? "Selecciona un archivo de audio."
                : "Selecciona una fotografía o imagen.",
            "error"
        );

        return;
    }

    if (!esArchivoPermitido(archivo, tipoContenido)) {
        mostrarMensaje(
            tipoContenido === "audio"
                ? "El archivo seleccionado no es un audio válido."
                : "El archivo seleccionado no es una imagen válida.",
            "error"
        );

        archivoInput.value = "";
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
                tipo_archivo: archivoSubido.tipoArchivo,

                tipo_contenido: "archivo",
                enlace_externo: null,
                plataforma: null
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
}

/* =========================================
   PUBLICAR VIDEO EXTERNO
========================================= */

async function publicarVideoExterno({
    titulo,
    descripcion,
    categoria
}) {
    const enlace = enlaceExternoInput.value.trim();

    if (!enlace) {
        mostrarMensaje(
            "Pega el enlace público del video.",
            "error"
        );

        enlaceExternoInput.focus();
        return;
    }

    if (!esUrlValida(enlace)) {
        mostrarMensaje(
            "El enlace del video no es válido.",
            "error"
        );

        enlaceExternoInput.focus();
        return;
    }

    const plataforma = detectarPlataforma(enlace);

    try {
        bloquearFormulario(true);
        mostrarMensaje("Publicando video...", "cargando");

        const { error } = await supabaseClient
    .from(TABLA)
    .insert({
        titulo,
        descripcion: descripcion || null,
        categoria,

        archivo_url: null,
        archivo_nombre: null,
        tipo_archivo: null,

        tipo_contenido: "video_externo",
        enlace_externo: enlace,
        plataforma
    });

if (error) {
    throw error;
}

        limpiarFormulario();

        mostrarMensaje(
            "Video publicado correctamente.",
            "exito"
        );

        await cargarGaleria();

    } catch (error) {
        console.error(
            "Error al publicar video externo:",
            error
        );

        mostrarMensaje(
            `No fue posible publicar el video: ${error.message}`,
            "error"
        );

    } finally {
        bloquearFormulario(false);
    }
}

/* =========================================
   CARGAR CONTENIDO PUBLICADO
========================================= */

async function cargarGaleria() {
    listaGaleria.textContent =
        "Cargando contenido...";

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
        contenedor.className =
            "grid-admin-multimedia";

        contenidos.forEach((contenido) => {
            const tarjeta =
                crearTarjeta(contenido);

            contenedor.appendChild(tarjeta);
        });

        listaGaleria.appendChild(contenedor);

    } catch (error) {
        console.error(
            "Error al cargar la galería:",
            error
        );

        listaGaleria.textContent =
            `No fue posible cargar el contenido: ${error.message}`;
    }
}

/* =========================================
   CREAR TARJETA MULTIMEDIA
========================================= */

function crearTarjeta(contenido) {
    const tarjeta =
        document.createElement("article");

    tarjeta.className =
        "tarjeta-admin-multimedia";

    const vistaPrevia =
        crearVistaPrevia(contenido);

    tarjeta.appendChild(vistaPrevia);

    const informacion =
        document.createElement("div");

    informacion.className =
        "informacion-multimedia";

    const titulo =
        document.createElement("h3");

    titulo.textContent =
        contenido.titulo || "Sin título";

    const categoria =
        document.createElement("p");

    categoria.className =
        "categoria-multimedia";

    categoria.textContent =
        contenido.categoria || "Sin categoría";

    informacion.appendChild(titulo);
    informacion.appendChild(categoria);

    if (contenido.descripcion) {
        const descripcion =
            document.createElement("p");

        descripcion.textContent =
            contenido.descripcion;

        informacion.appendChild(descripcion);
    }

    const detalle =
        document.createElement("small");

    if (contenido.tipo_contenido === "video_externo") {
        detalle.textContent =
            `Video externo · ${contenido.plataforma || "Otra plataforma"}`;
    } else {
        detalle.textContent =
            contenido.archivo_nombre ||
            "Archivo multimedia";
    }

    informacion.appendChild(detalle);

    const acciones =
        document.createElement("div");

    acciones.className =
        "acciones-multimedia";

    const abrir =
        document.createElement("a");

    abrir.href =
        contenido.tipo_contenido === "video_externo"
            ? contenido.enlace_externo
            : contenido.archivo_url;

    abrir.target = "_blank";
    abrir.rel = "noopener noreferrer";
    abrir.className = "boton-abrir";

    abrir.textContent =
        contenido.tipo_contenido === "video_externo"
            ? "Ver video"
            : "Abrir";

    const eliminar =
        document.createElement("button");

    eliminar.type = "button";
    eliminar.className = "boton-eliminar";
    eliminar.textContent = "Eliminar";

    eliminar.addEventListener(
        "click",
        function () {
            eliminarContenido(
                contenido,
                eliminar
            );
        }
    );

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
    const contenedor =
        document.createElement("div");

    contenedor.className =
        "vista-previa-multimedia";

    if (contenido.tipo_contenido === "video_externo") {
        const enlaceEmbed =
            obtenerEnlaceEmbed(
                contenido.enlace_externo
            );

        if (enlaceEmbed) {
            const iframe =
                document.createElement("iframe");

            iframe.src = enlaceEmbed;
            iframe.loading = "lazy";
            iframe.allow =
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;

            contenedor.appendChild(iframe);

            return contenedor;
        }

        const icono =
            document.createElement("div");

        icono.className = "icono-video";
        icono.textContent = "🎬";

        contenedor.appendChild(icono);

        return contenedor;
    }

    const tipo =
        contenido.tipo_archivo || "";

    if (tipo.startsWith("image/")) {
        const imagen =
            document.createElement("img");

        imagen.src =
            contenido.archivo_url;

        imagen.alt =
            contenido.titulo ||
            "Imagen de la galería";

        imagen.loading = "lazy";

        contenedor.appendChild(imagen);

        return contenedor;
    }

    if (tipo.startsWith("audio/")) {
        const audioIcono =
            document.createElement("div");

        audioIcono.className =
            "icono-audio";

        audioIcono.textContent = "🎵";

        const audio =
            document.createElement("audio");

        audio.src =
            contenido.archivo_url;

        audio.controls = true;
        audio.preload = "metadata";

        contenedor.appendChild(audioIcono);
        contenedor.appendChild(audio);

        return contenedor;
    }

    /*
       Compatibilidad con videos antiguos que
       ya pudieron haberse subido a Storage.
    */
    if (tipo.startsWith("video/")) {
        const video =
            document.createElement("video");

        video.src =
            contenido.archivo_url;

        video.controls = true;
        video.preload = "metadata";

        contenedor.appendChild(video);

        return contenedor;
    }

    const archivoGenerico =
        document.createElement("div");

    archivoGenerico.className =
        "archivo-generico";

    archivoGenerico.textContent =
        "Archivo multimedia";

    contenedor.appendChild(archivoGenerico);

    return contenedor;
}

/* =========================================
   ELIMINAR CONTENIDO
========================================= */

async function eliminarContenido(
    contenido,
    boton
) {
    const confirmacion = window.confirm(
        `¿Seguro que deseas eliminar "${contenido.titulo}"?`
    );

    if (!confirmacion) {
        return;
    }

    try {
        boton.disabled = true;
        boton.textContent =
            "Eliminando...";

        /*
           Si es video externo, NO existe
           ningún archivo en Storage.
        */
        if (
            contenido.tipo_contenido !==
            "video_externo"
        ) {
            const rutaArchivo =
                obtenerRutaDesdeUrl(
                    contenido.archivo_url,
                    BUCKET
                );

            if (rutaArchivo) {
                await eliminarArchivo({
                    supabaseClient,
                    bucket: BUCKET,
                    rutaArchivo
                });
            }
        }

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
        console.error(
            "Error al eliminar:",
            error
        );

        mostrarMensaje(
            `No fue posible eliminar: ${error.message}`,
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Eliminar";
    }
}

/* =========================================
   DETECTAR PLATAFORMA
========================================= */

function detectarPlataforma(url) {
    const enlace = url.toLowerCase();

    if (
        enlace.includes("youtube.com") ||
        enlace.includes("youtu.be")
    ) {
        return "YouTube";
    }

    if (enlace.includes("vimeo.com")) {
        return "Vimeo";
    }

    if (
        enlace.includes("dailymotion.com") ||
        enlace.includes("dai.ly")
    ) {
        return "Dailymotion";
    }

    if (
        enlace.includes("facebook.com") ||
        enlace.includes("fb.watch")
    ) {
        return "Facebook";
    }

    if (enlace.includes("instagram.com")) {
        return "Instagram";
    }

    if (enlace.includes("tiktok.com")) {
        return "TikTok";
    }

    return "Otra";
}

/* =========================================
   CREAR ENLACE EMBEBIDO
========================================= */

function obtenerEnlaceEmbed(url) {
    if (!url) {
        return null;
    }

    try {
        const parsedUrl = new URL(url);

        /*
           YOUTUBE
        */

        if (
            parsedUrl.hostname.includes(
                "youtube.com"
            )
        ) {
            if (
                parsedUrl.pathname.startsWith(
                    "/shorts/"
                )
            ) {
                const id =
                    parsedUrl.pathname
                        .split("/")[2];

                return id
                    ? `https://www.youtube.com/embed/${id}`
                    : null;
            }

            if (
                parsedUrl.pathname.startsWith(
                    "/embed/"
                )
            ) {
                return url;
            }

            const id =
                parsedUrl.searchParams.get("v");

            return id
                ? `https://www.youtube.com/embed/${id}`
                : null;
        }

        if (
            parsedUrl.hostname ===
                "youtu.be" ||
            parsedUrl.hostname.endsWith(
                ".youtu.be"
            )
        ) {
            const id =
                parsedUrl.pathname
                    .replace("/", "")
                    .split("?")[0];

            return id
                ? `https://www.youtube.com/embed/${id}`
                : null;
        }

        /*
           VIMEO
        */

        if (
            parsedUrl.hostname.includes(
                "vimeo.com"
            )
        ) {
            const partes =
                parsedUrl.pathname
                    .split("/")
                    .filter(Boolean);

            const id =
                partes.find((parte) =>
                    /^\d+$/.test(parte)
                );

            return id
                ? `https://player.vimeo.com/video/${id}`
                : null;
        }

        /*
           DAILYMOTION
        */

        if (
            parsedUrl.hostname.includes(
                "dailymotion.com"
            )
        ) {
            const coincidencia =
                parsedUrl.pathname.match(
                    /\/video\/([^_/?]+)/
                );

            return coincidencia?.[1]
                ? `https://www.dailymotion.com/embed/video/${coincidencia[1]}`
                : null;
        }

        if (
            parsedUrl.hostname.includes(
                "dai.ly"
            )
        ) {
            const id =
                parsedUrl.pathname
                    .replace("/", "")
                    .split("?")[0];

            return id
                ? `https://www.dailymotion.com/embed/video/${id}`
                : null;
        }

    } catch (error) {
        console.error(
            "No fue posible crear el enlace embebido:",
            error
        );
    }

    return null;
}

/* =========================================
   FUNCIONES AUXILIARES
========================================= */

function esArchivoPermitido(
    archivo,
    tipoContenido
) {
    if (tipoContenido === "imagen") {
        return archivo.type.startsWith(
            "image/"
        );
    }

    if (tipoContenido === "audio") {
        return archivo.type.startsWith(
            "audio/"
        );
    }

    return false;
}

function esUrlValida(valor) {
    try {
        const url = new URL(valor);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {
        return false;
    }
}

function limpiarFormulario() {
    tituloInput.value = "";
    descripcionInput.value = "";
    archivoInput.value = "";
    enlaceExternoInput.value = "";

    tipoContenidoSelect.value = "imagen";

    actualizarTipoContenido();
}

function bloquearFormulario(bloquear) {
    tipoContenidoSelect.disabled =
        bloquear;

    tituloInput.disabled =
        bloquear;

    descripcionInput.disabled =
        bloquear;

    categoriaSelect.disabled =
        bloquear;

    archivoInput.disabled =
        bloquear;

    enlaceExternoInput.disabled =
        bloquear;

    subirButton.disabled =
        bloquear;

    subirButton.textContent =
        bloquear
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

    mensaje.style.color =
        estilos[tipo] || "#333";
}

/* =========================================
   EJECUTAR
========================================= */

iniciarGaleria();