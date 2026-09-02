document.addEventListener("DOMContentLoaded", async () => {

    const listaRecursos = document.getElementById("listaRecursos");

    // =====================================================
    // VERIFICAR SESIÓN
    // =====================================================

    const {
        data: { session },
        error: errorSesion
    } = await supabaseClient.auth.getSession();

    if (errorSesion || !session) {
        window.location.replace("login.html");
        return;
    }

    const usuario = session.user;

    // =====================================================
    // VERIFICAR QUE SEA ADMINISTRADOR
    // =====================================================

    const {
        data: perfil,
        error: errorPerfil
    } = await supabaseClient
        .from("profiles")
        .select("rol")
        .eq("id", usuario.id)
        .maybeSingle();

    if (
        errorPerfil ||
        !perfil ||
        perfil.rol !== "administrador"
    ) {
        await supabaseClient.auth.signOut();
        window.location.replace("login.html");
        return;
    }

    // =====================================================
    // CARGAR RECURSOS
    // =====================================================

    async function cargarRecursos() {

        listaRecursos.innerHTML =
            "<p>Cargando recursos pedagógicos...</p>";

        const {
            data: recursos,
            error
        } = await supabaseClient
            .from("recursos_pedagogicos")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {

            console.error(error);

            listaRecursos.innerHTML = `
                <p style="color:#a11;">
                    No fue posible cargar los recursos:
                    ${error.message}
                </p>
            `;

            return;
        }

        if (!recursos || recursos.length === 0) {

            listaRecursos.innerHTML = `
                <p>
                    Todavía no hay recursos pedagógicos registrados.
                </p>
            `;

            return;
        }

        listaRecursos.innerHTML = "";

        // =================================================
        // CREAR TARJETAS
        // =================================================

        for (const recurso of recursos) {

            const tarjeta = document.createElement("article");

            tarjeta.style.background = "#fff";
            tarjeta.style.borderRadius = "16px";
            tarjeta.style.padding = "22px";
            tarjeta.style.boxShadow =
                "0 8px 22px rgba(0,0,0,.08)";
            tarjeta.style.borderTop =
                "5px solid #c9a227";

            const estado =
                recurso.estado || "pendiente";

            let colorEstado = "#8b5a33";

            if (estado === "publicado") {
                colorEstado = "#235437";
            }

            if (estado === "rechazado") {
                colorEstado = "#a33";
            }

            const fecha = recurso.created_at
                ? new Date(
                    recurso.created_at
                ).toLocaleDateString(
                    "es-CO",
                    {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    }
                )
                : "Sin fecha";

            tarjeta.innerHTML = `

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:12px;
                    align-items:flex-start;
                    margin-bottom:12px;
                ">

                    <h2 style="
                        margin:0;
                        color:#184d2b;
                        font-size:21px;
                    ">
                        ${escaparHTML(recurso.titulo)}
                    </h2>

                    <span style="
                        padding:6px 10px;
                        border-radius:20px;
                        background:${colorEstado};
                        color:white;
                        font-size:12px;
                        font-weight:bold;
                        white-space:nowrap;
                        text-transform:capitalize;
                    ">
                        ${escaparHTML(estado)}
                    </span>

                </div>

                <p>
                    <strong>Autor:</strong>
                    ${escaparHTML(
                        recurso.autor_nombre ||
                        "No especificado"
                    )}
                </p>

                <p>
                    <strong>Institución:</strong>
                    ${escaparHTML(
                        recurso.institucion ||
                        "No especificada"
                    )}
                </p>

                <p>
                    <strong>Nivel:</strong>
                    ${escaparHTML(
                        recurso.nivel ||
                        "No especificado"
                    )}
                </p>

                <p>
                    <strong>Grado:</strong>
                    ${escaparHTML(
                        recurso.grado ||
                        "No especificado"
                    )}
                </p>

                <p>
                    <strong>Área:</strong>
                    ${escaparHTML(
                        recurso.area ||
                        "No especificada"
                    )}
                </p>

                <p>
                    <strong>Eje de la Cátedra:</strong>
                    ${escaparHTML(
                        recurso.eje_catedra ||
                        "No especificado"
                    )}
                </p>

                <p style="line-height:1.6;">
                    <strong>Descripción:</strong><br>
                    ${escaparHTML(
                        recurso.descripcion ||
                        ""
                    )}
                </p>

                ${
                    recurso.objetivo_pedagogico
                    ? `
                        <p style="line-height:1.6;">
                            <strong>Objetivo pedagógico:</strong><br>
                            ${escaparHTML(
                                recurso.objetivo_pedagogico
                            )}
                        </p>
                    `
                    : ""
                }

                <p style="
                    color:#777;
                    font-size:13px;
                ">
                    Enviado: ${fecha}
                </p>

               <div style="
    margin-top:18px;
    display:flex;
    flex-wrap:wrap;
    gap:10px;
">

    <button
        type="button"
        class="boton-enlace abrir-archivo"
        data-path="${escaparAtributo(
            recurso.archivo_path || ""
        )}"
    >
        📄 Abrir archivo
    </button>

    ${
        estado !== "publicado"
        ? `
            <button
                type="button"
                class="boton-publicar"
                data-id="${recurso.id}"
                style="
                    padding:12px 18px;
                    border:none;
                    border-radius:8px;
                    background:#235437;
                    color:white;
                    font-weight:bold;
                    cursor:pointer;
                "
            >
                ✅ Publicar
            </button>

            <button
                type="button"
                class="boton-correcciones"
                data-id="${recurso.id}"
                style="
                    padding:12px 18px;
                    border:none;
                    border-radius:8px;
                    background:#c9a227;
                    color:#222;
                    font-weight:bold;
                    cursor:pointer;
                "
            >
                ✏️ Solicitar correcciones
            </button>

            <button
                type="button"
                class="boton-rechazar"
                data-id="${recurso.id}"
                style="
                    padding:12px 18px;
                    border:none;
                    border-radius:8px;
                    background:#9b2c2c;
                    color:white;
                    font-weight:bold;
                    cursor:pointer;
                "
            >
                ❌ Rechazar
            </button>
        `
        : ""
    }

</div>

${
    recurso.observaciones_admin
    ? `
        <div style="
            margin-top:15px;
            padding:12px;
            background:#faf4df;
            border-left:4px solid #c9a227;
            border-radius:8px;
            line-height:1.5;
        ">
            <strong>Observaciones del administrador:</strong><br>
            ${escaparHTML(recurso.observaciones_admin)}
        </div>
    `
    : ""
}

            `;

            listaRecursos.appendChild(tarjeta);
        }

        // =================================================
        // BOTONES PARA ABRIR ARCHIVOS PRIVADOS
        // =================================================

        document
            .querySelectorAll(".abrir-archivo")
            .forEach((boton) => {

                boton.addEventListener(
                    "click",
                    async () => {

                        const path =
                            boton.dataset.path;

                        if (!path) {
                            alert(
                                "Este recurso no tiene un archivo asociado."
                            );
                            return;
                        }

                        const textoOriginal =
                            boton.textContent;

                        boton.disabled = true;
                        boton.textContent =
                            "Abriendo...";

                        const {
                            data,
                            error
                        } = await supabaseClient.storage
                            .from(
                                "recursos-pedagogicos"
                            )
                            .createSignedUrl(
                                path,
                                300
                            );

                        boton.disabled = false;
                        boton.textContent =
                            textoOriginal;

                        if (error || !data?.signedUrl) {

                            console.error(error);

                            alert(
                                "No fue posible abrir el archivo."
                            );

                            return;
                        }

                        window.open(
                            data.signedUrl,
                            "_blank",
                            "noopener,noreferrer"
                        );

                    }
                );

            });
// =================================================
// PUBLICAR RECURSO
// =================================================

document
    .querySelectorAll(".boton-publicar")
    .forEach((boton) => {

        boton.addEventListener("click", async () => {

            const id = boton.dataset.id;

            const confirmar = confirm(
                "¿Deseas publicar este recurso pedagógico?"
            );

            if (!confirmar) {
                return;
            }

            boton.disabled = true;
            boton.textContent = "Publicando...";

            const {
                error
            } = await supabaseClient
                .from("recursos_pedagogicos")
                .update({
                    estado: "publicado",
                    observaciones_admin: null,
                    published_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {

                console.error(error);

                alert(
                    "No fue posible publicar el recurso: " +
                    error.message
                );

                boton.disabled = false;
                boton.textContent = "✅ Publicar";

                return;
            }

            alert(
                "El recurso fue publicado correctamente."
            );

            await cargarRecursos();

        });

    });

    // =================================================
// SOLICITAR CORRECCIONES
// =================================================

document
    .querySelectorAll(".boton-correcciones")
    .forEach((boton) => {

        boton.addEventListener("click", async () => {

            const id = boton.dataset.id;

            const observacion = prompt(
                "Escribe las correcciones que debe realizar el colaborador:"
            );

            if (observacion === null) {
                return;
            }

            if (!observacion.trim()) {
                alert(
                    "Debes escribir una observación antes de solicitar correcciones."
                );
                return;
            }

            boton.disabled = true;
            boton.textContent = "Guardando...";

            const { error } = await supabaseClient
                .from("recursos_pedagogicos")
                .update({
                    estado: "requiere_correcciones",
                    observaciones_admin: observacion.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq("id", id);

            if (error) {

                console.error(error);

                alert(
                    "No fue posible solicitar las correcciones: " +
                    error.message
                );

                boton.disabled = false;
                boton.textContent = "✏️ Solicitar correcciones";

                return;
            }

            alert(
                "Se solicitaron correcciones al colaborador."
            );

            await cargarRecursos();

        });

    });
    }

    // =====================================================
    // SEGURIDAD PARA MOSTRAR TEXTO EN HTML
    // =====================================================

    function escaparHTML(valor) {

        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }

    function escaparAtributo(valor) {
        return escaparHTML(valor);
    }

    await cargarRecursos();

});