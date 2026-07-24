import {
    listarRegistros
} from "../utils/database.js";

const TABLA = "personajes";

const listaPersonajes =
    document.getElementById("lista-personajes-publicos");

const estadoPersonajes =
    document.getElementById("estado-personajes");

const buscarInput =
    document.getElementById("buscar-personaje");

const categoriaSelect =
    document.getElementById("filtrar-categoria");

const modal =
    document.getElementById("modal-personaje");

const contenidoModal =
    document.getElementById("contenido-modal-personaje");

const cerrarModalButton =
    document.getElementById("cerrar-modal-personaje");

let personajes = [];

/* =========================================
   INICIAR
========================================= */

async function iniciarPersonajes() {
    await cargarPersonajes();
    configurarEventos();
}

/* =========================================
   CARGAR PERSONAJES
========================================= */

async function cargarPersonajes() {
    estadoPersonajes.style.display = "block";
    estadoPersonajes.textContent =
        "Cargando personajes...";

    try {
        const { data, error } = await supabaseClient
    .from("personajes")
    .select("*")
    .order("created_at", { ascending: false });

if (error) {
    throw error;
}

personajes = data || [];

console.log("Personajes recibidos:", personajes);

estadoPersonajes.style.display = "block";
estadoPersonajes.textContent =
    `Supabase devolvió ${personajes.length} personaje(s).`;

cargarCategorias(personajes);
mostrarPersonajes(personajes);
    } catch (error) {
        console.error(
            "Error al cargar personajes:",
            error
        );

        estadoPersonajes.style.display = "block";
        estadoPersonajes.textContent =
            `No fue posible cargar los personajes: ${error.message}`;
    }
}

/* =========================================
   MOSTRAR PERSONAJES
========================================= */

function mostrarPersonajes(lista) {
    listaPersonajes.innerHTML = "";

    if (!lista || lista.length === 0) {
        estadoPersonajes.style.display = "block";
        estadoPersonajes.textContent =
            "No se encontraron personajes.";
        return;
    }

    estadoPersonajes.style.display = "none";

    lista.forEach((personaje) => {
        listaPersonajes.appendChild(
            crearTarjeta(personaje)
        );
    });
}

/* =========================================
   CREAR TARJETA
========================================= */

function crearTarjeta(personaje) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-personaje-publico";

    const contenedorImagen =
        document.createElement("div");

    contenedorImagen.className =
        "imagen-personaje-publico";

    if (personaje.imagen_url) {
        const imagen = document.createElement("img");

        imagen.src = personaje.imagen_url;
        imagen.alt = personaje.nombre || "Personaje";
        imagen.loading = "lazy";

        contenedorImagen.appendChild(imagen);
    } else {
        const sinImagen =
            document.createElement("div");

        sinImagen.className = "sin-imagen-publica";
        sinImagen.textContent = "Sin fotografía";

        contenedorImagen.appendChild(sinImagen);
    }

    const contenido = document.createElement("div");
    contenido.className =
        "contenido-personaje-publico";

    const categoria = document.createElement("span");
    categoria.className =
        "categoria-personaje-publico";

    categoria.textContent =
        personaje.categoria || "Sin categoría";

    const nombre = document.createElement("h3");
    nombre.textContent =
        personaje.nombre || "Sin nombre";

    const descripcion = document.createElement("p");
    descripcion.textContent =
        personaje.descripcion_corta || "";

    contenido.appendChild(categoria);
    contenido.appendChild(nombre);
    contenido.appendChild(descripcion);

    const datos = crearDatosBasicos(personaje);

    if (datos) {
        contenido.appendChild(datos);
    }

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "ver-biografia";
    boton.textContent = "Leer biografía";

    boton.addEventListener("click", function () {
        abrirModal(personaje);
    });

    contenido.appendChild(boton);

    tarjeta.appendChild(contenedorImagen);
    tarjeta.appendChild(contenido);

    return tarjeta;
}

/* =========================================
   DATOS BÁSICOS
========================================= */

function crearDatosBasicos(personaje) {
    const fragmentos = [];

    if (personaje.fecha_nacimiento) {
        fragmentos.push(
            `Nacimiento: ${personaje.fecha_nacimiento}`
        );
    }

    if (personaje.lugar_nacimiento) {
        fragmentos.push(
            `Lugar: ${personaje.lugar_nacimiento}`
        );
    }

    if (fragmentos.length === 0) {
        return null;
    }

    const datos = document.createElement("div");
    datos.className = "datos-personaje";

    fragmentos.forEach((texto) => {
        const linea = document.createElement("div");
        linea.textContent = texto;
        datos.appendChild(linea);
    });

    return datos;
}

/* =========================================
   MODAL
========================================= */

function abrirModal(personaje) {
    contenidoModal.innerHTML = "";

    if (personaje.imagen_url) {
        const imagen = document.createElement("img");

        imagen.src = personaje.imagen_url;
        imagen.alt = personaje.nombre || "Personaje";

        contenidoModal.appendChild(imagen);
    }

    const categoria = document.createElement("span");
    categoria.className =
        "categoria-personaje-publico";

    categoria.textContent =
        personaje.categoria || "Sin categoría";

    const nombre = document.createElement("h2");
    nombre.textContent =
        personaje.nombre || "Sin nombre";

    contenidoModal.appendChild(categoria);
    contenidoModal.appendChild(nombre);

    agregarDatoModal(
        "Fecha de nacimiento",
        personaje.fecha_nacimiento
    );

    agregarDatoModal(
        "Fecha de fallecimiento",
        personaje.fecha_fallecimiento
    );

    agregarDatoModal(
        "Lugar de nacimiento",
        personaje.lugar_nacimiento
    );

    const descripcion = document.createElement("p");
    descripcion.textContent =
        personaje.descripcion_corta || "";

    contenidoModal.appendChild(descripcion);

    const biografia = document.createElement("div");
    biografia.className = "biografia-completa";
    biografia.textContent =
        personaje.biografia || "Biografía no disponible.";

    contenidoModal.appendChild(biografia);

    modal.classList.add("activo");
    document.body.style.overflow = "hidden";
}

function agregarDatoModal(etiqueta, valor) {
    if (!valor) {
        return;
    }

    const dato = document.createElement("p");

    const textoFuerte = document.createElement("strong");
    textoFuerte.textContent = `${etiqueta}: `;

    dato.appendChild(textoFuerte);
    dato.appendChild(document.createTextNode(valor));

    contenidoModal.appendChild(dato);
}

function cerrarModal() {
    modal.classList.remove("activo");
    contenidoModal.innerHTML = "";
    document.body.style.overflow = "";
}

/* =========================================
   CATEGORÍAS
========================================= */

function cargarCategorias(lista) {
    const categorias = [
        ...new Set(
            lista
                .map((personaje) => personaje.categoria)
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b, "es"));

    categorias.forEach((categoria) => {
        const opcion = document.createElement("option");

        opcion.value = categoria;
        opcion.textContent = categoria;

        categoriaSelect.appendChild(opcion);
    });
}

/* =========================================
   FILTROS
========================================= */

function filtrarPersonajes() {
    const busqueda =
        buscarInput.value.trim().toLowerCase();

    const categoriaSeleccionada =
        categoriaSelect.value;

    const resultados = personajes.filter(
        (personaje) => {
            const textoPersonaje = [
                personaje.nombre,
                personaje.descripcion_corta,
                personaje.biografia,
                personaje.categoria,
                personaje.lugar_nacimiento
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const coincideBusqueda =
                !busqueda ||
                textoPersonaje.includes(busqueda);

            const coincideCategoria =
                categoriaSeleccionada === "todas" ||
                personaje.categoria ===
                    categoriaSeleccionada;

            return (
                coincideBusqueda &&
                coincideCategoria
            );
        }
    );

    mostrarPersonajes(resultados);
}

/* =========================================
   EVENTOS
========================================= */

function configurarEventos() {
    buscarInput.addEventListener(
        "input",
        filtrarPersonajes
    );

    categoriaSelect.addEventListener(
        "change",
        filtrarPersonajes
    );

    cerrarModalButton.addEventListener(
        "click",
        cerrarModal
    );

    modal.addEventListener("click", function (evento) {
        if (evento.target === modal) {
            cerrarModal();
        }
    });

    document.addEventListener(
        "keydown",
        function (evento) {
            if (
                evento.key === "Escape" &&
                modal.classList.contains("activo")
            ) {
                cerrarModal();
            }
        }
    );
}

/* =========================================
   EJECUTAR
========================================= */

iniciarPersonajes();