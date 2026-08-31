document.addEventListener("DOMContentLoaded", async () => {
  const parametros = new URLSearchParams(window.location.search);
  const idArticulo = parametros.get("id");

  const usuarioActivo = document.getElementById("usuario-activo");
  const formulario = document.getElementById("form-aporte");

  const tituloInput = document.getElementById("titulo");
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const descripcionInput = document.getElementById("descripcion-corta");
  const contenidoInput = document.getElementById("contenido");
  const ubicacionInput = document.getElementById("ubicacion");
  const fechaReferenciaInput =
    document.getElementById("fecha-referencia");
  const estadoConservacionSelect =
    document.getElementById("estado-conservacion");
  const fuenteInput = document.getElementById("fuente");

  const imagenInput = document.getElementById("imagen");
  const vistaImagen = document.getElementById("vista-imagen");
  const imagenPrevia = document.getElementById("imagen-previa");

  const autorNombreInput = document.getElementById("autor-nombre");
  const mostrarAutorInput = document.getElementById("mostrar-autor");

  const botonGuardar = document.getElementById("enviar-aporte");
  const mensaje = document.getElementById("mensaje");

  let usuarioActual = null;
  let articuloActual = null;

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

  function crearSlug(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function obtenerCategoriasSugeridas(tipo) {
    const sugerencias = {
      "tradicion-oral": [
        "Mitos",
        "Leyendas",
        "Cuentos y relatos",
        "Refranes y dichos",
        "Coplas y canciones tradicionales",
        "Creencias populares",
        "Anécdotas y testimonios",
        "Historias de vida"
      ],

      historia: [
        "Historia municipal",
        "Personajes históricos",
        "Hechos y acontecimientos",
        "Instituciones",
        "Memoria comunitaria"
      ],

      turismo: [
        "Sitios turísticos",
        "Rutas y recorridos",
        "Naturaleza",
        "Experiencias culturales"
      ],

      cultura: [
        "Música",
        "Danza",
        "Artes",
        "Gastronomía",
        "Fiestas y celebraciones",
        "Oficios y saberes"
      ]
    };

    return sugerencias[tipo] || [];
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
      window.location.replace("login.html");
      return false;
    }

    usuarioActual = session.user;

    usuarioActivo.textContent =
      `Sesión iniciada como: ${usuarioActual.email}`;

    return true;
  }

  async function cargarCategorias(tipo, categoriaActual = "") {
    categoriaSelect.innerHTML =
      '<option value="">Cargando categorías...</option>';

    categoriaSelect.disabled = true;

    if (!tipo) {
      categoriaSelect.innerHTML =
        '<option value="">Primero selecciona una sección</option>';
      return;
    }

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

      const categorias = [];

      if (data && data.length > 0) {
        data.forEach((categoria) => {
          categorias.push({
            nombre: categoria.nombre,
            slug: categoria.slug
          });
        });
      } else {
        obtenerCategoriasSugeridas(tipo).forEach((nombre) => {
          categorias.push({
            nombre,
            slug: crearSlug(nombre)
          });
        });
      }

      if (
        categoriaActual &&
        !categorias.some(
          (categoria) => categoria.slug === categoriaActual
        )
      ) {
        categorias.push({
          nombre: categoriaActual
            .replaceAll("-", " ")
            .replace(/\b\w/g, (letra) => letra.toUpperCase()),
          slug: categoriaActual
        });
      }

      if (categorias.length === 0) {
        categorias.push({
          nombre: "Categoría general",
          slug: crearSlug(tipo)
        });
      }

      categorias.forEach((categoria) => {
        const opcion = document.createElement("option");

        opcion.value = categoria.slug;
        opcion.textContent = categoria.nombre;

        categoriaSelect.appendChild(opcion);
      });

      categoriaSelect.disabled = false;

      if (categoriaActual) {
        categoriaSelect.value = categoriaActual;
      }
    } catch (error) {
      console.error(
        "Error cargando categorías:",
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

  async function cargarArticulo() {
    const { data: articulo, error } = await supabaseClient
      .from("articulos")
      .select("*")
      .eq("id", idArticulo)
      .eq("autor_id", usuarioActual.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!articulo) {
      throw new Error(
        "El artículo no existe o no pertenece a tu cuenta."
      );
    }

    if (
      articulo.estado !== "rechazado" &&
      articulo.estado !== "pendiente"
    ) {
      throw new Error(
        "Este artículo ya no está disponible para edición."
      );
    }

    articuloActual = articulo;

    tituloInput.value = articulo.titulo || "";
    tipoSelect.value = articulo.tipo || "";

    await cargarCategorias(
      articulo.tipo,
      articulo.categoria
    );

    descripcionInput.value =
      articulo.descripcion_corta || "";

    contenidoInput.value =
      articulo.contenido || "";

    ubicacionInput.value =
      articulo.ubicacion || "";

    fechaReferenciaInput.value =
      articulo.fecha_referencia || "";

    estadoConservacionSelect.value =
      articulo.estado_conservacion || "";

    fuenteInput.value =
      articulo.fuente || "";

    autorNombreInput.value =
      articulo.autor_nombre || "";

    mostrarAutorInput.checked =
      Boolean(articulo.mostrar_autor);

    if (articulo.imagen_url) {
      imagenPrevia.src = articulo.imagen_url;
      vistaImagen.style.display = "block";
    }

    if (articulo.observaciones_admin) {
      mostrarMensaje(
        `Observación del administrador: ${articulo.observaciones_admin}`,
        "error"
      );
    } else {
      mostrarMensaje(
        "Puedes modificar el aporte y enviarlo nuevamente para revisión."
      );
    }
  }

  tipoSelect.addEventListener("change", async () => {
    await cargarCategorias(tipoSelect.value);
  });

  imagenInput.addEventListener("change", () => {
    const archivo = imagenInput.files[0];

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      imagenInput.value = "";

      mostrarMensaje(
        "La imagen debe estar en formato JPG, PNG o WEBP.",
        "error"
      );

      return;
    }

    const limiteBytes = 5 * 1024 * 1024;

    if (archivo.size > limiteBytes) {
      imagenInput.value = "";

      mostrarMensaje(
        "La imagen supera el tamaño máximo de 5 MB.",
        "error"
      );

      return;
    }

    imagenPrevia.src = URL.createObjectURL(archivo);
    vistaImagen.style.display = "block";
  });

  async function subirNuevaImagen(archivo) {
    if (!archivo) {
      return {
        url: articuloActual.imagen_url || null,
        path: articuloActual.imagen_path || null,
        reemplazada: false
      };
    }

    const nombreSeguro =
      limpiarNombreArchivo(archivo.name);

    const nuevaRuta =
      `${usuarioActual.id}/${Date.now()}-${nombreSeguro}`;

    const { error: errorSubida } =
      await supabaseClient.storage
        .from("articulos")
        .upload(nuevaRuta, archivo, {
          cacheControl: "3600",
          upsert: false
        });

    if (errorSubida) {
      throw errorSubida;
    }

    const { data } = supabaseClient.storage
      .from("articulos")
      .getPublicUrl(nuevaRuta);

    return {
      url: data.publicUrl,
      path: nuevaRuta,
      reemplazada: true
    };
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando correcciones...";

    mostrarMensaje(
      "Actualizando el aporte..."
    );

    let nuevaImagenPath = null;

    try {
      const titulo = tituloInput.value.trim();
      const tipo = tipoSelect.value;
      const categoria = categoriaSelect.value;
      const descripcionCorta =
        descripcionInput.value.trim();
      const contenido =
        contenidoInput.value.trim();

      const autorNombre =
        autorNombreInput.value.trim();

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

      if (
        mostrarAutorInput.checked &&
        !autorNombre
      ) {
        throw new Error(
          "Escribe tu nombre o desmarca la autorización de autoría."
        );
      }

      const archivoNuevo =
        imagenInput.files[0] || null;

      const imagen =
        await subirNuevaImagen(archivoNuevo);

      if (imagen.reemplazada) {
        nuevaImagenPath = imagen.path;
      }

      const {
  data: articuloActualizado,
  error: errorActualizar
} = await supabaseClient
  .from("articulos")
  .update({
    titulo,
    tipo,
    categoria,
    descripcion_corta: descripcionCorta,
    contenido,
    ubicacion:
      ubicacionInput.value.trim() || null,
    fecha_referencia:
      fechaReferenciaInput.value.trim() || null,
    estado_conservacion:
      estadoConservacionSelect.value || null,
    fuente:
      fuenteInput.value.trim() || null,
    imagen_url: imagen.url,
    imagen_path: imagen.path,
    autor_nombre: autorNombre || null,
    mostrar_autor:
      mostrarAutorInput.checked,
    estado: "pendiente",
    observaciones_admin: null,
    published_at: null,
    updated_at:
      new Date().toISOString()
  })
  .eq("id", idArticulo)
  .eq("autor_id", usuarioActual.id)
  .select("id, estado")
  .maybeSingle();

if (errorActualizar) {
  throw errorActualizar;
}

if (!articuloActualizado) {
  throw new Error(
    "No se pudo actualizar el aporte. Revisa los permisos de edición."
  );
}
// Notificar al administrador que el aporte fue corregido.
// Si la notificación falla, las correcciones permanecen guardadas.
try {

  const { error: errorNotificacion } =
    await supabaseClient.functions.invoke(
      "send-admin-notification",
      {
        body: {
          tipo_notificacion: "aporte_corregido",
          titulo,
          autor:
            autorNombre ||
            usuarioActual.email ||
            "Colaborador"
        }
      }
    );

  if (errorNotificacion) {
    console.error(
      "El aporte fue corregido, pero no se pudo notificar al administrador:",
      errorNotificacion
    );
  }

} catch (errorNotificacion) {

  console.error(
    "Error al notificar el reenvío del aporte:",
    errorNotificacion
  );

}

      if (
        imagen.reemplazada &&
        articuloActual.imagen_path &&
        articuloActual.imagen_path !== imagen.path
      ) {
        const { error: errorEliminarAnterior } =
          await supabaseClient.storage
            .from("articulos")
            .remove([
              articuloActual.imagen_path
            ]);

        if (errorEliminarAnterior) {
          console.warn(
            "No se pudo eliminar la imagen anterior:",
            errorEliminarAnterior
          );
        }
      }

      mostrarMensaje(
        "Las correcciones fueron guardadas. El aporte volvió a quedar pendiente de revisión.",
        "exito"
      );

      setTimeout(() => {
        window.location.href =
          "mis-aportes.html";
      }, 2200);
    } catch (error) {
      console.error(
        "Error guardando correcciones:",
        error
      );

      if (nuevaImagenPath) {
        await supabaseClient.storage
          .from("articulos")
          .remove([nuevaImagenPath]);
      }

      mostrarMensaje(
        error.message ||
          "No fue posible guardar las correcciones.",
        "error"
      );

      botonGuardar.disabled = false;
      botonGuardar.textContent =
        "Guardar correcciones y reenviar";
    }
  });

  try {
    if (!idArticulo) {
      throw new Error(
        "No se indicó qué aporte deseas corregir."
      );
    }

    const sesionValida =
      await verificarSesion();

    if (!sesionValida) {
      return;
    }

    await cargarArticulo();
  } catch (error) {
    console.error(
      "Error inicializando la edición:",
      error
    );

    mostrarMensaje(
      error.message ||
        "No fue posible cargar el aporte.",
      "error"
    );

    formulario.style.display = "none";
  }
});