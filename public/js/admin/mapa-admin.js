let map;
let selectedMarker;
let publishedMarkers;

const PACORA_CENTER = {
    lat: 5.527,
    lng: -75.459
};

/* =========================================
   INICIAR MAPA LEAFLET
========================================= */

document.addEventListener("DOMContentLoaded", iniciarMapa);

async function iniciarMapa() {
    try {
        if (typeof L === "undefined") {
            throw new Error(
                "Leaflet no está cargado. Revisa los enlaces CSS y JS de Leaflet."
            );
        }

        const elementoMapa = document.getElementById("map");

        if (!elementoMapa) {
            throw new Error(
                'No se encontró el elemento con id="map".'
            );
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

        configurarSeleccionMapa();
        configurarUbicacion();
        configurarFormulario();
        configurarBusqueda();

        establecerEstadoMapa(
            "Selecciona un punto en el mapa."
        );

        await cargarLugaresAprobados();

        setTimeout(function () {
            map.invalidateSize();
        }, 200);
    } catch (error) {
        console.error(
            "Error al iniciar el mapa:",
            error
        );

        establecerEstadoMapa(
            `No fue posible iniciar el mapa: ${error.message}`,
            true
        );
    }
}

/* =========================================
   BUSCADOR DE OPENSTREETMAP
========================================= */

function configurarBusqueda() {
    const buscador =
        document.getElementById("place-search");

    if (!buscador) {
        return;
    }

    buscador.addEventListener(
        "keydown",
        async function (evento) {
            if (evento.key !== "Enter") {
                return;
            }

            evento.preventDefault();

            const consulta = buscador.value.trim();

            if (!consulta) {
                establecerEstadoMapa(
                    "Escribe el nombre de un lugar.",
                    true
                );

                return;
            }

            await buscarLugar(consulta);
        }
    );
}

async function buscarLugar(consulta) {
    try {
        establecerEstadoMapa(
            "Buscando lugar..."
        );

        const parametros = new URLSearchParams({
            q: `${consulta}, Pácora, Caldas, Colombia`,
            format: "json",
            limit: "1",
            countrycodes: "co",
            addressdetails: "1"
        });

        const respuesta = await fetch(
            `https://nominatim.openstreetmap.org/search?${parametros.toString()}`,
            {
                headers: {
                    "Accept-Language": "es"
                }
            }
        );

        if (!respuesta.ok) {
            throw new Error(
                "El buscador no respondió correctamente."
            );
        }

        const resultados = await respuesta.json();

        if (!resultados.length) {
            establecerEstadoMapa(
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

        map.setView(
            [posicion.lat, posicion.lng],
            17
        );

        establecerCoordenadas(posicion);
        mostrarMarcadorSeleccionado(posicion);

        const campoNombre =
            document.getElementById("place-name");

        const campoDireccion =
            document.getElementById("place-address");

        if (campoNombre && !campoNombre.value.trim()) {
            campoNombre.value =
                resultado.name ||
                resultado.display_name.split(",")[0] ||
                consulta;
        }

        if (campoDireccion) {
            campoDireccion.value =
                resultado.display_name || "";
        }

        establecerEstadoMapa(
            "Lugar encontrado. Completa la información."
        );
    } catch (error) {
        console.error(
            "Error al buscar el lugar:",
            error
        );

        establecerEstadoMapa(
            `No fue posible realizar la búsqueda: ${error.message}`,
            true
        );
    }
}

/* =========================================
   SELECCIONAR PUNTO EN EL MAPA
========================================= */

function configurarSeleccionMapa() {
    map.on("click", function (evento) {
        const posicion = {
            lat: evento.latlng.lat,
            lng: evento.latlng.lng
        };

        establecerCoordenadas(posicion);
        mostrarMarcadorSeleccionado(posicion);

        establecerEstadoMapa(
            "Ubicación seleccionada en el mapa."
        );
    });
}

/* =========================================
   UBICACIÓN ACTUAL
========================================= */

function configurarUbicacion() {
    const botonUbicacion =
        document.getElementById("locate-button");

    if (!botonUbicacion) {
        return;
    }

    botonUbicacion.addEventListener(
        "click",
        function () {
            if (!navigator.geolocation) {
                establecerEstadoMapa(
                    "Tu navegador no permite obtener la ubicación.",
                    true
                );

                return;
            }

            establecerEstadoMapa(
                "Buscando tu ubicación..."
            );

            navigator.geolocation.getCurrentPosition(
                function (posicionUsuario) {
                    const posicion = {
                        lat: posicionUsuario.coords.latitude,
                        lng: posicionUsuario.coords.longitude
                    };

                    map.setView(
                        [posicion.lat, posicion.lng],
                        17
                    );

                    establecerCoordenadas(posicion);
                    mostrarMarcadorSeleccionado(posicion);

                    establecerEstadoMapa(
                        "Ubicación actual encontrada."
                    );
                },
                function (error) {
                    console.error(
                        "Error de geolocalización:",
                        error
                    );

                    establecerEstadoMapa(
                        "No fue posible obtener tu ubicación. Verifica los permisos del navegador.",
                        true
                    );
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }
    );
}

/* =========================================
   MARCADOR SELECCIONADO
========================================= */

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

    selectedMarker.on(
        "dragend",
        function (evento) {
            const nuevaPosicion =
                evento.target.getLatLng();

            establecerCoordenadas({
                lat: nuevaPosicion.lat,
                lng: nuevaPosicion.lng
            });

            establecerEstadoMapa(
                "Ubicación ajustada correctamente."
            );
        }
    );
}

/* =========================================
   FORMULARIO
========================================= */

function configurarFormulario() {
    const formulario =
        document.getElementById("place-form");

    if (!formulario) {
        return;
    }

    formulario.addEventListener(
        "submit",
        guardarLugar
    );
}

/* =========================================
   GUARDAR EN SUPABASE
========================================= */

async function guardarLugar(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;

    const botonGuardar =
        formulario.querySelector(
            'button[type="submit"]'
        );

    const campoLatitud =
        document.getElementById("place-latitude");

    const campoLongitud =
        document.getElementById("place-longitude");

    const latitud = Number(campoLatitud.value);
    const longitud = Number(campoLongitud.value);

    if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        campoLatitud.value === "" ||
        campoLongitud.value === ""
    ) {
        establecerMensajeFormulario(
            "Primero busca o selecciona una ubicación.",
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
        botonGuardar.disabled = true;
        botonGuardar.textContent = "Guardando...";

        establecerMensajeFormulario(
            "Guardando lugar..."
        );

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

        establecerMensajeFormulario(
            "Lugar guardado correctamente. Quedó pendiente de aprobación."
        );

        establecerEstadoMapa(
            "Puedes seleccionar una nueva ubicación."
        );
    } catch (error) {
        console.error(
            "Error al guardar el lugar:",
            error
        );

        establecerMensajeFormulario(
            `No fue posible guardar: ${error.message}`,
            true
        );
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent =
            "Agregar indicador";
    }
}

/* =========================================
   CARGAR LUGARES APROBADOS
========================================= */

async function cargarLugaresAprobados() {
    const lista =
        document.getElementById("places-list");

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

        lugares.forEach(function (lugar) {
            crearMarcadorPublicado(lugar);
        });

        renderizarLista(lugares);
    } catch (error) {
        console.error(
            "Error al cargar lugares:",
            error
        );

        if (lista) {
            lista.innerHTML = `
                <p class="empty-places">
                    No fue posible cargar los lugares:
                    ${escaparHtml(error.message)}
                </p>
            `;
        }
    }
}

/* =========================================
   MARCADORES PUBLICADOS
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

    const autor = lugar.autor
        ? `
            <p>
                <strong>Aporte:</strong>
                ${escaparHtml(lugar.autor)}
            </p>
        `
        : "";

    const direccion = lugar.direccion
        ? `
            <p>
                <strong>Referencia:</strong>
                ${escaparHtml(lugar.direccion)}
            </p>
        `
        : "";

    const marcador = L.marker(
        [latitud, longitud],
        {
            title: lugar.nombre
        }
    );

    marcador.bindPopup(`
        <article class="map-popup">
            <h3>${escaparHtml(lugar.nombre)}</h3>

            <p>
                <strong>Categoría:</strong>
                ${escaparHtml(lugar.categoria)}
            </p>

            <p>
                ${escaparHtml(lugar.descripcion)}
            </p>

            ${direccion}
            ${autor}
        </article>
    `);

    marcador.addTo(publishedMarkers);
}

/* =========================================
   LISTA DE LUGARES
========================================= */

function renderizarLista(lugares) {
    const lista =
        document.getElementById("places-list");

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

    lugares.forEach(function (lugar) {
        const tarjeta =
            document.createElement("article");

        tarjeta.className = "place-card";

        const categoria =
            document.createElement("span");

        categoria.className = "badge";
        categoria.textContent =
            lugar.categoria;

        const nombre =
            document.createElement("h3");

        nombre.textContent =
            lugar.nombre;

        const descripcion =
            document.createElement("p");

        descripcion.textContent =
            lugar.descripcion;

        const boton =
            document.createElement("button");

        boton.type = "button";
        boton.textContent =
            "Ver en el mapa";

        boton.addEventListener(
            "click",
            function () {
                enfocarLugar(
                    Number(lugar.latitud),
                    Number(lugar.longitud)
                );
            }
        );

        tarjeta.appendChild(categoria);
        tarjeta.appendChild(nombre);
        tarjeta.appendChild(descripcion);
        tarjeta.appendChild(boton);

        lista.appendChild(tarjeta);
    });
}

/* =========================================
   ENFOCAR LUGAR
========================================= */

function enfocarLugar(latitud, longitud) {
    if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud)
    ) {
        return;
    }

    map.setView(
        [latitud, longitud],
        18
    );

    document
        .getElementById("map")
        .scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
}

/* =========================================
   UTILIDADES
========================================= */

function establecerCoordenadas(posicion) {
    document.getElementById(
        "place-latitude"
    ).value = Number(posicion.lat).toFixed(7);

    document.getElementById(
        "place-longitude"
    ).value = Number(posicion.lng).toFixed(7);
}

function establecerEstadoMapa(
    mensaje,
    esError = false
) {
    const estado =
        document.getElementById("map-status");

    if (!estado) {
        return;
    }

    estado.textContent = mensaje;

    estado.className = esError
        ? "form-message error"
        : "form-message success";
}

function establecerMensajeFormulario(
    mensaje,
    esError = false
) {
    const estado =
        document.getElementById("place-message");

    if (!estado) {
        return;
    }

    estado.textContent = mensaje;

    estado.className = esError
        ? "form-message error"
        : "form-message success";
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}