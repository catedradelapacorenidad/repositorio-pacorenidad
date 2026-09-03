let map;
let selectedMarker;
let publishedMarkers;

const PACORA_CENTER = {
  lat: 5.527,
  lng: -75.459
};

document.addEventListener("DOMContentLoaded", iniciarMapa);

/* =========================================
   INICIAR MAPA
========================================= */

async function iniciarMapa() {
  try {
    if (typeof L === "undefined") {
      throw new Error("Leaflet no está cargado.");
    }

    map = L.map("map").setView(
      [PACORA_CENTER.lat, PACORA_CENTER.lng],
      15
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    ).addTo(map);

    publishedMarkers = L.layerGroup().addTo(map);

    configurarBusqueda();
    configurarSeleccionMapa();
    configurarUbicacion();
    configurarFormulario();

    setMapStatus("Selecciona un punto en el mapa.");

    const lugaresAprobados = await cargarLugaresAprobados();

const parametros = new URLSearchParams(window.location.search);
const lugarId = parametros.get("id");

if (lugarId && Array.isArray(lugaresAprobados)) {
  const lugarEncontrado = lugaresAprobados.find(
    lugar => String(lugar.id) === String(lugarId)
  );

  if (lugarEncontrado) {
    setTimeout(() => {

      focusPlace(
        Number(lugarEncontrado.latitud),
        Number(lugarEncontrado.longitud)
      );

      publishedMarkers.eachLayer((marcador) => {
        if (
          String(marcador.lugarId) ===
          String(lugarEncontrado.id)
        ) {
          marcador.openPopup();
        }
      });

    }, 300);
  }
}

setTimeout(() => {
  map.invalidateSize();
}, 200);
  } catch (error) {
    console.error("Error al iniciar el mapa:", error);

    setMapStatus(
      `No fue posible iniciar el mapa: ${error.message}`,
      true
    );
  }
}

/* =========================================
   BUSCADOR
========================================= */

function configurarBusqueda() {
  const buscador = document.getElementById("place-search");

  if (!buscador) {
    return;
  }

  buscador.addEventListener("keydown", async (evento) => {
    if (evento.key !== "Enter") {
      return;
    }

    evento.preventDefault();

    const consulta = buscador.value.trim();

    if (!consulta) {
      setMapStatus("Escribe el nombre de un lugar.", true);
      return;
    }

    await buscarLugar(consulta);
  });
}

async function buscarLugar(consulta) {
  try {
    setMapStatus("Buscando lugar...");

    const parametros = new URLSearchParams({
      q: `${consulta}, Pácora, Caldas, Colombia`,
      format: "json",
      limit: "1",
      countrycodes: "co",
      addressdetails: "1"
    });

    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?${parametros}`,
      {
        headers: {
          "Accept-Language": "es"
        }
      }
    );

    if (!respuesta.ok) {
      throw new Error("El buscador no respondió correctamente.");
    }

    const resultados = await respuesta.json();

    if (!resultados.length) {
      setMapStatus(
        "No se encontró el lugar. Intenta escribir otro nombre.",
        true
      );
      return;
    }

    const resultado = resultados[0];

    const posicion = {
      lat: Number(resultado.lat),
      lng: Number(resultado.lon)
    };

    map.setView([posicion.lat, posicion.lng], 17);

    setSelectedCoordinates(posicion);
    mostrarMarcadorSeleccionado(posicion);

    const nombre = document.getElementById("place-name");
    const direccion = document.getElementById("place-address");

    if (nombre && !nombre.value.trim()) {
      nombre.value =
        resultado.name ||
        resultado.display_name.split(",")[0] ||
        consulta;
    }

    if (direccion) {
      direccion.value = resultado.display_name || "";
    }

    setMapStatus(
      "Lugar encontrado. Completa la información."
    );
  } catch (error) {
    console.error("Error al buscar:", error);

    setMapStatus(
      `No fue posible realizar la búsqueda: ${error.message}`,
      true
    );
  }
}

/* =========================================
   SELECCIONAR EN EL MAPA
========================================= */

function configurarSeleccionMapa() {
  map.on("click", (evento) => {
    const posicion = {
      lat: evento.latlng.lat,
      lng: evento.latlng.lng
    };

    setSelectedCoordinates(posicion);
    mostrarMarcadorSeleccionado(posicion);

    setMapStatus("Ubicación seleccionada en el mapa.");
  });
}

function mostrarMarcadorSeleccionado(posicion) {
  if (selectedMarker) {
    map.removeLayer(selectedMarker);
  }

  selectedMarker = L.marker(
    [posicion.lat, posicion.lng],
    {
      draggable: true,
      title: "Ubicación seleccionada"
    }
  ).addTo(map);

  selectedMarker
    .bindPopup("Ubicación seleccionada")
    .openPopup();

  selectedMarker.on("dragend", (evento) => {
    const nuevaPosicion = evento.target.getLatLng();

    setSelectedCoordinates({
      lat: nuevaPosicion.lat,
      lng: nuevaPosicion.lng
    });

    setMapStatus("Ubicación ajustada correctamente.");
  });
}

/* =========================================
   UBICACIÓN DEL USUARIO
========================================= */

function configurarUbicacion() {
  const boton = document.getElementById("locate-button");

  if (!boton) {
    return;
  }

  boton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setMapStatus(
        "Tu navegador no permite obtener la ubicación.",
        true
      );
      return;
    }

    setMapStatus("Buscando tu ubicación...");

    navigator.geolocation.getCurrentPosition(
      (resultado) => {
        const posicion = {
          lat: resultado.coords.latitude,
          lng: resultado.coords.longitude
        };

        map.setView([posicion.lat, posicion.lng], 17);

        setSelectedCoordinates(posicion);
        mostrarMarcadorSeleccionado(posicion);

        setMapStatus("Ubicación actual encontrada.");
      },
      () => {
        setMapStatus(
          "No fue posible obtener tu ubicación. Revisa los permisos del navegador.",
          true
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/* =========================================
   FORMULARIO
========================================= */

function configurarFormulario() {
  const formulario = document.getElementById("place-form");

  if (!formulario) {
    return;
  }

  formulario.addEventListener("submit", guardarLugar);
}

/* =========================================
   GUARDAR EN SUPABASE
========================================= */

async function guardarLugar(evento) {
  evento.preventDefault();

  const formulario = evento.currentTarget;

  const boton = formulario.querySelector(
    'button[type="submit"]'
  );

  const campoLatitud =
    document.getElementById("place-latitude");

  const campoLongitud =
    document.getElementById("place-longitude");

  const latitud = Number(campoLatitud.value);
  const longitud = Number(campoLongitud.value);

  if (
    campoLatitud.value === "" ||
    campoLongitud.value === "" ||
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud)
  ) {
    setPlaceMessage(
      "Primero busca o selecciona una ubicación en el mapa.",
      true
    );
    return;
  }

  const datosLugar = {
    nombre: document
      .getElementById("place-name")
      .value
      .trim(),

    categoria: document
      .getElementById("place-category")
      .value
      .trim(),

    descripcion: document
      .getElementById("place-description")
      .value
      .trim(),

    direccion:
      document
        .getElementById("place-address")
        .value
        .trim() || null,

    autor:
      document
        .getElementById("place-author")
        .value
        .trim() || null,

    latitud,
    longitud,
    estado: "pendiente"
  };

  try {
    boton.disabled = true;
    boton.textContent = "Guardando...";

    setPlaceMessage("Guardando lugar...");

    const { error } = await supabaseClient
      .from("lugares")
      .insert(datosLugar);

    if (error) {
      throw error;
    }

    formulario.reset();

    if (selectedMarker) {
      map.removeLayer(selectedMarker);
      selectedMarker = null;
    }

    setPlaceMessage(
      "Lugar enviado correctamente. Quedó pendiente de aprobación."
    );

    setMapStatus(
      "Puedes seleccionar una nueva ubicación."
    );
  } catch (error) {
    console.error("Error al guardar:", error);

    setPlaceMessage(
      `No fue posible guardar: ${error.message}`,
      true
    );
  } finally {
    boton.disabled = false;
    boton.textContent = "Agregar indicador";
  }
}

/* =========================================
   CARGAR LUGARES APROBADOS
========================================= */

async function cargarLugaresAprobados() {
  const lista = document.getElementById("places-list");

  if (lista) {
    lista.innerHTML =
      "<p>Cargando lugares aprobados...</p>";
  }

  try {
    const { data, error } = await supabaseClient
      .from("lugares")
      .select("*")
      .eq("estado", "aprobado")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    const lugares = data || [];

    publishedMarkers.clearLayers();

    lugares.forEach(crearMarcadorPublicado);

renderPlacesList(lugares);

return lugares;
  } catch (error) {
    console.error("Error al cargar lugares:", error);

    if (lista) {
      lista.innerHTML = `
        <p class="empty-places">
          No fue posible cargar los lugares:
          ${escapeHtml(error.message)}
        </p>
      `;
    }
  }
}

/* =========================================
   MARCADORES APROBADOS
========================================= */

function crearMarcadorPublicado(lugar) {
  const latitud = Number(lugar.latitud);
  const longitud = Number(lugar.longitud);

  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud)
  ) {
    return;
  }

  const direccion = lugar.direccion
    ? `
      <p>
        <strong>Referencia:</strong>
        ${escapeHtml(lugar.direccion)}
      </p>
    `
    : "";

  const autor = lugar.autor
    ? `
      <p>
        <strong>Aporte:</strong>
        ${escapeHtml(lugar.autor)}
      </p>
    `
    : "";

  const marcador = L.marker([latitud, longitud], {
    title: lugar.nombre
  })
    .bindPopup(`
      <article class="map-popup">
        <h3>${escapeHtml(lugar.nombre)}</h3>

        <p>
          <strong>Categoría:</strong>
          ${escapeHtml(lugar.categoria)}
        </p>

        <p>${escapeHtml(lugar.descripcion)}</p>

        ${direccion}
        ${autor}
      </article>
    `)
    .addTo(publishedMarkers);
    marcador.lugarId = lugar.id;
}  

/* =========================================
   LISTA
========================================= */

function renderPlacesList(lugares) {
  const lista = document.getElementById("places-list");

  if (!lista) {
    return;
  }

  if (lugares.length === 0) {
    lista.innerHTML = `
      <p class="empty-places">
        Todavía no hay lugares aprobados.
      </p>
    `;
    return;
  }

  lista.innerHTML = "";

  lugares.forEach((lugar) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "place-card";

    const categoria = document.createElement("span");
    categoria.className = "badge";
    categoria.textContent = lugar.categoria;

    const nombre = document.createElement("h3");
    nombre.textContent = lugar.nombre;

    const descripcion = document.createElement("p");
    descripcion.textContent = lugar.descripcion;

    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = "Ver en el mapa";

    boton.addEventListener("click", () => {
      focusPlace(
        Number(lugar.latitud),
        Number(lugar.longitud)
      );
    });

    tarjeta.appendChild(categoria);
    tarjeta.appendChild(nombre);
    tarjeta.appendChild(descripcion);
    tarjeta.appendChild(boton);

    lista.appendChild(tarjeta);
  });
}

/* =========================================
   ENFOCAR UN LUGAR
========================================= */

function focusPlace(latitud, longitud) {
  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud)
  ) {
    return;
  }

  map.setView([latitud, longitud], 18);

  document.getElementById("map").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

/* =========================================
   UTILIDADES
========================================= */

function setSelectedCoordinates(posicion) {
  document.getElementById("place-latitude").value =
    Number(posicion.lat).toFixed(7);

  document.getElementById("place-longitude").value =
    Number(posicion.lng).toFixed(7);
}

function setMapStatus(mensaje, esError = false) {
  const estado = document.getElementById("map-status");

  if (!estado) {
    return;
  }

  estado.textContent = mensaje;

  estado.className = esError
    ? "form-message error"
    : "form-message success";
}

function setPlaceMessage(mensaje, esError = false) {
  const estado = document.getElementById("place-message");

  if (!estado) {
    return;
  }

  estado.textContent = mensaje;

  estado.className = esError
    ? "form-message error"
    : "form-message success";
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}