document.addEventListener("DOMContentLoaded", async () => {
  const contenedores = {
    arquitectonico: document.querySelector(
      "#arquitectonico .articulos-grid"
    ),
    "paisaje-cultural": document.querySelector(
      "#paisaje-cultural .articulos-grid"
    ),
    natural: document.querySelector(
      "#natural .articulos-grid"
    ),
    religioso: document.querySelector(
      "#religioso .articulos-grid"
    )
  };

  function escaparHTML(texto = "") {
    return String(texto)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function crearTarjeta(articulo) {
    const autor =
      articulo.mostrar_autor && articulo.autor_nombre
        ? `Aporte realizado por: ${articulo.autor_nombre}`
        : "Aporte comunitario";

    const imagen = articulo.imagen_url
      ? `
        <img
          src="${escaparHTML(articulo.imagen_url)}"
          alt="${escaparHTML(articulo.titulo)}"
          loading="lazy"
        >
      `
      : `
        <div class="articulo-sin-imagen">
          Sin fotografía
        </div>
      `;

    return `
      <article class="articulo-publico">

        <div class="articulo-imagen">
          ${imagen}
        </div>

        <div class="articulo-contenido">

          <h3>
            ${escaparHTML(articulo.titulo)}
          </h3>

          <p class="articulo-resumen">
            ${escaparHTML(articulo.descripcion_corta)}
          </p>

          ${
            articulo.ubicacion
              ? `
                <p class="articulo-dato">
                  <strong>Ubicación:</strong>
                  ${escaparHTML(articulo.ubicacion)}
                </p>
              `
              : ""
          }

          ${
            articulo.estado_conservacion
              ? `
                <p class="articulo-dato">
                  <strong>Estado de conservación:</strong>
                  ${escaparHTML(articulo.estado_conservacion)}
                </p>
              `
              : ""
          }

          <details class="articulo-detalle">
            <summary>Leer más</summary>

            <div class="articulo-texto">
              ${escaparHTML(articulo.contenido)}
            </div>

            ${
              articulo.fecha_referencia
                ? `
                  <p>
                    <strong>Fecha o periodo:</strong>
                    ${escaparHTML(articulo.fecha_referencia)}
                  </p>
                `
                : ""
            }

            ${
              articulo.fuente
                ? `
                  <p>
                    <strong>Fuente:</strong>
                    ${escaparHTML(articulo.fuente)}
                  </p>
                `
                : ""
            }
          </details>

          <p class="autor-aporte">
            ${escaparHTML(autor)}
          </p>

        </div>

      </article>
    `;
  }

  function mostrarMensaje(contenedor, mensaje) {
    if (!contenedor) {
      return;
    }

    contenedor.innerHTML = `
      <div class="mensaje-articulos">
        ${escaparHTML(mensaje)}
      </div>
    `;
  }

  Object.values(contenedores).forEach((contenedor) => {
    mostrarMensaje(contenedor, "Cargando contenidos...");
  });

  try {
    const { data: articulos, error } = await supabaseClient
      .from("articulos")
      .select(`
        id,
        titulo,
        categoria,
        descripcion_corta,
        contenido,
        ubicacion,
        fecha_referencia,
        estado_conservacion,
        fuente,
        imagen_url,
        autor_nombre,
        mostrar_autor,
        published_at
      `)
      .eq("tipo", "patrimonio")
      .eq("estado", "publicado")
      .order("published_at", { ascending: false });

    if (error) {
      throw error;
    }

    Object.entries(contenedores).forEach(
      ([categoria, contenedor]) => {
        if (!contenedor) {
          return;
        }

        const articulosCategoria = articulos.filter(
          (articulo) => articulo.categoria === categoria
        );

        if (articulosCategoria.length === 0) {
          mostrarMensaje(
            contenedor,
            "Todavía no hay aportes publicados en esta categoría."
          );
          return;
        }

        contenedor.innerHTML = articulosCategoria
          .map(crearTarjeta)
          .join("");
      }
    );

  } catch (error) {
    console.error(
      "Error al cargar el patrimonio:",
      error
    );

    Object.values(contenedores).forEach((contenedor) => {
      mostrarMensaje(
        contenedor,
        "No fue posible cargar los contenidos."
      );
    });
  }
});