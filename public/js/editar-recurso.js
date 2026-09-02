document.addEventListener("DOMContentLoaded", async () => {

  const usuarioActivo =
    document.getElementById("usuario-activo");

  const form =
    document.getElementById("form-recurso");

  const mensaje =
    document.getElementById("mensaje");

  const botonGuardar =
    document.getElementById("guardar-recurso");

  const observacionBox =
    document.getElementById("observacion-admin");

  const textoObservacion =
    document.getElementById("texto-observacion");

  const archivoActual =
    document.getElementById("archivo-actual");

  const parametros =
    new URLSearchParams(window.location.search);

  const recursoId =
    parametros.get("id");

  let usuarioActual = null;
  let recursoActual = null;

  // ==========================================
  // VALIDAR ID
  // ==========================================

  if (!recursoId) {
    mensaje.textContent =
      "No se encontró el recurso que deseas editar.";

    mensaje.style.color = "#a52a2a";
    form.style.display = "none";
    return;
  }

  try {

    // ==========================================
    // VERIFICAR SESIÓN
    // ==========================================

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

    usuarioActual = session.user;

    usuarioActivo.textContent =
      `Sesión activa: ${usuarioActual.email}`;

    // ==========================================
    // CARGAR RECURSO
    // ==========================================

    const {
      data: recurso,
      error: errorRecurso
    } = await supabaseClient
      .from("recursos_pedagogicos")
      .select("*")
      .eq("id", recursoId)
      .eq("autor_id", usuarioActual.id)
      .single();

    if (errorRecurso) {
      throw errorRecurso;
    }

    recursoActual = recurso;

    // ==========================================
    // EVITAR EDITAR PUBLICADOS
    // ==========================================

    if (recurso.estado === "publicado") {

      mensaje.textContent =
        "Este recurso ya fue publicado y no puede editarse desde este formulario.";

      mensaje.style.color = "#235437";

      botonGuardar.style.display = "none";
    }

    // ==========================================
    // LLENAR FORMULARIO
    // ==========================================

    document.getElementById("titulo").value =
      recurso.titulo || "";

    document.getElementById("institucion").value =
      recurso.institucion || "";

    document.getElementById("nivel").value =
      recurso.nivel || "";

    document.getElementById("grado").value =
      recurso.grado || "";

    document.getElementById("area").value =
      recurso.area || "";

    document.getElementById("eje-catedra").value =
      recurso.eje_catedra || "";

    document.getElementById("descripcion").value =
      recurso.descripcion || "";

    document.getElementById(
      "objetivo-pedagogico"
    ).value =
      recurso.objetivo_pedagogico || "";

    document.getElementById("autor-nombre").value =
      recurso.autor_nombre || "";

    // ==========================================
    // OBSERVACIONES DEL ADMINISTRADOR
    // ==========================================

    if (recurso.observaciones_admin) {

      observacionBox.style.display = "block";

      textoObservacion.textContent =
        recurso.observaciones_admin;
    }

    // ==========================================
    // ARCHIVO ACTUAL
    // ==========================================

    if (recurso.archivo_path) {

      archivoActual.textContent =
        "El recurso tiene un archivo adjunto. Si no seleccionas uno nuevo, se conservará el actual.";

    } else {

      archivoActual.textContent =
        "Este recurso no tiene un archivo adjunto.";
    }

  } catch (error) {

    console.error(
      "Error cargando el recurso:",
      error
    );

    mensaje.textContent =
      "No fue posible cargar el recurso.";

    mensaje.style.color = "#a52a2a";

    form.style.display = "none";

    return;
  }


  // ==========================================
  // GUARDAR CORRECCIONES
  // ==========================================

  form.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    if (!usuarioActual || !recursoActual) {
      return;
    }

    botonGuardar.disabled = true;
    botonGuardar.textContent =
      "Guardando...";

    mensaje.textContent = "";

    let nuevoArchivoPath =
      recursoActual.archivo_path || null;

    let nuevoArchivoUrl =
      recursoActual.archivo_url || null;

    try {

      // ========================================
      // REEMPLAZAR ARCHIVO SI SELECCIONÓ UNO
      // ========================================

      const inputArchivo =
        document.getElementById("archivo");

      const archivo =
        inputArchivo.files[0];

      if (archivo) {

        const limite =
          20 * 1024 * 1024;

        if (archivo.size > limite) {
          throw new Error(
            "El archivo supera el tamaño máximo de 20 MB."
          );
        }

        const extension =
          archivo.name
            .split(".")
            .pop()
            .toLowerCase();

        const extensionesPermitidas = [
          "pdf",
          "doc",
          "docx",
          "ppt",
          "pptx",
          "xls",
          "xlsx"
        ];

        if (
          !extensionesPermitidas.includes(extension)
        ) {
          throw new Error(
            "El tipo de archivo seleccionado no está permitido."
          );
        }

        const nombreArchivo =
          `${Date.now()}.${extension}`;

        const path =
          `${usuarioActual.id}/${nombreArchivo}`;

        const {
          error: errorSubida
        } = await supabaseClient.storage
          .from("recursos-pedagogicos")
          .upload(
            path,
            archivo,
            {
              upsert: false
            }
          );

        if (errorSubida) {
          throw errorSubida;
        }

        nuevoArchivoPath = path;
        nuevoArchivoUrl = null;
      }

      // ========================================
      // ACTUALIZAR RECURSO
      // ========================================

      const titulo =
        document
          .getElementById("titulo")
          .value
          .trim();

      const institucion =
        document
          .getElementById("institucion")
          .value
          .trim();

      const nivel =
        document
          .getElementById("nivel")
          .value;

      const grado =
        document
          .getElementById("grado")
          .value
          .trim();

      const area =
        document
          .getElementById("area")
          .value;

      const ejeCatedra =
        document
          .getElementById("eje-catedra")
          .value;

      const descripcion =
        document
          .getElementById("descripcion")
          .value
          .trim();

      const objetivoPedagogico =
        document
          .getElementById("objetivo-pedagogico")
          .value
          .trim();

      const autorNombre =
        document
          .getElementById("autor-nombre")
          .value
          .trim();

      const {
        error: errorActualizar
      } = await supabaseClient
        .from("recursos_pedagogicos")
        .update({
          titulo,
          institucion,
          nivel,
          grado,
          area,
          eje_catedra: ejeCatedra,
          descripcion,
          objetivo_pedagogico:
            objetivoPedagogico,
          autor_nombre: autorNombre,
          archivo_path: nuevoArchivoPath,
          archivo_url: nuevoArchivoUrl,

          // Vuelve a la bandeja del administrador
          estado: "pendiente",

          // La observación anterior ya fue atendida
          observaciones_admin: null,

          updated_at:
            new Date().toISOString()
        })
        .eq("id", recursoActual.id)
        .eq("autor_id", usuarioActual.id);

      if (errorActualizar) {
        throw errorActualizar;
      }

      // Avisar al administrador que el recurso fue corregido y reenviado
try {
  await supabaseClient.functions.invoke(
    "send-admin-notification",
    {
      body: {
        tipo_notificacion: "aporte_corregido",
titulo: titulo,
autor: autorNombre || usuarioActual.email || "Colaborador",
tipo_aporte: "Recurso pedagógico"
      }
    }
  );
} catch (errorNotificacion) {
  console.warn(
    "El recurso fue actualizado, pero no se pudo enviar la notificación:",
    errorNotificacion
  );
}
      mensaje.textContent =
        "Recurso corregido y reenviado correctamente. Quedó pendiente de una nueva revisión.";

      mensaje.style.color = "#235437";

      botonGuardar.textContent =
        "Recurso reenviado";

      setTimeout(() => {
        window.location.href =
          "mis-aportes.html";
      }, 1800);

    } catch (error) {

      console.error(
        "Error actualizando recurso:",
        error
      );

      mensaje.textContent =
        error.message ||
        "No fue posible guardar las correcciones.";

      mensaje.style.color = "#a52a2a";

      botonGuardar.disabled = false;

      botonGuardar.textContent =
        "Guardar y reenviar para revisión";
    }

  });

});