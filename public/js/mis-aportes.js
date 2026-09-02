document.addEventListener("DOMContentLoaded", async () => {
  const correoUsuario =
    document.getElementById("correoUsuario");

  const tablaArticulos =
    document.getElementById("tablaArticulos");

  function escaparHtml(texto) {
    return String(texto ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatearFecha(fecha) {
    if (!fecha) {
      return "Sin fecha";
    }

    return new Intl.DateTimeFormat("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(fecha));
  }

  function obtenerClaseEstado(estado) {
    if (estado === "publicado") {
      return "publicado";
    }

    if (
      estado === "rechazado" ||
      estado === "correcciones"
    ) {
      return "rechazado";
    }

    return "pendiente";
  }

  function obtenerTextoEstado(estado) {
    if (estado === "publicado") {
      return "Publicado";
    }

    if (estado === "rechazado") {
      return "Rechazado";
    }

    if (estado === "correcciones") {
      return "Requiere correcciones";
    }

    return "Pendiente";
  }

  function mostrarVacio(mensaje) {
    tablaArticulos.innerHTML = `
      <tr>
        <td colspan="5" class="vacio">
          ${escaparHtml(mensaje)}
        </td>
      </tr>
    `;
  }

  try {
    const {
      data: { session },
      error: errorSesion
    } = await supabaseClient.auth.getSession();

    if (errorSesion) {
      throw errorSesion;
    }

    if (!session) {
      window.location.replace("login.html");
      return;
    }

    const usuario = session.user;

    correoUsuario.textContent =
      `Sesión iniciada como: ${usuario.email}`;

    mostrarVacio("Cargando tus aportes...");

    // ==============================
    // CARGAR ARTÍCULOS
    // ==============================

    const {
      data: articulos,
      error: errorArticulos
    } = await supabaseClient
      .from("articulos")
      .select(`
        id,
        titulo,
        tipo,
        categoria,
        estado,
        observaciones_admin,
        created_at
      `)
      .eq("autor_id", usuario.id)
      .order("created_at", {
        ascending: false
      });

    if (errorArticulos) {
      throw errorArticulos;
    }

    // ==============================
    // CARGAR RECURSOS PEDAGÓGICOS
    // ==============================

    const {
      data: recursos,
      error: errorRecursos
    } = await supabaseClient
      .from("recursos_pedagogicos")
      .select(`
        id,
        titulo,
        area,
        eje_catedra,
        estado,
        observaciones_admin,
        created_at
      `)
      .eq("autor_id", usuario.id)
      .order("created_at", {
        ascending: false
      });

    if (errorRecursos) {
      throw errorRecursos;
    }

    // ==============================
    // UNIR LOS DOS TIPOS DE APORTES
    // ==============================

    const listaArticulos =
      (articulos || []).map((articulo) => ({
        ...articulo,
        claseAporte: "articulo"
      }));

    const listaRecursos =
      (recursos || []).map((recurso) => ({
        ...recurso,
        claseAporte: "recurso"
      }));

    const aportes = [
      ...listaArticulos,
      ...listaRecursos
    ].sort((a, b) => {
      return new Date(b.created_at) -
        new Date(a.created_at);
    });

    if (aportes.length === 0) {
      mostrarVacio(
        "Todavía no has enviado aportes con esta cuenta."
      );
      return;
    }

    tablaArticulos.innerHTML = "";

    // ==============================
    // MOSTRAR APORTES
    // ==============================

    aportes.forEach((aporte) => {
      const fila = document.createElement("tr");

      const estado =
        aporte.estado || "pendiente";

      const titulo =
        escaparHtml(aporte.titulo);

      let categoria = "";

      if (aporte.claseAporte === "recurso") {
        categoria = `
          <strong>Recurso pedagógico</strong>
          <br>
          ${escaparHtml(
            aporte.area ||
            aporte.eje_catedra ||
            "General"
          )}
        `;
      } else {
        categoria = `
          <strong>Artículo</strong>
          <br>
          ${escaparHtml(
            aporte.categoria ||
            aporte.tipo ||
            "General"
          )}
        `;
      }

      const observacion =
        aporte.observaciones_admin
          ? `
            <div style="
              margin-top:8px;
              padding:8px;
              background:#fff7df;
              border-left:4px solid #d6aa00;
              color:#6b5520;
              border-radius:6px;
              font-size:14px;
            ">
              <strong>
                Observación del administrador:
              </strong>
              <br>
              ${escaparHtml(
                aporte.observaciones_admin
              )}
            </div>
          `
          : "";

      let acciones = "";

      // ==============================
      // ACCIONES PARA RECURSOS
      // ==============================

      if (aporte.claseAporte === "recurso") {

        if (estado === "publicado") {
          acciones = `
            <span style="
              color:#235437;
              font-weight:bold;
            ">
              ✓ Publicado
            </span>
          `;
        } else if (
          estado === "correcciones" ||
          estado === "rechazado"
        ) {
          acciones = `
            <a
              href="editar-recurso.html?id=${aporte.id}"
              class="btn editar"
            >
              Corregir recurso
            </a>
          `;
        } else {
          acciones = `
            <a
              href="editar-recurso.html?id=${aporte.id}"
              class="btn editar"
            >
              Editar recurso
            </a>
          `;
        }

      }

      // ==============================
      // ACCIONES PARA ARTÍCULOS
      // ==============================

      else {

        if (estado === "pendiente") {
          acciones = `
            <a
              href="editar-aporte.html?id=${aporte.id}"
              class="btn editar"
            >
              Editar
            </a>
          `;
        } else if (estado === "publicado") {
          acciones = `
            <a
              href="articulo.html?id=${aporte.id}"
              class="btn ver"
            >
              Ver
            </a>
          `;
        } else {
          acciones = `
            <a
              href="editar-aporte.html?id=${aporte.id}"
              class="btn editar"
            >
              Corregir
            </a>
          `;
        }

      }

      fila.innerHTML = `
        <td>
          <strong>${titulo}</strong>
          ${observacion}
        </td>

        <td>
          ${categoria}
        </td>

        <td>
          <span class="
            estado
            ${obtenerClaseEstado(estado)}
          ">
            ${obtenerTextoEstado(estado)}
          </span>
        </td>

        <td>
          ${formatearFecha(aporte.created_at)}
        </td>

        <td class="acciones">
          ${acciones}
        </td>
      `;

      tablaArticulos.appendChild(fila);
    });

  } catch (error) {
    console.error(
      "Error cargando los aportes:",
      error
    );

    mostrarVacio(
      "No fue posible cargar tus aportes."
    );
  }
});