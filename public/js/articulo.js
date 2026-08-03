document.addEventListener("DOMContentLoaded", async () => {
  const estadoCarga = document.getElementById("estado-carga");
  const articuloFicha = document.getElementById("articulo-ficha");

  const articuloImagen = document.getElementById("articulo-imagen");
  const articuloTipo = document.getElementById("articulo-tipo");
  const articuloCategoria = document.getElementById("articulo-categoria");
  const articuloTitulo = document.getElementById("articulo-titulo");
  const articuloResumen = document.getElementById("articulo-resumen");
  const articuloContenido = document.getElementById("articulo-contenido");
  const articuloFuente = document.getElementById("articulo-fuente");
  const articuloAutor = document.getElementById("articulo-autor");

  const datoUbicacion = document.getElementById("dato-ubicacion");
  const datoFecha = document.getElementById("dato-fecha");
  const datoConservacion = document.getElementById("dato-conservacion");
  const datoPublicacion = document.getElementById("dato-publicacion");

  const volverSeccion = document.getElementById("volver-seccion");

  function formatearTexto(texto = "") {
    return String(texto).trim();
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

  function nombreCategoria(slug) {
    const categorias = {
      arquitectonico: "Patrimonio arquitectónico",
      "paisaje-cultural": "Paisaje Cultural Cafetero",
      natural: "Patrimonio natural",
      religioso: "Patrimonio religioso"
    };

    return categorias[slug] || slug;
  }

  function nombreTipo(tipo) {
    const tipos = {
      patrimonio: "Patrimonio",
      historia: "Historia",
      "tradicion-oral": "Tradición oral",
      turismo: "Turismo",
      cultura: "Cultura"
    };

    return tipos[tipo] || tipo;
  }

  function obtenerEnlaceRegreso(tipo, categoria) {
    if (tipo === "patrimonio") {
      return `patrimonio.html#${categoria}`;
    }

    if (tipo === "historia") {
      return "historia.html";
    }

    if (tipo === "tradicion-oral") {
      return "tradicion-oral.html";
    }

    return "index.html";
  }

  function mostrarError(mensaje) {
    estadoCarga.textContent = mensaje;
    estadoCarga.style.color = "#a32020";
    articuloFicha.hidden = true;
  }

  const parametros = new URLSearchParams(window.location.search);
  const articuloId = parametros.get("id");

  if (!articuloId) {
    mostrarError("No se indicó qué artículo deseas consultar.");
    return;
  }

  try {
    const { data: articulo, error } = await supabaseClient
      .from("articulos")
      .select(`
        id,
        titulo,
        tipo,
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
      .eq("id", articuloId)
      .eq("estado", "publicado")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!articulo) {
      mostrarError(
        "El artículo no existe, no está publicado o no se encuentra disponible."
      );
      return;
    }

    document.title =
      `${articulo.titulo} | Cátedra de la Pacoreñidad`;

    articuloTitulo.textContent = formatearTexto(articulo.titulo);
    articuloTipo.textContent = nombreTipo(articulo.tipo);
    articuloCategoria.textContent = nombreCategoria(articulo.categoria);
    articuloResumen.textContent =
      formatearTexto(articulo.descripcion_corta);
    articuloContenido.textContent =
      formatearTexto(articulo.contenido);

    if (articulo.imagen_url) {
      articuloImagen.src = articulo.imagen_url;
      articuloImagen.alt = articulo.titulo;
      articuloImagen.style.display = "block";
    }

    if (articulo.ubicacion) {
      datoUbicacion.innerHTML =
        `<strong>Ubicación:</strong> ${formatearTexto(articulo.ubicacion)}`;
    } else {
      datoUbicacion.remove();
    }

    if (articulo.fecha_referencia) {
      datoFecha.innerHTML =
        `<strong>Fecha o periodo:</strong> ${formatearTexto(
          articulo.fecha_referencia
        )}`;
    } else {
      datoFecha.remove();
    }

    if (articulo.estado_conservacion) {
      datoConservacion.innerHTML =
        `<strong>Estado de conservación:</strong> ${formatearTexto(
          articulo.estado_conservacion
        )}`;
    } else {
      datoConservacion.remove();
    }

    if (articulo.published_at) {
      datoPublicacion.innerHTML =
        `<strong>Publicado:</strong> ${formatearFecha(
          articulo.published_at
        )}`;
    } else {
      datoPublicacion.remove();
    }

    if (articulo.fuente) {
      articuloFuente.hidden = false;
      articuloFuente.innerHTML =
        `<strong>Fuente:</strong> ${formatearTexto(articulo.fuente)}`;
    }

    articuloAutor.textContent =
      articulo.mostrar_autor && articulo.autor_nombre
        ? `Aporte realizado por: ${articulo.autor_nombre}`
        : "Aporte comunitario";

    volverSeccion.href = obtenerEnlaceRegreso(
      articulo.tipo,
      articulo.categoria
    );

    estadoCarga.style.display = "none";
    articuloFicha.hidden = false;

  } catch (error) {
    console.error("Error al cargar el artículo:", error);

    mostrarError(
      "No fue posible cargar el artículo en este momento."
    );
  }
});