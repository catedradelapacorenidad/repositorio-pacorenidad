let mapaAdmin;
let marcadorSeleccionado;
let lugaresCargados = [];

const PACORA_CENTER = {
  lat: 5.527,
  lng: -75.459
};

document.addEventListener("DOMContentLoaded", iniciarModulo);

/* =========================================
   INICIAR MÓDULO
========================================= */

async function iniciarModulo() {
  try {
    iniciarMapaAdmin();
    configurarEventos();

    await cargarLugares();
  } catch (error) {
    console.error("Error al iniciar el módulo:", error);

    mostrarEstado(
      `No fue posible iniciar el módulo: ${error.message}`,
      true
    );
  }
}

/* =========================================
   MAPA ADMINISTRATIVO
========================================= */

function iniciarMapaAdmin() {
  if (typeof L === "undefined") {
    throw new Error("Leaflet no está cargado.");
  }

  mapaAdmin = L.map("mapa-admin-lugares").setView(
    [PACORA_CENTER.lat, PACORA_CENTER.lng],
    14
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  ).addTo(mapaAdmin);

  setTimeout(() => {
    mapaAdmin.invalidateSize();
  }, 200);
}

/* =========================================
   EVENTOS
========================================= */

function configurarEventos() {
  const filtro = document.getElementById("filtro-estado");
  const botonRecargar =
    document.getElementById("recargar-lugares");

  filtro.addEventListener("change", renderizarLugares);

  botonRecargar.addEventListener("click", cargarLugares);
}

/* =========================================
   CARGAR LUGARES
========================================= */

async function cargarLugares() {
  try {
    mostrarEstado("Cargando lugares...");

    const { data, error } = await supabaseClient
      .from("lugares")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    lugaresCargados = data || [];

    renderizarLugares();

    mostrarEstado(
      "Lugares cargados correctamente."
    );
  } catch (error) {
    console.error("Error al cargar lugares:", error);

    lugaresCargados = [];

    renderizarLugares();

    mostrarEstado(
      `No fue posible cargar los lugares: ${error.message}`,
      true
    );
  }
}

/* =========================================
   RENDERIZAR LISTA
========================================= */

function renderizarLugares() {
  const lista =
    document.getElementById("lista-lugares-admin");

  const contador =
    document.getElementById("contador-lugares");

  const filtro =
    document.getElementById("filtro-estado").value;

  const lugaresFiltrados =
    filtro === "todos"
      ? lugaresCargados
      : lugaresCargados.filter(
          (lugar) => lugar.estado === filtro
        );

  contador.textContent =
    lugaresFiltrados.length === 1
      ? "1 lugar"
      : `${lugaresFiltrados.length} lugares`;

  if (lugaresFiltrados.length === 0) {
    lista.innerHTML = `
      <p class="empty-places">
        No hay lugares para mostrar.
      </p>
    `;

    return;
  }

  lista.innerHTML = "";

  lugaresFiltrados.forEach((lugar) => {
    lista.appendChild(crearTarjetaLugar(lugar));
  });
}

/* =========================================
   CREAR TARJETA
========================================= */

function crearTarjetaLugar(lugar) {
  const tarjeta = document.createElement("article");

  tarjeta.className = "item-admin";

  const contenido = document.createElement("div");

  const nombre = document.createElement("h3");
  nombre.textContent = lugar.nombre || "Lugar sin nombre";

  const categoria = document.createElement("p");
  categoria.innerHTML = `
    <strong>Categoría:</strong>
    ${escaparHtml(lugar.categoria || "Sin categoría")}
  `;

  const autor = document.createElement("p");
  autor.innerHTML = `
    <strong>Autor:</strong>
    ${escaparHtml(lugar.autor || "No indicado")}
  `;

  const estado = document.createElement("p");
  estado.innerHTML = `
    <strong>Estado:</strong>
    <span class="badge">
      ${escaparHtml(lugar.estado || "pendiente")}
    </span>
  `;

  const fecha = document.createElement("small");
  fecha.textContent = lugar.created_at
    ? `Enviado: ${formatearFecha(lugar.created_at)}`
    : "";

  contenido.appendChild(nombre);
  contenido.appendChild(categoria);
  contenido.appendChild(autor);
  contenido.appendChild(estado);
  contenido.appendChild(fecha);

  const acciones = document.createElement("div");
  acciones.className = "acciones-admin";

  const botonVer = crearBoton(
    "Ver",
    "btn-ver-admin",
    () => verLugar(lugar)
  );

  const botonAprobar = crearBoton(
    "Aprobar",
    "",
    () => cambiarEstado(lugar.id, "aprobado")
  );

  const botonRechazar = crearBoton(
    "Rechazar",
    "secondary",
    () => cambiarEstado(lugar.id, "rechazado")
  );

  const botonEliminar = crearBoton(
    "Eliminar",
    "btn-eliminar",
    () => eliminarLugar(lugar)
  );

  acciones.appendChild(botonVer);
  acciones.appendChild(botonAprobar);
  acciones.appendChild(botonRechazar);
  acciones.appendChild(botonEliminar);

  tarjeta.appendChild(contenido);
  tarjeta.appendChild(acciones);

  return tarjeta;
}

function crearBoton(texto, clase, accion) {
  const boton = document.createElement("button");

  boton.type = "button";
  boton.textContent = texto;

  if (clase) {
    boton.className = clase;
  }

  boton.addEventListener("click", accion);

  return boton;
}

/* =========================================
   VER LUGAR EN EL MAPA
========================================= */

function verLugar(lugar) {
  const latitud = Number(lugar.latitud);
  const longitud = Number(lugar.longitud);

  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud)
  ) {
    mostrarEstado(
      "Este lugar no tiene coordenadas válidas.",
      true
    );

    return;
  }

  if (marcadorSeleccionado) {
    mapaAdmin.removeLayer(marcadorSeleccionado);
  }

  marcadorSeleccionado = L.marker(
    [latitud, longitud],
    {
      title: lugar.nombre || "Lugar"
    }
  ).addTo(mapaAdmin);

  marcadorSeleccionado
    .bindPopup(`
      <article class="map-popup">
        <h3>${escaparHtml(lugar.nombre || "Lugar")}</h3>

        <p>
          <strong>Categoría:</strong>
          ${escaparHtml(lugar.categoria || "Sin categoría")}
        </p>
      </article>
    `)
    .openPopup();

  mapaAdmin.setView([latitud, longitud], 18);

  mostrarDetalleLugar(lugar);

  document
    .getElementById("mapa-admin-lugares")
    .scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}

/* =========================================
   DETALLE DEL LUGAR
========================================= */

function mostrarDetalleLugar(lugar) {
  const detalle =
    document.getElementById("detalle-lugar");

  detalle.innerHTML = `
    <h3>${escaparHtml(lugar.nombre || "Lugar sin nombre")}</h3>

    <p>
      <strong>Categoría:</strong>
      ${escaparHtml(lugar.categoria || "Sin categoría")}
    </p>

    <p>
      <strong>Descripción:</strong>
      ${escaparHtml(lugar.descripcion || "Sin descripción")}
    </p>

    <p>
      <strong>Dirección:</strong>
      ${escaparHtml(lugar.direccion || "No indicada")}
    </p>

    <p>
      <strong>Autor:</strong>
      ${escaparHtml(lugar.autor || "No indicado")}
    </p>

    <p>
      <strong>Estado:</strong>
      ${escaparHtml(lugar.estado || "pendiente")}
    </p>

    <p>
      <strong>Latitud:</strong>
      ${escaparHtml(lugar.latitud)}
    </p>

    <p>
      <strong>Longitud:</strong>
      ${escaparHtml(lugar.longitud)}
    </p>
  `;
}

/* =========================================
   CAMBIAR ESTADO
========================================= */

async function cambiarEstado(id, nuevoEstado) {
  try {
    mostrarEstado(
      `Actualizando estado a ${nuevoEstado}...`
    );

    const { error } = await supabaseClient
      .from("lugares")
      .update({
        estado: nuevoEstado
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    const lugar = lugaresCargados.find(
      (item) => item.id === id
    );

    if (lugar) {
      lugar.estado = nuevoEstado;
    }

    renderizarLugares();

    mostrarEstado(
      `Lugar actualizado como ${nuevoEstado}.`
    );
  } catch (error) {
    console.error(
      "Error al cambiar estado:",
      error
    );

    mostrarEstado(
      `No fue posible actualizar el lugar: ${error.message}`,
      true
    );
  }
}

/* =========================================
   ELIMINAR LUGAR
========================================= */

async function eliminarLugar(lugar) {
  const confirmar = window.confirm(
    `¿Seguro que deseas eliminar "${lugar.nombre}"?`
  );

  if (!confirmar) {
    return;
  }

  try {
    mostrarEstado("Eliminando lugar...");

    const { error } = await supabaseClient
      .from("lugares")
      .delete()
      .eq("id", lugar.id);

    if (error) {
      throw error;
    }

    lugaresCargados = lugaresCargados.filter(
      (item) => item.id !== lugar.id
    );

    renderizarLugares();

    if (marcadorSeleccionado) {
      mapaAdmin.removeLayer(marcadorSeleccionado);
      marcadorSeleccionado = null;
    }

    document.getElementById(
      "detalle-lugar"
    ).innerHTML = `
      <p>Selecciona un lugar de la lista.</p>
    `;

    mostrarEstado(
      "Lugar eliminado correctamente."
    );
  } catch (error) {
    console.error("Error al eliminar:", error);

    mostrarEstado(
      `No fue posible eliminar el lugar: ${error.message}`,
      true
    );
  }
}

/* =========================================
   UTILIDADES
========================================= */

function mostrarEstado(mensaje, esError = false) {
  const estado =
    document.getElementById("estado-lugares");

  estado.textContent = mensaje;

  estado.className = esError
    ? "form-message error"
    : "form-message success";
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(fecha));
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}