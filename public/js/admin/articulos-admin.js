document.addEventListener("DOMContentLoaded", async () => {
  const listaArticulos =
    document.getElementById("listaArticulos");

  let usuarioActual = null;

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
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(fecha));
  }

  function nombreEstado(estado) {
    const estados = {
      pendiente: "Pendiente",
      publicado: "Publicado",
      rechazado: "Rechazado"
    };

    return estados[estado] || estado;
  }

  function mostrarError(mensaje) {
    listaArticulos.innerHTML = `
      <div class="mensaje-panel mensaje-error">
        ${escaparHTML(mensaje)}
      </div>
    `;
  }

  async function verificarAdministrador() {
    const {
      data: { session },
      error: errorSesion
    } = await supabaseClient.auth.getSession();

    if (errorSesion) {
      throw errorSesion;
    }

    if (!session) {
      window.location.href = "login.html";
      return false;
    }

    usuarioActual = session.user;

    const {
      data: perfil,
      error: errorPerfil
    } = await supabaseClient
      .from("profiles")
      .select("rol")
      .eq("id", usuarioActual.id)
      .maybeSingle();

    if (errorPerfil) {
      throw errorPerfil;
    }

    if (
      !perfil ||
      perfil.rol !== "administrador"
    ) {
      alert(
        "No tienes permisos para administrar artículos."
      );

      window.location.href = "index.html";
      return false;
    }

    return true;
  }

  async function cargarArticulos() {
    listaArticulos.innerHTML = `
      <div class="mensaje-panel">
        Cargando artículos...
      </div>
    `;

    const {
      data: articulos,
      error
    } = await supabaseClient
      .from("articulos")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(
        "Error al cargar artículos:",
        error
      );

      mostrarError(
        "No fue posible cargar los artículos."
      );

      return;
    }

    if (
      !articulos ||
      articulos.length === 0
    ) {
      listaArticulos.innerHTML = `
        <div class="mensaje-panel">
          Todavía no hay artículos registrados.
        </div>
      `;

      return;
    }

    listaArticulos.innerHTML =
      articulos
        .map((articulo) =>
          crearTarjetaArticulo(articulo)
        )
        .join("");

    agregarEventos();
  }

  function crearTarjetaArticulo(articulo) {
    const autorVisible =
      articulo.mostrar_autor &&
      articulo.autor_nombre
        ? articulo.autor_nombre
        : "Aporte comunitario";

    const imagen = articulo.imagen_url
      ? `
        <img
          src="${escaparHTML(
            articulo.imagen_url
          )}"
          alt="${escaparHTML(
            articulo.titulo
          )}"
        >
      `
      : `
        <div class="sin-imagen">
          Sin fotografía
        </div>
      `;

    const observacion =
      articulo.observaciones_admin
        ? `
          <div
            style="
              margin-top: 15px;
              padding: 14px;
              background: #fff7df;
              border-left: 5px solid #d6aa00;
              border-radius: 8px;
              color: #66501b;
              line-height: 1.5;
            "
          >
            <strong>
              Observación del administrador:
            </strong>

            <br>

            ${escaparHTML(
              articulo.observaciones_admin
            )}
          </div>
        `
        : "";

    return `
      <article
        class="tarjeta-articulo"
        data-id="${articulo.id}"
      >

        <div class="imagen-articulo">
          ${imagen}
        </div>

        <div class="contenido-tarjeta">

          <div class="etiquetas-articulo">

            <span class="etiqueta">
              ${escaparHTML(
                articulo.tipo
              )}
            </span>

            <span class="etiqueta">
              ${escaparHTML(
                articulo.categoria ||
                "Sin categoría"
              )}
            </span>

            <span
              class="estado estado-${escaparHTML(
                articulo.estado
              )}"
            >
              ${escaparHTML(
                nombreEstado(
                  articulo.estado
                )
              )}
            </span>

          </div>

          <h2>
            ${escaparHTML(
              articulo.titulo
            )}
          </h2>

          <p class="descripcion-articulo">
            ${escaparHTML(
              articulo.descripcion_corta
            )}
          </p>

          <div class="datos-articulo">

            <p>
              <strong>Autor:</strong>
              ${escaparHTML(
                autorVisible
              )}
            </p>

            <p>
              <strong>Fecha:</strong>
              ${escaparHTML(
                formatearFecha(
                  articulo.created_at
                )
              )}
            </p>

          </div>

          ${observacion}

          <details class="contenido-completo">

            <summary>
              Ver contenido completo
            </summary>

            <div class="texto-completo">
              ${escaparHTML(
                articulo.contenido
              )}
            </div>

            ${
              articulo.ubicacion
                ? `
                  <p>
                    <strong>
                      Ubicación:
                    </strong>

                    ${escaparHTML(
                      articulo.ubicacion
                    )}
                  </p>
                `
                : ""
            }

            ${
              articulo.fecha_referencia
                ? `
                  <p>
                    <strong>
                      Fecha o periodo:
                    </strong>

                    ${escaparHTML(
                      articulo.fecha_referencia
                    )}
                  </p>
                `
                : ""
            }

            ${
              articulo.estado_conservacion
                ? `
                  <p>
                    <strong>
                      Estado de conservación:
                    </strong>

                    ${escaparHTML(
                      articulo.estado_conservacion
                    )}
                  </p>
                `
                : ""
            }

            ${
              articulo.fuente
                ? `
                  <p>
                    <strong>
                      Fuente:
                    </strong>

                    ${escaparHTML(
                      articulo.fuente
                    )}
                  </p>
                `
                : ""
            }

          </details>

          <div class="acciones-articulo">

            ${
              articulo.estado !== "publicado"
                ? `
                  <button
                    type="button"
                    class="boton-publicar"
                    data-accion="publicar"
                    data-id="${articulo.id}"
                  >
                    Publicar
                  </button>
                `
                : `
                  <a
                    href="articulo.html?id=${articulo.id}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="boton-publicar"
                    style="text-decoration:none;"
                  >
                    Ver publicado
                  </a>
                `
            }

            ${
              articulo.estado !== "rechazado"
                ? `
                  <button
                    type="button"
                    class="boton-rechazar"
                    data-accion="rechazar"
                    data-id="${articulo.id}"
                  >
                    Rechazar
                  </button>
                `
                : ""
            }

            <button
              type="button"
              class="boton-eliminar"
              data-accion="eliminar"
              data-id="${articulo.id}"
              data-imagen-path="${escaparHTML(
                articulo.imagen_path || ""
              )}"
            >
              Eliminar
            </button>

          </div>

        </div>

      </article>
    `;
  }

  function agregarEventos() {
    document
      .querySelectorAll("[data-accion]")
      .forEach((boton) => {
        boton.addEventListener(
          "click",
          async () => {
            const accion =
              boton.dataset.accion;

            const articuloId =
              boton.dataset.id;

            const imagenPath =
              boton.dataset.imagenPath ||
              null;

            if (accion === "publicar") {
              await cambiarEstado(
                articuloId,
                "publicado",
                boton
              );
            }

            if (accion === "rechazar") {
              await cambiarEstado(
                articuloId,
                "rechazado",
                boton
              );
            }

            if (accion === "eliminar") {
              await eliminarArticulo(
                articuloId,
                imagenPath,
                boton
              );
            }
          }
        );
      });
  }

  async function cambiarEstado(
    id,
    nuevoEstado,
    boton
  ) {
    let observacion = null;

    if (nuevoEstado === "publicado") {
      const confirmarPublicacion =
        confirm(
          "¿Deseas publicar este artículo?"
        );

      if (!confirmarPublicacion) {
        return;
      }
    }

    if (nuevoEstado === "rechazado") {
      observacion = prompt(
        "Escribe la observación que verá el colaborador:"
      );

      if (observacion === null) {
        return;
      }

      observacion =
        observacion.trim();

      if (!observacion) {
        alert(
          "Debes escribir una observación antes de rechazar el artículo."
        );

        return;
      }
    }

    const textoOriginal =
      boton.textContent;

    boton.disabled = true;
    boton.textContent =
      "Procesando...";

    const cambios = {
      estado: nuevoEstado,
      updated_at:
        new Date().toISOString()
    };

    if (
      nuevoEstado === "publicado"
    ) {
      cambios.published_at =
        new Date().toISOString();

      cambios.observaciones_admin =
        null;
    }

    if (
      nuevoEstado === "rechazado"
    ) {
      cambios.observaciones_admin =
        observacion;

      cambios.published_at =
        null;
    }

    const { error } =
      await supabaseClient
        .from("articulos")
        .update(cambios)
        .eq("id", id);

    if (error) {
      console.error(
        "Error al cambiar el estado:",
        error
      );

      alert(
        "No fue posible actualizar el artículo."
      );

      boton.disabled = false;
      boton.textContent =
        textoOriginal;

      return;
    }

    if (
      nuevoEstado === "publicado"
    ) {
      alert(
        "El artículo fue publicado correctamente."
      );
    }

    if (
      nuevoEstado === "rechazado"
    ) {
      alert(
        "El artículo fue rechazado y la observación fue guardada."
      );
    }

    await cargarArticulos();
  }

  async function eliminarArticulo(
    id,
    imagenPath,
    boton
  ) {
    const confirmar = confirm(
      "¿Deseas eliminar definitivamente este artículo? " +
      "Esta acción no se puede deshacer."
    );

    if (!confirmar) {
      return;
    }

    boton.disabled = true;
    boton.textContent =
      "Eliminando...";

    const {
      error: errorArticulo
    } = await supabaseClient
      .from("articulos")
      .delete()
      .eq("id", id);

    if (errorArticulo) {
      console.error(
        "Error al eliminar el artículo:",
        errorArticulo
      );

      alert(
        "No fue posible eliminar el artículo."
      );

      boton.disabled = false;
      boton.textContent =
        "Eliminar";

      return;
    }

    if (imagenPath) {
      const {
        error: errorImagen
      } =
        await supabaseClient.storage
          .from("articulos")
          .remove([imagenPath]);

      if (errorImagen) {
        console.warn(
          "El artículo se eliminó, pero no se pudo borrar la imagen:",
          errorImagen
        );
      }
    }

    await cargarArticulos();
  }

  try {
    const accesoPermitido =
      await verificarAdministrador();

    if (!accesoPermitido) {
      return;
    }

    await cargarArticulos();

  } catch (error) {
    console.error(
      "Error al iniciar el administrador:",
      error
    );

    mostrarError(
      "No fue posible verificar el acceso al panel."
    );
  }
});