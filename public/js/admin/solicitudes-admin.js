document.addEventListener("DOMContentLoaded", async () => {
  const listaSolicitudes = document.getElementById("lista-solicitudes");
  const botonesFiltro = document.querySelectorAll("[data-filtro]");

  let solicitudes = [];
  let filtroActual = "todas";
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

  function mostrarMensaje(texto, tipo = "normal") {
    listaSolicitudes.innerHTML = `
      <div class="mensaje-panel ${tipo === "error" ? "mensaje-error" : ""}">
        ${escaparHTML(texto)}
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

    const { data: perfil, error: errorPerfil } = await supabaseClient
      .from("profiles")
      .select("rol")
      .eq("id", usuarioActual.id)
      .maybeSingle();

    if (errorPerfil) {
      throw errorPerfil;
    }

    if (!perfil || perfil.rol !== "administrador") {
      alert("No tienes permisos para consultar estas solicitudes.");
      window.location.href = "index.html";
      return false;
    }

    return true;
  }

  async function cargarSolicitudes() {
    mostrarMensaje("Cargando solicitudes...");

    const { data, error } = await supabaseClient
      .from("solicitudes_colaborador")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar solicitudes:", error);
      mostrarMensaje(
        "No fue posible cargar las solicitudes.",
        "error"
      );
      return;
    }

    solicitudes = data || [];
    mostrarSolicitudes();
  }

  function mostrarSolicitudes() {
    const solicitudesFiltradas =
      filtroActual === "todas"
        ? solicitudes
        : solicitudes.filter(
            (solicitud) => solicitud.estado === filtroActual
          );

    if (solicitudesFiltradas.length === 0) {
      mostrarMensaje(
        filtroActual === "todas"
          ? "Todavía no hay solicitudes registradas."
          : "No hay solicitudes con este estado."
      );
      return;
    }

    listaSolicitudes.innerHTML = solicitudesFiltradas
      .map(crearTarjetaSolicitud)
      .join("");

    agregarEventos();
  }

  function crearTarjetaSolicitud(solicitud) {
    const telefono = solicitud.telefono
      ? escaparHTML(solicitud.telefono)
      : "No registrado";

    const institucion = solicitud.institucion
      ? escaparHTML(solicitud.institucion)
      : "No registrada";

    return `
      <article class="solicitud-card">

        <div class="solicitud-superior">
          <div>
            <h2>${escaparHTML(solicitud.nombre)}</h2>

            <span class="estado-solicitud estado-${escaparHTML(
              solicitud.estado
            )}">
              ${escaparHTML(solicitud.estado)}
            </span>
          </div>

          <span class="fecha-solicitud">
            ${escaparHTML(formatearFecha(solicitud.created_at))}
          </span>
        </div>

        <div class="datos-solicitud">

          <p>
            <strong>Correo:</strong>
            <a href="mailto:${escaparHTML(solicitud.correo)}">
              ${escaparHTML(solicitud.correo)}
            </a>
          </p>

          <p>
            <strong>Teléfono:</strong>
            ${telefono}
          </p>

          <p>
            <strong>Institución:</strong>
            ${institucion}
          </p>

          <p>
            <strong>Municipio:</strong>
            ${escaparHTML(solicitud.municipio)}
          </p>

        </div>

        <div class="motivo-solicitud">
          <strong>Motivo de la solicitud</strong>

          <p>
            ${escaparHTML(solicitud.mensaje)}
          </p>
        </div>

        ${
          solicitud.reviewed_at
            ? `
              <p class="fecha-revision">
                Revisada el ${escaparHTML(
                  formatearFecha(solicitud.reviewed_at)
                )}
              </p>
            `
            : ""
        }

        <div class="acciones-solicitud">

          ${
            solicitud.estado !== "aprobada"
              ? `
                <button
                  type="button"
                  class="boton-aprobar"
                  data-accion="aprobar"
                  data-id="${solicitud.id}"
                >
                  Aprobar
                </button>
              `
              : ""
          }

          ${
            solicitud.estado !== "rechazada"
              ? `
                <button
                  type="button"
                  class="boton-rechazar-solicitud"
                  data-accion="rechazar"
                  data-id="${solicitud.id}"
                >
                  Rechazar
                </button>
              `
              : ""
          }

          <button
            type="button"
            class="boton-copiar"
            data-accion="copiar"
            data-correo="${escaparHTML(solicitud.correo)}"
          >
            Copiar correo
          </button>

          <button
            type="button"
            class="boton-eliminar-solicitud"
            data-accion="eliminar"
            data-id="${solicitud.id}"
          >
            Eliminar
          </button>

        </div>

      </article>
    `;
  }

  function agregarEventos() {
    document.querySelectorAll("[data-accion]").forEach((boton) => {
      boton.addEventListener("click", async () => {
        const accion = boton.dataset.accion;

        if (accion === "aprobar") {
          await cambiarEstado(
            boton.dataset.id,
            "aprobada",
            boton
          );
        }

        if (accion === "rechazar") {
          await cambiarEstado(
            boton.dataset.id,
            "rechazada",
            boton
          );
        }

        if (accion === "copiar") {
          await copiarCorreo(boton.dataset.correo, boton);
        }

        if (accion === "eliminar") {
          await eliminarSolicitud(
            boton.dataset.id,
            boton
          );
        }
      });
    });
  }

  async function cambiarEstado(id, nuevoEstado, boton) {
    const mensaje =
      nuevoEstado === "aprobada"
        ? "¿Deseas aprobar esta solicitud?"
        : "¿Deseas rechazar esta solicitud?";

    if (!confirm(mensaje)) {
      return;
    }

    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = "Procesando...";

    const { error } = await supabaseClient
      .from("solicitudes_colaborador")
      .update({
        estado: nuevoEstado,
        reviewed_at: new Date().toISOString(),
        reviewed_by: usuarioActual.id
      })
      .eq("id", id);

    if (error) {
      console.error("Error al actualizar solicitud:", error);

      alert("No fue posible actualizar la solicitud.");

      boton.disabled = false;
      boton.textContent = textoOriginal;
      return;
    }

    await cargarSolicitudes();
  }

  async function copiarCorreo(correo, boton) {
    try {
      await navigator.clipboard.writeText(correo);

      const textoOriginal = boton.textContent;

      boton.textContent = "Correo copiado";

      setTimeout(() => {
        boton.textContent = textoOriginal;
      }, 1800);

    } catch (error) {
      console.error("Error al copiar el correo:", error);
      alert(`Correo: ${correo}`);
    }
  }

  async function eliminarSolicitud(id, boton) {
    const confirmar = confirm(
      "¿Deseas eliminar definitivamente esta solicitud?"
    );

    if (!confirmar) {
      return;
    }

    boton.disabled = true;
    boton.textContent = "Eliminando...";

    const { error } = await supabaseClient
      .from("solicitudes_colaborador")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar solicitud:", error);

      alert("No fue posible eliminar la solicitud.");

      boton.disabled = false;
      boton.textContent = "Eliminar";
      return;
    }

    await cargarSolicitudes();
  }

  botonesFiltro.forEach((boton) => {
    boton.addEventListener("click", () => {
      botonesFiltro.forEach((item) => {
        item.classList.remove("activo");
      });

      boton.classList.add("activo");
      filtroActual = boton.dataset.filtro;

      mostrarSolicitudes();
    });
  });

  try {
    const accesoPermitido = await verificarAdministrador();

    if (!accesoPermitido) {
      return;
    }

    await cargarSolicitudes();

  } catch (error) {
    console.error(
      "Error al iniciar el panel de solicitudes:",
      error
    );

    mostrarMensaje(
      "No fue posible verificar el acceso al panel.",
      "error"
    );
  }
});