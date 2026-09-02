document.addEventListener("DOMContentLoaded", async () => {

    const form = document.getElementById("form-recurso");
    const mensaje = document.getElementById("mensaje");
    const usuarioActivo = document.getElementById("usuario-activo");
    const botonEnviar = document.getElementById("enviar-recurso");

    let usuarioActual = null;

    // =====================================================
    // VERIFICAR SESIÓN
    // =====================================================

    const {
        data: { session },
        error: errorSesion
    } = await supabaseClient.auth.getSession();

    if (errorSesion || !session) {
        usuarioActivo.textContent = "Debes iniciar sesión para aportar un recurso.";
        usuarioActivo.style.color = "#a11";

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

        return;
    }

    usuarioActual = session.user;

    usuarioActivo.textContent =
        `Sesión activa: ${usuarioActual.email}`;

    // =====================================================
    // CARGAR NOMBRE DEL USUARIO
    // =====================================================

    const autorNombreInput = document.getElementById("autor-nombre");

    const {
        data: perfil
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", usuarioActual.id)
        .maybeSingle();

    if (perfil) {
        const nombrePerfil =
            perfil.nombre ||
            perfil.nombre_completo ||
            perfil.full_name ||
            "";

        if (nombrePerfil) {
            autorNombreInput.value = nombrePerfil;
        }
    }

    // =====================================================
    // ENVIAR RECURSO
    // =====================================================

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        mensaje.textContent = "";
        botonEnviar.disabled = true;
        botonEnviar.textContent = "Enviando recurso...";

        let archivoSubidoPath = null;

        try {

            const titulo =
                document.getElementById("titulo").value.trim();

            const institucion =
                document.getElementById("institucion").value.trim();

            const nivel =
                document.getElementById("nivel").value;

            const grado =
                document.getElementById("grado").value.trim();

            const area =
                document.getElementById("area").value;

            const ejeCatedra =
                document.getElementById("eje-catedra").value;

            const descripcion =
                document.getElementById("descripcion").value.trim();

            const objetivoPedagogico =
                document.getElementById("objetivo-pedagogico").value.trim();

            const autorNombre =
                document.getElementById("autor-nombre").value.trim();

            const archivo =
                document.getElementById("archivo").files[0];

            // =================================================
            // VALIDACIONES
            // =================================================

            if (
                !titulo ||
                !nivel ||
                !area ||
                !ejeCatedra ||
                !descripcion ||
                !archivo
            ) {
                throw new Error(
                    "Completa todos los campos obligatorios."
                );
            }

            const maximoMB = 20;
            const maximoBytes = maximoMB * 1024 * 1024;

            if (archivo.size > maximoBytes) {
                throw new Error(
                    `El archivo supera el tamaño máximo de ${maximoMB} MB.`
                );
            }

            const extensionesPermitidas = [
                "pdf",
                "doc",
                "docx",
                "ppt",
                "pptx",
                "xls",
                "xlsx"
            ];

            const extension =
                archivo.name.split(".").pop().toLowerCase();

            if (!extensionesPermitidas.includes(extension)) {
                throw new Error(
                    "Formato no permitido. Usa PDF, Word, PowerPoint o Excel."
                );
            }

            // =================================================
            // PREPARAR NOMBRE DEL ARCHIVO
            // =================================================

            const nombreSeguro = archivo.name
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-zA-Z0-9._-]/g, "_");

            const nombreArchivo =
                `${Date.now()}_${nombreSeguro}`;

            const rutaArchivo =
                `${usuarioActual.id}/${nombreArchivo}`;

            // =================================================
            // SUBIR ARCHIVO A STORAGE
            // =================================================

            const {
                error: errorArchivo
            } = await supabaseClient.storage
                .from("recursos-pedagogicos")
                .upload(
                    rutaArchivo,
                    archivo,
                    {
                        cacheControl: "3600",
                        upsert: false
                    }
                );

            if (errorArchivo) {
                throw new Error(
                    "No fue posible subir el archivo: " +
                    errorArchivo.message
                );
            }

            archivoSubidoPath = rutaArchivo;

            // =================================================
            // GUARDAR REGISTRO EN BASE DE DATOS
            // =================================================

            const {
                error: errorRegistro
            } = await supabaseClient
                .from("recursos_pedagogicos")
                .insert({
                    titulo: titulo,
                    autor_id: usuarioActual.id,
                    autor_nombre:
                        autorNombre ||
                        usuarioActual.email ||
                        "Colaborador",
                    institucion: institucion || null,
                    nivel: nivel,
                    grado: grado || null,
                    area: area,
                    eje_catedra: ejeCatedra,
                    descripcion: descripcion,
                    objetivo_pedagogico:
                        objetivoPedagogico || null,
                    archivo_path: rutaArchivo,
                    archivo_url: null,
                    estado: "pendiente"
                });

            if (errorRegistro) {

                // Si falla la BD, eliminamos el archivo
                // para no dejar archivos huérfanos.

                await supabaseClient.storage
                    .from("recursos-pedagogicos")
                    .remove([rutaArchivo]);

                archivoSubidoPath = null;

                throw new Error(
                    "No fue posible registrar el recurso: " +
                    errorRegistro.message
                );
            }

            // =================================================
            // ÉXITO
            // =================================================
// Avisar al administrador que llegó un nuevo recurso
try {
    await supabaseClient.functions.invoke(
        "send-admin-notification",
        {
            body: {
                tipo_notificacion: "nuevo_aporte",
                titulo: titulo,
                autor:
                    autorNombre ||
                    usuarioActual.email ||
                    "Colaborador",
                tipo_aporte: "Recurso pedagógico",
                categoria: area,
                descripcion: descripcion
            }
        }
    );
} catch (errorNotificacion) {
    console.warn(
        "El recurso fue registrado, pero no se pudo enviar la notificación:",
        errorNotificacion
    );
}
            mensaje.style.color = "#235437";
            mensaje.textContent =
                "Recurso enviado correctamente. Quedó pendiente de revisión por el administrador.";

            form.reset();

            if (perfil) {
                const nombrePerfil =
                    perfil.nombre ||
                    perfil.nombre_completo ||
                    perfil.full_name ||
                    "";

                if (nombrePerfil) {
                    autorNombreInput.value = nombrePerfil;
                }
            }

        } catch (error) {

            console.error(error);

            mensaje.style.color = "#a11";
            mensaje.textContent =
                error.message ||
                "Ocurrió un error al enviar el recurso.";

        } finally {

            botonEnviar.disabled = false;
            botonEnviar.textContent = "Enviar para revisión";

        }

    });

});