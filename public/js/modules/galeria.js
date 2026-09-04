import {
    listarRegistros
} from "../utils/database.js";

const TABLA = "galeria";

const contenedorGaleria =
    document.getElementById("galeria-publica");

const estadoGaleria =
    document.getElementById("estado-galeria");

const botonesFiltro =
    document.querySelectorAll(".filtro-galeria");

const filtrosVideo =
    document.getElementById("filtros-video");

const botonesFiltroVideo =
    document.querySelectorAll(".filtro-video");

let contenidosGaleria = [];

/* =========================================
   INICIAR GALERÍA
========================================= */

async function iniciarGaleriaPublica() {
    await cargarContenido();
    configurarFiltros();
    configurarFiltrosVideo();
}

/* =========================================
   CARGAR CONTENIDO
========================================= */

async function cargarContenido() {
    estadoGaleria.style.display = "block";
    estadoGaleria.textContent = "Cargando contenido...";

    try {
        contenidosGaleria = await listarRegistros(
            supabaseClient,
            TABLA
        );

        mostrarContenido(contenidosGaleria);

    } catch (error) {
        console.error(
            "Error al cargar la galería pública:",
            error
        );

        estadoGaleria.style.display = "block";
        estadoGaleria.textContent =
            `No fue posible cargar la galería: ${error.message}`;
    }
}

/* =========================================
   MOSTRAR CONTENIDO
========================================= */

function mostrarContenido(contenidos) {
    contenedorGaleria.innerHTML = "";

    if (!contenidos || contenidos.length === 0) {
        estadoGaleria.style.display = "block";
        estadoGaleria.textContent =
            "Todavía no hay contenido publicado.";
        return;
    }

    estadoGaleria.style.display = "none";

    contenidos.forEach((contenido) => {
        const tarjeta = crearTarjeta(contenido);
        contenedorGaleria.appendChild(tarjeta);
    });
}

/* =========================================
   CREAR TARJETA
========================================= */

function crearTarjeta(contenido) {
    const tarjeta = document.createElement("article");

    tarjeta.className = "tarjeta-galeria-publica";

    const tipoGeneral =
        obtenerTipoGeneral(contenido);

    tarjeta.dataset.tipo = tipoGeneral;

    const vistaPrevia = crearVistaPrevia(contenido);

    const informacion = document.createElement("div");
    informacion.className = "contenido-galeria-publica";

    const categoria = document.createElement("span");
    categoria.className = "categoria-galeria-publica";
    categoria.textContent =
        contenido.categoria || "Sin categoría";

    const titulo = document.createElement("h3");
    titulo.textContent =
        contenido.titulo || "Sin título";

    informacion.appendChild(categoria);
    informacion.appendChild(titulo);

    if (contenido.descripcion) {
        const descripcion = document.createElement("p");
        descripcion.textContent = contenido.descripcion;
        informacion.appendChild(descripcion);
    }

    const enlace = document.createElement("a");

    enlace.href =
        contenido.tipo_contenido === "video_externo"
            ? contenido.enlace_externo
            : contenido.archivo_url;

    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.className = "abrir-multimedia";
    enlace.textContent = obtenerTextoEnlace(tipoGeneral);

    informacion.appendChild(enlace);

    tarjeta.appendChild(vistaPrevia);
    tarjeta.appendChild(informacion);

    return tarjeta;
}

/* =========================================
   CREAR VISTA PREVIA
========================================= */

function crearVistaPrevia(contenido) {
    const contenedor = document.createElement("div");
    contenedor.className = "vista-galeria-publica";

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
            iframe.title =
                contenido.titulo || "Video de la galería";

            contenedor.appendChild(iframe);

            return contenedor;
        }

        const iconoVideo =
            document.createElement("div");

        iconoVideo.className =
            "icono-video-publico";

        iconoVideo.textContent = "🎬";

        contenedor.appendChild(iconoVideo);

        return contenedor;
    }

    const tipo =
        contenido.tipo_archivo || "";

    if (tipo.startsWith("image/")) {
        const imagen = document.createElement("img");

        imagen.src = contenido.archivo_url;
        imagen.alt =
            contenido.titulo || "Imagen de la galería";
        imagen.loading = "lazy";

        contenedor.appendChild(imagen);

        return contenedor;
    }

    /*
       Compatibilidad con videos antiguos
       que ya estuvieran alojados en Storage.
    */
    if (tipo.startsWith("video/")) {
        const video = document.createElement("video");

        video.src = contenido.archivo_url;
        video.controls = true;
        video.preload = "metadata";

        contenedor.appendChild(video);

        return contenedor;
    }

    if (tipo.startsWith("audio/")) {
        const bloqueAudio = document.createElement("div");

        const icono = document.createElement("div");
        icono.className = "icono-audio-publico";
        icono.textContent = "🎵";

        const audio = document.createElement("audio");

        audio.src = contenido.archivo_url;
        audio.controls = true;
        audio.preload = "metadata";

        bloqueAudio.appendChild(icono);
        bloqueAudio.appendChild(audio);

        contenedor.appendChild(bloqueAudio);

        return contenedor;
    }

    const archivo = document.createElement("p");
    archivo.textContent = "Archivo multimedia";

    contenedor.appendChild(archivo);

    return contenedor;
}

/* =========================================
   FILTROS
========================================= */

function configurarFiltros() {
    botonesFiltro.forEach((boton) => {
        boton.addEventListener("click", function () {
            botonesFiltro.forEach((otroBoton) => {
                otroBoton.classList.remove("activo");
            });

            boton.classList.add("activo");

            const filtro = boton.dataset.filtro;
if (filtro === "video") {
    filtrosVideo.style.display = "block";

    botonesFiltroVideo.forEach((botonVideo) => {
        botonVideo.classList.remove("activo");
    });

    const botonTodas = document.querySelector(
        '[data-categoria-video="todas"]'
    );

    if (botonTodas) {
        botonTodas.classList.add("activo");
    }

} else {
    filtrosVideo.style.display = "none";
}
            if (filtro === "todos") {
                mostrarContenido(contenidosGaleria);
                return;
            }

            const resultados =
                contenidosGaleria.filter((contenido) => {
                    return obtenerTipoGeneral(
                        contenido
                    ) === filtro;
                });

            mostrarContenido(resultados);

            if (resultados.length === 0) {
                estadoGaleria.style.display = "block";
                estadoGaleria.textContent =
                    "No hay contenido en esta categoría.";
            }
        });
    });
}
/* =========================================
   FILTROS TEMÁTICOS DE VIDEO
========================================= */

function configurarFiltrosVideo() {
    botonesFiltroVideo.forEach((boton) => {
        boton.addEventListener("click", function () {

            botonesFiltroVideo.forEach((otroBoton) => {
                otroBoton.classList.remove("activo");
            });

            boton.classList.add("activo");

            const categoriaSeleccionada =
                boton.dataset.categoriaVideo;

            const videos =
                contenidosGaleria.filter((contenido) => {
                    return obtenerTipoGeneral(contenido) === "video";
                });

            if (categoriaSeleccionada === "todas") {
                mostrarContenido(videos);
                return;
            }

            const resultados =
                videos.filter((contenido) => {
                    return contenido.categoria === categoriaSeleccionada;
                });

            mostrarContenido(resultados);

            if (resultados.length === 0) {
                estadoGaleria.style.display = "block";
                estadoGaleria.textContent =
                    "No hay videos en esta categoría.";
            }
        });
    });
}
/* =========================================
   TIPO GENERAL
========================================= */

function obtenerTipoGeneral(contenido) {
    if (
        contenido.tipo_contenido ===
        "video_externo"
    ) {
        return "video";
    }

    const tipoArchivo =
        contenido.tipo_archivo || "";

    if (tipoArchivo.startsWith("image/")) {
        return "imagen";
    }

    if (tipoArchivo.startsWith("video/")) {
        return "video";
    }

    if (tipoArchivo.startsWith("audio/")) {
        return "audio";
    }

    return "otro";
}

/* =========================================
   TEXTO DEL BOTÓN
========================================= */

function obtenerTextoEnlace(tipo) {
    if (tipo === "imagen") {
        return "Ver imagen";
    }

    if (tipo === "video") {
        return "Ver video";
    }

    if (tipo === "audio") {
        return "Escuchar audio";
    }

    return "Abrir archivo";
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
            parsedUrl.hostname === "youtu.be" ||
            parsedUrl.hostname.endsWith(".youtu.be")
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
   EJECUTAR
========================================= */

iniciarGaleriaPublica();