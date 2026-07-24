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

let contenidosGaleria = [];

/* =========================================
   INICIAR GALERÍA
========================================= */

async function iniciarGaleriaPublica() {
    await cargarContenido();
    configurarFiltros();
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
        obtenerTipoGeneral(contenido.tipo_archivo);

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
    enlace.href = contenido.archivo_url;
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

            if (filtro === "todos") {
                mostrarContenido(contenidosGaleria);
                return;
            }

            const resultados =
                contenidosGaleria.filter((contenido) => {
                    return obtenerTipoGeneral(
                        contenido.tipo_archivo
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
   FUNCIONES AUXILIARES
========================================= */

function obtenerTipoGeneral(tipoArchivo = "") {
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
   EJECUTAR
========================================= */

iniciarGaleriaPublica();