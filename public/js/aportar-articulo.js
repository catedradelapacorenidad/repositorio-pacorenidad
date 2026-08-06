document.addEventListener("DOMContentLoaded", async () => {
  const usuarioActivo = document.getElementById("usuario-activo");
  const formAporte = document.getElementById("form-aporte");
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const autorNombreInput = document.getElementById("autor-nombre");
  const mostrarAutorInput = document.getElementById("mostrar-autor");
  const imagenInput = document.getElementById("imagen");
  const vistaImagen = document.getElementById("vista-imagen");
  const imagenPrevia = document.getElementById("imagen-previa");
  const botonEnviar = document.getElementById("enviar-aporte");
  const mensaje = document.getElementById("mensaje");

  let usuarioActual = null;
  let perfilActual = null;

  function mostrarMensaje(texto, tipo = "normal") {
    mensaje.textContent = texto;

    if (tipo === "error") {
      mensaje.style.color = "#b52b2b";
    } else if (tipo === "exito") {
      mensaje.style.color = "#235437";
    } else {
      mensaje.style.color = "#555";
    }
  }

  function limpiarNombreArchivo(nombre) {
    return nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]/g, "-")
      .replace(/-+/g, "-");
  }

  async function verificarSesion() {
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session) {
      window.location.href = "login.html";
      return false;
    }

    usuarioActual = session.user;

    usuarioActivo.textContent =
      `Sesión iniciada como: ${usuarioActual.email}`;

    return true;
  }

  async function cargarPerfil() {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("nombre, correo, institucion, rol")
      .eq("id", usuarioActual.id)
      .maybeSingle();

    if (error) {
      console.error("Error al cargar el perfil:", error);
      return;
    }

    perfilActual = data;

    if (perfilActual?.nombre) {
      autorNombreInput.value = perfilActual.nombre;
    }
  }function crearSlug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function obtenerCategoriasSugeridas(nombreSeccion) {
  const seccion = nombreSeccion
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (seccion.includes("tradicion oral")) {
    return [
      "Mitos",
      "Leyendas",
      "Cuentos y relatos",
      "Refranes y dichos",
      "Coplas y canciones tradicionales",
      "Creencias populares",
      "Anécdotas y testimonios",
      "Historias de vida"
    ];
  }

  return [];
}

async function cargarCategorias(tipo) {
  categoriaSelect.innerHTML =
    '<option value="">Cargando categorías...</option>';

  categoriaSelect.disabled = true;

  if (!tipo) {
    categoriaSelect.innerHTML =
      '<option value="">Primero selecciona una sección</option>';

    return;
  }

  const opcionSeleccionada =
    tipoSelect.options[tipoSelect.selectedIndex];

  const nombreSeccion =
    opcionSeleccionada?.textContent?.trim() || tipo;

  try {
    const { data, error } = await supabaseClient
      .from("categorias")
      .select("nombre, slug")
      .eq("tipo", tipo)
      .eq("activa", true)
      .order("orden", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    categoriaSelect.innerHTML =
      '<option value="">Selecciona una categoría</option>';

    if (data && data.length > 0) {
      data.forEach((categoria) => {
        const opcion = document.createElement("option");

        opcion.value = categoria.slug;
        opcion.textContent = categoria.nombre;

        categoriaSelect.appendChild(opcion);
      });

      categoriaSelect.disabled = false;
      mostrarMensaje("");

      return;
    }

    const sugerencias =
      obtenerCategoriasSugeridas(nombreSeccion);

    if (sugerencias.length > 0) {
      sugerencias.forEach((nombreCategoria) => {
        const opcion = document.createElement("option");

        opcion.value = crearSlug(nombreCategoria);
        opcion.textContent = nombreCategoria;

        categoriaSelect.appendChild(opcion);
      });

      categoriaSelect.disabled = false;

      mostrarMensaje(
        `Selecciona el tipo de aporte relacionado con ${nombreSeccion}.`
      );

      return;
    }

    const opcionGeneral =
      document.createElement("option");

    opcionGeneral.value = crearSlug(nombreSeccion);

    opcionGeneral.textContent =
      `${nombreSeccion} — categoría general`;

    categoriaSelect.appendChild(opcionGeneral);

    categoriaSelect.value =
      opcionGeneral.value;

    categoriaSelect.disabled = false;

    mostrarMensaje(
      "Esta sección todavía no tiene subcategorías. " +
      "El aporte se guardará en la categoría general."
    );

  } catch (error) {
    console.error(
      "Error al cargar categorías:",
      error
    );

    categoriaSelect.innerHTML =
      '<option value="">No fue posible cargar las categorías</option>';

    mostrarMensaje(
      "No fue posible cargar las categorías.",
      "error"
    );
  }
}

tipoSelect.addEventListener("change", () => {
  
    cargarCategorias(tipoSelect.value);
  });

  imagenInput.addEventListener("change", () => {
    const archivo = imagenInput.files[0];

    vistaImagen.style.display = "none";
    imagenPrevia.src = "";

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      mostrarMensaje(
        "La imagen debe estar en formato JPG, PNG o WEBP.",
        "error"
      );

      imagenInput.value = "";
      return;
    }

    const limiteBytes = 5 * 1024 * 1024;

    if (archivo.size > limiteBytes) {
      mostrarMensaje(
        "La imagen supera el tamaño máximo permitido de 5 MB.",
        "error"
      );

      imagenInput.value = "";
      return;
    }

    imagenPrevia.src = URL.createObjectURL(archivo);
    vistaImagen.style.display = "block";

    mostrarMensaje("");
  });

  async function subirImagen(archivo) {
    if (!archivo) {
      return {
        url: null,
        path: null
      };
    }

    const nombreSeguro = limpiarNombreArchivo(archivo.name);

    const rutaArchivo =
      `${usuarioActual.id}/${Date.now()}-${nombreSeguro}`;

    const { error: errorSubida } = await supabaseClient.storage
      .from("articulos")
      .upload(rutaArchivo, archivo, {
        cacheControl: "3600",
        upsert: false
      });

    if (errorSubida) {
      throw errorSubida;
    }

    const { data } = supabaseClient.storage
      .from("articulos")
      .getPublicUrl(rutaArchivo);

    return {
      url: data.publicUrl,
      path: rutaArchivo
    };
  }

  formAporte.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    botonEnviar.disabled = true;
    botonEnviar.textContent = "Enviando aporte...";

    mostrarMensaje(
      "Guardando la información y cargando la imagen..."
    );

    let imagenSubidaPath = null;

    try {
      const titulo = document
        .getElementById("titulo")
        .value
        .trim();

      const tipo = tipoSelect.value;
      const categoria = categoriaSelect.value;

      const descripcionCorta = document
        .getElementById("descripcion-corta")
        .value
        .trim();

      const contenido = document
        .getElementById("contenido")
        .value
        .trim();

      const ubicacion = document
        .getElementById("ubicacion")
        .value
        .trim();

      const fechaReferencia = document
        .getElementById("fecha-referencia")
        .value
        .trim();

      const estadoConservacion = document
        .getElementById("estado-conservacion")
        .value;

      const fuente = document
        .getElementById("fuente")
        .value
        .trim();

      const autorNombre = autorNombreInput.value.trim();
      const mostrarAutor = mostrarAutorInput.checked;
      const archivoImagen = imagenInput.files[0] || null;

      if (
        !titulo ||
        !tipo ||
        !categoria ||
        !descripcionCorta ||
        !contenido
      ) {
        throw new Error(
          "Completa todos los campos obligatorios."
        );
      }

      if (mostrarAutor && !autorNombre) {
        throw new Error(
          "Escribe tu nombre o desmarca la autorización de autoría."
        );
      }

     const imagen = archivoImagen
  ? await subirImagen(archivoImagen)
  : {
      url: null,
      path: null
    };

imagenSubidaPath = imagen.path;

const { error: errorArticulo } = await supabaseClient
  .from("articulos")
  .insert({
    titulo,
    tipo,
    categoria,
    descripcion_corta: descripcionCorta,
    contenido,
    ubicacion: ubicacion || null,
    fecha_referencia: fechaReferencia || null,
    estado_conservacion: estadoConservacion || null,
    fuente: fuente || null,
    imagen_url: imagen.url || null,
    imagen_path: imagen.path || null,
    autor_id: usuarioActual.id,
    autor_nombre: autorNombre || null,
    mostrar_autor: mostrarAutor,
    estado: "pendiente"
  });

      if (errorArticulo) {
        throw errorArticulo;
      }

      formAporte.reset();

      categoriaSelect.disabled = true;
      categoriaSelect.innerHTML =
        '<option value="">Primero selecciona una sección</option>';

      vistaImagen.style.display = "none";
      imagenPrevia.src = "";

      if (perfilActual?.nombre) {
        autorNombreInput.value = perfilActual.nombre;
      }

      mostrarMensaje(
        "Gracias por contribuir a preservar la memoria de Pácora. " +
        "Tu aporte fue recibido y quedó pendiente de revisión antes de su publicación.",
        "exito"
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    } catch (error) {
      console.error("Error al enviar el aporte:", error);

      if (imagenSubidaPath) {
        await supabaseClient.storage
          .from("articulos")
          .remove([imagenSubidaPath]);
      }

      mostrarMensaje(
        error.message || "No fue posible enviar el aporte.",
        "error"
      );

    } finally {
      botonEnviar.disabled = false;
      botonEnviar.textContent = "Enviar para revisión";
    }
  });

  try {
    const sesionValida = await verificarSesion();

    if (!sesionValida) {
      return;
    }

    await cargarPerfil();

  } catch (error) {
    console.error("Error inicializando el formulario:", error);

    mostrarMensaje(
      "No fue posible verificar tu sesión.",
      "error"
    );
  }
});