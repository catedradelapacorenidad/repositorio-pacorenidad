document.addEventListener("DOMContentLoaded", async () => {
  const listaPublicaciones =
    document.getElementById("lista-publicaciones");

  const estadoPublicaciones =
    document.getElementById("estado-publicaciones");

  function escaparHTML(texto = "") {
    return String(texto)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatearFecha(fecha) {
    if (!fecha) {
      return "";
    }

    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(new Date(fecha));
  }

  function nombreCategoria(slug = "") {
    const categorias = {
      mitos: "Mitos",
      leyendas: "Leyendas",
      "cuentos-y-relatos": "Cuentos y relatos",
      "refranes-y-dichos": "Refranes y dichos",
      "coplas-y-canciones-tradicionales":
        "Coplas y canciones tradicionales",
      "creencias-populares": "Creencias populares",
      "anecdotas-y-testimonios":
        "Anécdotas y testimonios",
      "historias-de-vida": "Historias de vida"
    };

    return categorias[slug] || slug || "Tradición oral";
  }

  function mostrarEstado(mensaje, esError = false) {
    estadoPublicaciones.style.display = "block";
    estadoPublicaciones.textContent = mensaje;

    estadoPublicaciones.style.color =
      esError ? "#a32020" : "#666";
  }

  try {
    const {
      data: articulos,
      error
    } = await supabaseClient
      .from("articulos")
      .select(`
        id,
        titulo,
        categoria,
        descripcion_corta,
        imagen_url,
        autor_nombre,
        mostrar_autor,
        published_at
      `)
      .eq("tipo", "tradicion-oral")
      .eq("estado", "publicado")
      .order("published_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    if (!articulos || articulos.length === 0) {
      mostrarEstado(
        "Todavía no hay artículos de tradición oral publicados."
      );

      return;
    }

    estadoPublicaciones.style.display = "none";
    listaPublicaciones.innerHTML = "";

    articulos.forEach((articulo) => {
      const tarjeta = document.createElement("article");

      tarjeta.className = "publicacion-card";

      const imagen = articulo.imagen_url
        ? `
          <img
            src="${escaparHTML(articulo.imagen_url)}"
            alt="${escaparHTML(articulo.titulo)}"
            class="publicacion-imagen"
            loading="lazy"
          >
        `
        : `
          <div class="publicacion-sin-imagen">
            📖
          </div>
        `;

      const autor =
        articulo.mostrar_autor && articulo.autor_nombre
          ? `Aporte de ${escaparHTML(
              articulo.autor_nombre
            )}`
          : "Aporte comunitario";

      tarjeta.innerHTML = `
        ${imagen}

        <div class="publicacion-contenido">

          <span class="publicacion-categoria">
            ${escaparHTML(
              nombreCategoria(articulo.categoria)
            )}
          </span>

          <h3>
            ${escaparHTML(articulo.titulo)}
          </h3>

          <p>
            ${escaparHTML(
              articulo.descripcion_corta ||
              "Consulta este aporte de tradición oral."
            )}
          </p>

          <div class="publicacion-datos">
            ${autor}
            ${
              articulo.published_at
                ? ` · ${escaparHTML(
                    formatearFecha(
                      articulo.published_at
                    )
                  )}`
                : ""
            }
          </div>

          <a
            href="articulo.html?id=${encodeURIComponent(
              articulo.id
            )}"
            class="publicacion-enlace"
          >
            Leer artículo
          </a>

        </div>
      `;

      listaPublicaciones.appendChild(tarjeta);
    });

  } catch (error) {
    console.error(
      "Error cargando tradición oral:",
      error
    );

    mostrarEstado(
      "No fue posible cargar las publicaciones en este momento.",
      true
    );
  }
});