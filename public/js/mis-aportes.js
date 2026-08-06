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

    if (estado === "rechazado") {
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

    if (!articulos || articulos.length === 0) {
      mostrarVacio(
        "Todavía no has enviado artículos con esta cuenta."
      );
      return;
    }

    tablaArticulos.innerHTML = "";

    articulos.forEach((articulo) => {
      const fila = document.createElement("tr");

      const estado =
        articulo.estado || "pendiente";

      const titulo =
        escaparHtml(articulo.titulo);

      const categoria =
        escaparHtml(
          articulo.categoria ||
          articulo.tipo ||
          "General"
        );

      const observacion =
        articulo.observaciones_admin
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
              ${escaparHtml(
                articulo.observaciones_admin
              )}
            </div>
          `
          : "";

      let acciones = "";

      if (estado === "pendiente") {
        acciones = `
          <a
            href="editar-aporte.html?id=${articulo.id}"
            class="btn editar"
          >
            Editar
          </a>
        `;
      } else if (estado === "publicado") {
        acciones = `
          <a
            href="articulo.html?id=${articulo.id}"
            class="btn ver"
          >
            Ver
          </a>
        `;
      } else {
        acciones = `
          <a
            href="editar-aporte.html?id=${articulo.id}"
            class="btn editar"
          >
            Corregir
          </a>
        `;
      }

      fila.innerHTML = `
        <td>
          <strong>${titulo}</strong>
          ${observacion}
        </td>

        <td>${categoria}</td>

        <td>
          <span class="estado ${obtenerClaseEstado(estado)}">
            ${obtenerTextoEstado(estado)}
          </span>
        </td>

        <td>
          ${formatearFecha(articulo.created_at)}
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