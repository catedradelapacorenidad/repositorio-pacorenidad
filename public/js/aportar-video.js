const tituloInput = document.getElementById("titulo");
const descripcionInput = document.getElementById("descripcion");
const categoriaSelect = document.getElementById("categoria");
const enlaceInput = document.getElementById("enlace");
const publicarButton = document.getElementById("publicar");
const mensaje = document.getElementById("mensaje");

let usuarioActual = null;
let nombreAutor = null;

/* =========================================
   INICIAR
========================================= */

async function iniciar() {
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

        await cargarPerfil();

    } catch (error) {
        console.error(
            "Error al iniciar publicación de video:",
            error
        );

        mostrarMensaje(
            "No fue posible verificar tu sesión.",
            "error"
        );
    }
}

/* =========================================
   CARGAR PERFIL
========================================= */

async function cargarPerfil() {
    try {
        const { data, error } = await supabaseClient
            .from("profiles")
            .select("nombre, rol")
            .eq("id", usuarioActual.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        nombreAutor =
            data?.nombre ||
            usuarioActual.user_metadata?.nombre ||
            usuarioActual.email ||
            "Colaborador";

    } catch (error) {
        console.error(
            "No fue posible cargar el perfil:",
            error
        );

        nombreAutor =
            usuarioActual.email ||
            "Colaborador";
    }
}

/* =========================================
   PUBLICAR VIDEO
========================================= */

publicarButton.addEventListener(
    "click",
    async function () {

        const titulo =
            tituloInput.value.trim();

        const descripcion =
            descripcionInput.value.trim();

        const categoria =
            categoriaSelect.value;

        const enlace =
            enlaceInput.value.trim();

        if (!titulo) {
            mostrarMensaje(
                "Escribe un título para el video.",
                "error"
            );

            tituloInput.focus();
            return;
        }

        if (!descripcion) {
            mostrarMensaje(
                "Escribe una breve descripción.",
                "error"
            );

            descripcionInput.focus();
            return;
        }

        if (!enlace) {
            mostrarMensaje(
                "Pega el enlace público del video.",
                "error"
            );

            enlaceInput.focus();
            return;
        }

        if (!esUrlValida(enlace)) {
            mostrarMensaje(
                "El enlace del video no es válido.",
                "error"
            );

            enlaceInput.focus();
            return;
        }

        const plataforma =
            detectarPlataforma(enlace);

        try {
            bloquearFormulario(true);

            mostrarMensaje(
                "Publicando video...",
                "cargando"
            );

            const { error } = await supabaseClient
                .from("galeria")
                .insert({
                    titulo,
                    descripcion,
                    categoria,

                    tipo_contenido:
                        "video_externo",

                    enlace_externo:
                        enlace,

                    plataforma,

                    archivo_url:
                        null,

                    archivo_nombre:
                        null,

                    tipo_archivo:
                        null,

                    autor_id:
                        usuarioActual.id,

                    autor_nombre:
                        nombreAutor
                });

            if (error) {
                throw error;
            }

            limpiarFormulario();

            mostrarMensaje(
                "Video publicado correctamente en la Galería.",
                "exito"
            );

        } catch (error) {
            console.error(
                "Error al publicar video:",
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
);

/* =========================================
   DETECTAR PLATAFORMA
========================================= */

function detectarPlataforma(url) {
    const enlace =
        url.toLowerCase();

    if (
        enlace.includes("youtube.com") ||
        enlace.includes("youtu.be")
    ) {
        return "YouTube";
    }

    if (
        enlace.includes("vimeo.com")
    ) {
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

    if (
        enlace.includes("instagram.com")
    ) {
        return "Instagram";
    }

    if (
        enlace.includes("tiktok.com")
    ) {
        return "TikTok";
    }

    return "Otra";
}

/* =========================================
   VALIDAR URL
========================================= */

function esUrlValida(valor) {
    try {
        const url =
            new URL(valor);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {
        return false;
    }
}

/* =========================================
   LIMPIAR
========================================= */

function limpiarFormulario() {
    tituloInput.value = "";
    descripcionInput.value = "";
    enlaceInput.value = "";

    categoriaSelect.selectedIndex = 0;
}

/* =========================================
   BLOQUEAR FORMULARIO
========================================= */

function bloquearFormulario(bloquear) {
    tituloInput.disabled =
        bloquear;

    descripcionInput.disabled =
        bloquear;

    categoriaSelect.disabled =
        bloquear;

    enlaceInput.disabled =
        bloquear;

    publicarButton.disabled =
        bloquear;

    publicarButton.textContent =
        bloquear
            ? "Publicando..."
            : "Publicar video";
}

/* =========================================
   MENSAJES
========================================= */

function mostrarMensaje(texto, tipo) {
    mensaje.textContent =
        texto;

    const estilos = {
        exito: "#18743c",
        error: "#b52b2b",
        cargando: "#8b6514"
    };

    mensaje.style.color =
        estilos[tipo] ||
        "#333";
}

/* =========================================
   EJECUTAR
========================================= */

iniciar();