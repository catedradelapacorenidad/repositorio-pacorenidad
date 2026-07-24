import {
    subirArchivo,
    eliminarArchivo,
    obtenerRutaDesdeUrl
} from "../utils/storage.js";

import {
    guardarRegistro,
    listarRegistros,
    actualizarRegistro,
    eliminarRegistro
} from "../utils/database.js";

const TABLA = "personajes";
const BUCKET = "personajes";
const LIMITE_MB = 8;

const formulario = document.getElementById("form-personaje");
const personajeIdInput = document.getElementById("personaje-id");

const nombreInput = document.getElementById("nombre");
const categoriaInput = document.getElementById("categoria");
const fechaNacimientoInput =
    document.getElementById("fecha-nacimiento");
const fechaFallecimientoInput =
    document.getElementById("fecha-fallecimiento");
const lugarNacimientoInput =
    document.getElementById("lugar-nacimiento");
const descripcionCortaInput =
    document.getElementById("descripcion-corta");
const biografiaInput = document.getElementById("biografia");
const imagenInput = document.getElementById("imagen");

const vistaImagen = document.getElementById("vista-imagen");
const imagenPrevia = document.getElementById("imagen-previa");

const guardarButton =
    document.getElementById("guardar-personaje");
const cancelarButton =
    document.getElementById("cancelar-edicion");

const mensaje = document.getElementById("mensaje");
const listaPersonajes =
    document.getElementById("lista-personajes");

let usuarioActual = null;
let personajes = [];
let personajeEnEdicion = null;

/* =========================================
   INICIAR MÓDULO
========================================= */

async function iniciarModulo() {
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

        await cargarPersonajes();
    } catch (error) {
        console.error("Error al iniciar personajes:", error);

        mostrarMensaje(
            `No fue posible iniciar el módulo: ${error.message}`,
            "error"
        );
    }
}

/* =========================================
   VISTA PREVIA DE IMAGEN
========================================= */

imagenInput.addEventListener("change", function () {
    const archivo = imagenInput.files[0];

    if (!archivo) {
        if (!personajeEnEdicion?.imagen_url) {
            ocultarVistaPrevia();
        }

        return;
    }

    if (!archivo.type.startsWith("image/")) {
        mostrarMensaje(
            "Solo puedes seleccionar archivos de imagen.",
            "error"
        );

        imagenInput.value = "";
        ocultarVistaPrevia();
        return;
    }

    const urlTemporal = URL.createObjectURL(archivo);

    imagenPrevia.src = urlTemporal;
    vistaImagen.style.display = "block";

    imagenPrevia.onload = function () {
        URL.revokeObjectURL(urlTemporal);
    };
});

/* =========================================
   GUARDAR O ACTUALIZAR PERSONAJE
========================================= */

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const id = personajeIdInput.value;
    const archivoImagen = imagenInput.files[0];

    const nombre = nombreInput.value.trim();
    const categoria = categoriaInput.value;
    const descripcionCorta =
        descripcionCortaInput.value.trim();
    const biografia = biografiaInput.value.trim();

    if (!nombre) {
        mostrarMensaje("Escribe el nombre del personaje.", "error");
        nombreInput.focus();
        return;
    }

    if (!categoria) {
        mostrarMensaje("Selecciona una categoría.", "error");
        categoriaInput.focus();
        return;
    }

    if (!descripcionCorta) {
        mostrarMensaje(
            "Escribe una descripción corta.",
            "error"
        );

        descripcionCortaInput.focus();
        return;
    }

    if (!biografia) {
        mostrarMensaje("Escribe la biografía.", "error");
        biografiaInput.focus();
        return;
    }

    if (!id && !archivoImagen) {
        mostrarMensaje(
            "Selecciona una fotografía para el personaje.",
            "error"
        );

        return;
    }

    let nuevaImagenSubida = null;

    try {
        bloquearFormulario(true);

        mostrarMensaje(
            id
                ? "Actualizando personaje..."
                : "Publicando personaje...",
            "cargando"
        );

        let imagenUrl =
            personajeEnEdicion?.imagen_url || null;

        let imagenNombre =
            personajeEnEdicion?.imagen_nombre || null;

        if (archivoImagen) {
            nuevaImagenSubida = await subirArchivo({
                supabaseClient,
                bucket: BUCKET,
                archivo: archivoImagen,
                usuarioId: usuarioActual.id,
                limiteMB: LIMITE_MB
            });

            imagenUrl = nuevaImagenSubida.urlPublica;
            imagenNombre = nuevaImagenSubida.nombreOriginal;
        }

        const datosPersonaje = {
            nombre,
            categoria,
            descripcion_corta: descripcionCorta,
            biografia,
            fecha_nacimiento:
                fechaNacimientoInput.value.trim() || null,
            fecha_fallecimiento:
                fechaFallecimientoInput.value.trim() || null,
            lugar_nacimiento:
                lugarNacimientoInput.value.trim() || null,
            imagen_url: imagenUrl,
            imagen_nombre: imagenNombre
        };

        if (id) {
            await actualizarRegistro(
                supabaseClient,
                TABLA,
                id,
                datosPersonaje
            );

            /*
             Si se subió una imagen nueva, eliminamos la anterior.
            */
            if (
                nuevaImagenSubida &&
                personajeEnEdicion?.imagen_url
            ) {
                await eliminarImagenAnterior(
                    personajeEnEdicion.imagen_url
                );
            }

            mostrarMensaje(
                "Personaje actualizado correctamente.",
                "exito"
            );
        } else {
            await guardarRegistro(
                supabaseClient,
                TABLA,
                datosPersonaje
            );

            mostrarMensaje(
                "Personaje publicado correctamente.",
                "exito"
            );
        }

        limpiarFormulario();
        await cargarPersonajes();
    } catch (error) {
        console.error("Error al guardar personaje:", error);

        /*
         Si la imagen se subió, pero falló la base de datos,
         eliminamos el archivo recién subido.
        */
        if (nuevaImagenSubida?.ruta) {
            try {
                await eliminarArchivo({
                    supabaseClient,
                    bucket: BUCKET,
                    rutaArchivo: nuevaImagenSubida.ruta
                });
            } catch (errorLimpieza) {
                console.error(
                    "No se pudo limpiar la imagen:",
                    errorLimpieza
                );
            }
        }

        mostrarMensaje(
            `No fue posible guardar: ${error.message}`,
            "error"
        );
    } finally {
        bloquearFormulario(false);
    }
});

/* =========================================
   CARGAR PERSONAJES
========================================= */

async function cargarPersonajes() {
    listaPersonajes.textContent =
        "Cargando personajes...";

    try {
        personajes = await listarRegistros(
            supabaseClient,
            TABLA
        );

        listaPersonajes.innerHTML = "";

        if (!personajes || personajes.length === 0) {
            listaPersonajes.textContent =
                "Todavía no hay personajes publicados.";
            return;
        }

        const contenedor = document.createElement("div");
        contenedor.className = "grid-personajes-admin";

        personajes.forEach((personaje) => {
            contenedor.appendChild(
                crearTarjetaPersonaje(personaje)
            );
        });

        listaPersonajes.appendChild(contenedor);
    } catch (error) {
        console.error("Error al cargar personajes:", error);

        listaPersonajes.textContent =
            `No fue posible cargar los personajes: ${error.message}`;
    }
}

/* =========================================
   CREAR TARJETA
========================================= */

function crearTarjetaPersonaje(personaje) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-personaje-admin";

    const contenedorImagen = document.createElement("div");
    contenedorImagen.className = "imagen-personaje-admin";

    if (personaje.imagen_url) {
        const imagen = document.createElement("img");

        imagen.src = personaje.imagen_url;
        imagen.alt = personaje.nombre || "Personaje";
        imagen.loading = "lazy";

        contenedorImagen.appendChild(imagen);
    } else {
        const sinImagen = document.createElement("div");
        sinImagen.className = "sin-imagen-personaje";
        sinImagen.textContent = "Sin fotografía";

        contenedorImagen.appendChild(sinImagen);
    }

    const informacion = document.createElement("div");
    informacion.className = "informacion-personaje-admin";

    const categoria = document.createElement("span");
    categoria.className = "categoria-personaje";
    categoria.textContent =
        personaje.categoria || "Sin categoría";

    const nombre = document.createElement("h3");
    nombre.textContent = personaje.nombre || "Sin nombre";

    const descripcion = document.createElement("p");
    descripcion.textContent =
        personaje.descripcion_corta || "";

    const acciones = document.createElement("div");
    acciones.className = "acciones-personaje";

    const editarButton = document.createElement("button");
    editarButton.type = "button";
    editarButton.className = "boton-editar";
    editarButton.textContent = "Editar";

    editarButton.addEventListener("click", function () {
        cargarPersonajeEnFormulario(personaje);
    });

    const eliminarButton = document.createElement("button");
    eliminarButton.type = "button";
    eliminarButton.className = "boton-eliminar";
    eliminarButton.textContent = "Eliminar";

    eliminarButton.addEventListener("click", function () {
        eliminarPersonaje(personaje, eliminarButton);
    });

    acciones.appendChild(editarButton);
    acciones.appendChild(eliminarButton);

    informacion.appendChild(categoria);
    informacion.appendChild(nombre);
    informacion.appendChild(descripcion);
    informacion.appendChild(acciones);

    tarjeta.appendChild(contenedorImagen);
    tarjeta.appendChild(informacion);

    return tarjeta;
}

/* =========================================
   CARGAR PERSONAJE PARA EDITAR
========================================= */

function cargarPersonajeEnFormulario(personaje) {
    personajeEnEdicion = personaje;

    personajeIdInput.value = personaje.id;
    nombreInput.value = personaje.nombre || "";
    categoriaInput.value = personaje.categoria || "";

    fechaNacimientoInput.value =
        personaje.fecha_nacimiento || "";

    fechaFallecimientoInput.value =
        personaje.fecha_fallecimiento || "";

    lugarNacimientoInput.value =
        personaje.lugar_nacimiento || "";

    descripcionCortaInput.value =
        personaje.descripcion_corta || "";

    biografiaInput.value =
        personaje.biografia || "";

    imagenInput.value = "";

    if (personaje.imagen_url) {
        imagenPrevia.src = personaje.imagen_url;
        vistaImagen.style.display = "block";
    } else {
        ocultarVistaPrevia();
    }

    guardarButton.textContent = "Guardar cambios";
    cancelarButton.style.display = "inline-block";

    mostrarMensaje(
        `Editando a ${personaje.nombre}.`,
        "cargando"
    );

    formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================================
   CANCELAR EDICIÓN
========================================= */

cancelarButton.addEventListener("click", function () {
    limpiarFormulario();

    mostrarMensaje(
        "Edición cancelada.",
        "cargando"
    );
});

/* =========================================
   ELIMINAR PERSONAJE
========================================= */

async function eliminarPersonaje(personaje, boton) {
    const confirmacion = window.confirm(
        `¿Seguro que deseas eliminar a "${personaje.nombre}"?`
    );

    if (!confirmacion) {
        return;
    }

    try {
        boton.disabled = true;
        boton.textContent = "Eliminando...";

        /*
         Primero eliminamos el registro.
         Después eliminamos la imagen.
        */
        await eliminarRegistro(
            supabaseClient,
            TABLA,
            personaje.id
        );

        if (personaje.imagen_url) {
            try {
                await eliminarImagenAnterior(
                    personaje.imagen_url
                );
            } catch (errorImagen) {
                console.error(
                    "El registro se eliminó, pero no la imagen:",
                    errorImagen
                );
            }
        }

        if (
            personajeEnEdicion &&
            String(personajeEnEdicion.id) ===
                String(personaje.id)
        ) {
            limpiarFormulario();
        }

        mostrarMensaje(
            "Personaje eliminado correctamente.",
            "exito"
        );

        await cargarPersonajes();
    } catch (error) {
        console.error("Error al eliminar personaje:", error);

        mostrarMensaje(
            `No fue posible eliminar: ${error.message}`,
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Eliminar";
    }
}

/* =========================================
   ELIMINAR IMAGEN ANTERIOR
========================================= */

async function eliminarImagenAnterior(imagenUrl) {
    const rutaArchivo = obtenerRutaDesdeUrl(
        imagenUrl,
        BUCKET
    );

    if (!rutaArchivo) {
        throw new Error(
            "No fue posible identificar la ruta de la imagen."
        );
    }

    await eliminarArchivo({
        supabaseClient,
        bucket: BUCKET,
        rutaArchivo
    });
}

/* =========================================
   LIMPIAR FORMULARIO
========================================= */

function limpiarFormulario() {
    formulario.reset();

    personajeIdInput.value = "";
    personajeEnEdicion = null;

    guardarButton.textContent = "Publicar personaje";
    cancelarButton.style.display = "none";

    ocultarVistaPrevia();
}

/* =========================================
   OCULTAR VISTA PREVIA
========================================= */

function ocultarVistaPrevia() {
    imagenPrevia.src = "";
    vistaImagen.style.display = "none";
}

/* =========================================
   BLOQUEAR FORMULARIO
========================================= */

function bloquearFormulario(bloquear) {
    const campos = formulario.querySelectorAll(
        "input, textarea, select, button"
    );

    campos.forEach((campo) => {
        campo.disabled = bloquear;
    });

    guardarButton.textContent = bloquear
        ? "Guardando..."
        : personajeEnEdicion
            ? "Guardar cambios"
            : "Publicar personaje";
}

/* =========================================
   MOSTRAR MENSAJE
========================================= */

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;

    const colores = {
        exito: "#18743c",
        error: "#b52b2b",
        cargando: "#8b6514"
    };

    mensaje.style.color = colores[tipo] || "#333";
}

/* =========================================
   EJECUTAR
========================================= */

iniciarModulo();