const titulo = document.getElementById("titulo");
const autor = document.getElementById("autor");
const descripcion = document.getElementById("descripcion");
const categoria = document.getElementById("categoria");
const portada = document.getElementById("portada");
const archivo = document.getElementById("archivo");
const boton = document.getElementById("subir");
const mensaje = document.getElementById("mensaje");

const listaAdminDocumentos =
    document.getElementById("lista-admin-documentos");


/* =========================================
   ELEMENTOS DEL EDITOR
   ========================================= */

const editorDocumento =
    document.getElementById("editor-documento");

const editarId =
    document.getElementById("editar-id");

const editarTitulo =
    document.getElementById("editar-titulo");

const editarAutor =
    document.getElementById("editar-autor");

const editarDescripcion =
    document.getElementById("editar-descripcion");

const editarCategoria =
    document.getElementById("editar-categoria");

const editarPortada =
    document.getElementById("editar-portada");

const editarArchivo =
    document.getElementById("editar-archivo");

const guardarEdicion =
    document.getElementById("guardar-edicion");

const cancelarEdicion =
    document.getElementById("cancelar-edicion");

const mensajeEdicion =
    document.getElementById("mensaje-edicion");

let documentoEnEdicion = null;


/* =========================================
   LIMPIAR NOMBRE DE ARCHIVO
   ========================================= */

function limpiarNombreArchivo(nombre) {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}


/* =========================================
   SUBIR NUEVO DOCUMENTO DESDE ADMIN
   ========================================= */

boton.addEventListener("click", async () => {

    const tituloValor =
        titulo.value.trim();

    const autorValor =
        autor.value.trim();

    const descripcionValor =
        descripcion.value.trim();

    const categoriaValor =
        categoria.value;

    const portadaFile =
        portada.files[0];

    const file =
        archivo.files[0];

    mensaje.textContent = "";


    if (!tituloValor) {
        mensaje.style.color = "red";
        mensaje.textContent =
            "Escribe el título del documento.";
        return;
    }


    if (!autorValor) {
        mensaje.style.color = "red";
        mensaje.textContent =
            "Escribe el autor del documento.";
        return;
    }


    if (!file) {
        mensaje.style.color = "red";
        mensaje.textContent =
            "Selecciona un archivo.";
        return;
    }


    const limiteBytes =
        30 * 1024 * 1024;


    if (file.size > limiteBytes) {
        mensaje.style.color = "red";
        mensaje.textContent =
            "El archivo no puede superar los 30 MB.";
        return;
    }


    const {
        data: { session },
        error: errorSesion
    } =
        await supabaseClient.auth
            .getSession();


    if (errorSesion || !session) {
        mensaje.style.color = "red";
        mensaje.textContent =
            "Debes iniciar sesión para subir documentos.";
        return;
    }


    boton.disabled = true;
    boton.textContent =
        "Subiendo...";

    mensaje.style.color = "#333";
    mensaje.textContent =
        "Subiendo documento...";


    const nombreLimpio =
        limpiarNombreArchivo(
            file.name
        );


    const nombreArchivo =
        `${Date.now()}_${nombreLimpio}`;


    const rutaArchivo =
        `${session.user.id}/${nombreArchivo}`;


    /* =====================================
       SUBIR DOCUMENTO
       ===================================== */

    const { error: errorStorage } =
        await supabaseClient.storage
            .from("biblioteca")
            .upload(
                rutaArchivo,
                file,
                {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type
                }
            );


    if (errorStorage) {

        console.error(errorStorage);

        boton.disabled = false;
        boton.textContent =
            "Subir documento";

        mensaje.style.color = "red";
        mensaje.textContent =
            "No fue posible subir el archivo: " +
            errorStorage.message;

        return;
    }


    /* =====================================
       URL DEL DOCUMENTO
       ===================================== */

    const { data: datosUrl } =
        supabaseClient.storage
            .from("biblioteca")
            .getPublicUrl(
                rutaArchivo
            );


    const urlArchivo =
        datosUrl.publicUrl;


    /* =====================================
       PORTADA OPCIONAL
       ===================================== */

    let urlPortada = null;
    let rutaPortada = null;


    if (portadaFile) {

        const nombrePortada =
            `${Date.now()}_${limpiarNombreArchivo(
                portadaFile.name
            )}`;


        rutaPortada =
            `${session.user.id}/portadas/${nombrePortada}`;


        const { error: errorPortada } =
            await supabaseClient.storage
                .from("biblioteca")
                .upload(
                    rutaPortada,
                    portadaFile,
                    {
                        cacheControl: "3600",
                        upsert: false,
                        contentType:
                            portadaFile.type
                    }
                );


        if (errorPortada) {

            await supabaseClient.storage
                .from("biblioteca")
                .remove([
                    rutaArchivo
                ]);


            boton.disabled = false;
            boton.textContent =
                "Subir documento";

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "No fue posible subir la portada: " +
                errorPortada.message;

            return;
        }


        const { data: datosPortada } =
            supabaseClient.storage
                .from("biblioteca")
                .getPublicUrl(
                    rutaPortada
                );


        urlPortada =
            datosPortada.publicUrl;
    }


    /* =====================================
       GUARDAR EN TABLA
       ===================================== */

    const { error: errorTabla } =
        await supabaseClient
            .from("documentos")
            .insert({

                titulo:
                    tituloValor,

                autor:
                    autorValor,

                descripcion:
                    descripcionValor || null,

                categoria:
                    categoriaValor,

                archivo_url:
                    urlArchivo,

                archivo_nombre:
                    file.name,

                tipo_archivo:
                    file.type || "archivo",

                portada_url:
                    urlPortada,

                portada_path:
                    rutaPortada,

                usuario_id:
                    session.user.id,

                estado:
                    "aprobado",

                /*
                 * Al ser una carga directa
                 * del administrador no se
                 * considera aporte de colaborador.
                 */

                nombre_colaborador:
                    null,

                mostrar_colaborador:
                    false
            });


    if (errorTabla) {

        const borrar =
            [rutaArchivo];


        if (rutaPortada) {
            borrar.push(
                rutaPortada
            );
        }


        await supabaseClient.storage
            .from("biblioteca")
            .remove(
                borrar
            );


        boton.disabled = false;
        boton.textContent =
            "Subir documento";

        mensaje.style.color = "red";

        mensaje.textContent =
            "No fue posible registrar el documento: " +
            errorTabla.message;

        return;
    }


    boton.disabled = false;

    boton.textContent =
        "Subir documento";


    mensaje.style.color =
        "green";

    mensaje.textContent =
        "Documento subido correctamente.";


    titulo.value = "";
    autor.value = "";
    descripcion.value = "";
    categoria.selectedIndex = 0;
    portada.value = "";
    archivo.value = "";


    await cargarDocumentosAdmin();
});


/* =========================================
   CARGAR DOCUMENTOS
   ========================================= */

async function cargarDocumentosAdmin() {

    listaAdminDocumentos.innerHTML =
        "<p>Cargando documentos...</p>";


    const { data, error } =
        await supabaseClient
            .from("documentos")
            .select(`
                id,
                titulo,
                autor,
                descripcion,
                categoria,
                archivo_url,
                archivo_nombre,
                tipo_archivo,
                portada_url,
                portada_path,
                usuario_id,
                estado,
                nombre_colaborador,
                mostrar_colaborador
            `)
            .order(
                "id",
                { ascending: false }
            );


    if (error) {

        console.error(error);

        listaAdminDocumentos.innerHTML =
            `<p style="color:red;">
                No fue posible cargar los documentos:
                ${escaparHTMLAdmin(error.message)}
            </p>`;

        return;
    }


    if (!data || data.length === 0) {

        listaAdminDocumentos.innerHTML =
            "<p>No hay documentos registrados.</p>";

        return;
    }


    listaAdminDocumentos.innerHTML =
        "";

    listaAdminDocumentos.className =
        "lista-admin";


    data.forEach((documento) => {

        const item =
            document.createElement(
                "article"
            );


        item.className =
            "item-admin";


        const informacion =
            document.createElement(
                "div"
            );


        /* =================================
           TÍTULO
           ================================= */

        const tituloDocumento =
            document.createElement(
                "h3"
            );


        tituloDocumento.textContent =
            documento.titulo ||
            "Documento sin título";


        /* =================================
           AUTOR DEL DOCUMENTO
           ================================= */

        const autorDocumento =
            document.createElement(
                "p"
            );


        autorDocumento.innerHTML =
            `<strong>Autor del documento:</strong> ${
                escaparHTMLAdmin(
                    documento.autor ||
                    "No registrado"
                )
            }`;


        informacion.appendChild(
            tituloDocumento
        );


        informacion.appendChild(
            autorDocumento
        );


        /* =================================
           PERSONA QUE HIZO EL APORTE
           ================================= */

        if (documento.nombre_colaborador) {

            const subidoPor =
                document.createElement(
                    "p"
                );


            subidoPor.innerHTML =
                `<strong>Aportado por:</strong> ${
                    escaparHTMLAdmin(
                        documento.nombre_colaborador
                    )
                }`;


            informacion.appendChild(
                subidoPor
            );


            /* =============================
               AUTORIZACIÓN PÚBLICA
               ============================= */

            const autorizacion =
                document.createElement(
                    "p"
                );


            autorizacion.innerHTML =
                `<strong>Autorización para mostrar el nombre:</strong> ${
                    documento.mostrar_colaborador
                        ? "Sí"
                        : "No"
                }`;


            autorizacion.style.color =
                documento.mostrar_colaborador
                    ? "#176b37"
                    : "#9a6700";


            informacion.appendChild(
                autorizacion
            );

        } else {

            /*
             * Documentos antiguos o cargados
             * directamente por administración.
             */

            const origen =
                document.createElement(
                    "p"
                );


            origen.innerHTML =
                "<strong>Aportado por:</strong> No registrado";


            origen.style.color =
                "#777";


            informacion.appendChild(
                origen
            );
        }


        /* =================================
           DESCRIPCIÓN
           ================================= */

        const descripcionDocumento =
            document.createElement(
                "p"
            );


        descripcionDocumento.textContent =
            documento.descripcion ||
            "Sin descripción.";


        informacion.appendChild(
            descripcionDocumento
        );


        /* =================================
           DETALLES
           ================================= */

        const detalles =
            document.createElement(
                "small"
            );


        detalles.textContent =
            `${documento.categoria || "Sin categoría"} · ` +
            `${documento.archivo_nombre || "Archivo"}`;


        informacion.appendChild(
            detalles
        );


        /* =================================
           ESTADO
           ================================= */

        const estadoDocumento =
            document.createElement(
                "p"
            );


        estadoDocumento.style.fontWeight =
            "700";

        estadoDocumento.style.marginTop =
            "10px";


        if (
            documento.estado ===
            "pendiente"
        ) {

            estadoDocumento.textContent =
                "Estado: Pendiente de revisión";

            estadoDocumento.style.color =
                "#9a6700";

        }

        else if (
            documento.estado ===
            "rechazado"
        ) {

            estadoDocumento.textContent =
                "Estado: Rechazado";

            estadoDocumento.style.color =
                "#b42318";

        }

        else {

            estadoDocumento.textContent =
                "Estado: Aprobado";

            estadoDocumento.style.color =
                "#176b37";

        }


        informacion.appendChild(
            estadoDocumento
        );


        /* =================================
           ACCIONES
           ================================= */

        const acciones =
            document.createElement(
                "div"
            );


        acciones.className =
            "acciones-admin";


        /* VER */

        const botonVer =
            document.createElement(
                "a"
            );


        botonVer.href =
            documento.archivo_url;

        botonVer.target =
            "_blank";

        botonVer.rel =
            "noopener noreferrer";

        botonVer.textContent =
            "Ver";

        botonVer.className =
            "btn-ver-admin";


        acciones.appendChild(
            botonVer
        );


        /* EDITAR */

        const botonEditar =
            document.createElement(
                "button"
            );


        botonEditar.type =
            "button";

        botonEditar.textContent =
            "Editar";

        botonEditar.className =
            "btn-editar-admin";


        botonEditar.addEventListener(
            "click",
            () => {

                abrirEditorDocumento(
                    documento
                );

            }
        );


        acciones.appendChild(
            botonEditar
        );


        /* =================================
           APROBAR
           ================================= */

        if (
            documento.estado !==
            "aprobado"
        ) {

            const botonAprobar =
                document.createElement(
                    "button"
                );


            botonAprobar.type =
                "button";

            botonAprobar.textContent =
                "Aprobar";

            botonAprobar.style.background =
                "#176b37";

            botonAprobar.style.color =
                "white";

            botonAprobar.style.border =
                "none";

            botonAprobar.style.padding =
                "9px 14px";

            botonAprobar.style.borderRadius =
                "7px";

            botonAprobar.style.cursor =
                "pointer";


            botonAprobar.addEventListener(
                "click",
                async () => {

                    await cambiarEstadoDocumento(
                        documento.id,
                        "aprobado",
                        botonAprobar
                    );

                }
            );


            acciones.appendChild(
                botonAprobar
            );
        }


        /* =================================
           RECHAZAR
           ================================= */

        if (
            documento.estado !==
            "rechazado"
        ) {

            const botonRechazar =
                document.createElement(
                    "button"
                );


            botonRechazar.type =
                "button";

            botonRechazar.textContent =
                "Rechazar";

            botonRechazar.style.background =
                "#b42318";

            botonRechazar.style.color =
                "white";

            botonRechazar.style.border =
                "none";

            botonRechazar.style.padding =
                "9px 14px";

            botonRechazar.style.borderRadius =
                "7px";

            botonRechazar.style.cursor =
                "pointer";


            botonRechazar.addEventListener(
                "click",
                async () => {

                    await cambiarEstadoDocumento(
                        documento.id,
                        "rechazado",
                        botonRechazar
                    );

                }
            );


            acciones.appendChild(
                botonRechazar
            );
        }


        /* =================================
           ELIMINAR
           ================================= */

        const botonEliminar =
            document.createElement(
                "button"
            );


        botonEliminar.type =
            "button";

        botonEliminar.textContent =
            "Eliminar";

        botonEliminar.className =
            "btn-eliminar";


        botonEliminar.addEventListener(
            "click",
            async () => {

                await eliminarDocumento(
                    documento,
                    botonEliminar
                );

            }
        );


        acciones.appendChild(
            botonEliminar
        );


        item.appendChild(
            informacion
        );

        item.appendChild(
            acciones
        );


        listaAdminDocumentos.appendChild(
            item
        );
    });
}


/* =========================================
   APROBAR / RECHAZAR DOCUMENTO
   ========================================= */

async function cambiarEstadoDocumento(
    idDocumento,
    nuevoEstado,
    botonEstado
) {

    const textoOriginal =
        botonEstado.textContent;


    botonEstado.disabled =
        true;


    botonEstado.textContent =
        nuevoEstado === "aprobado"
            ? "Aprobando..."
            : "Rechazando...";


    const { error } =
        await supabaseClient
            .from("documentos")
            .update({
                estado:
                    nuevoEstado
            })
            .eq(
                "id",
                idDocumento
            );


    if (error) {

        console.error(error);

        botonEstado.disabled =
            false;

        botonEstado.textContent =
            textoOriginal;


        alert(
            "No fue posible cambiar el estado: " +
            error.message
        );

        return;
    }


    mensaje.style.color =
        "green";


    mensaje.textContent =
        nuevoEstado === "aprobado"
            ? "Documento aprobado correctamente."
            : "Documento rechazado correctamente.";


    await cargarDocumentosAdmin();
}


/* =========================================
   ABRIR EDITOR
   ========================================= */

function abrirEditorDocumento(
    documento
) {

    documentoEnEdicion =
        documento;


    editarId.value =
        documento.id;


    editarTitulo.value =
        documento.titulo || "";


    editarAutor.value =
        documento.autor || "";


    editarDescripcion.value =
        documento.descripcion || "";


    editarCategoria.value =
        documento.categoria || "Otros";


    editarPortada.value = "";
    editarArchivo.value = "";


    mensajeEdicion.textContent =
        "";


    editorDocumento.style.display =
        "block";


    editorDocumento.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* =========================================
   CANCELAR EDICIÓN
   ========================================= */

cancelarEdicion.addEventListener(
    "click",
    () => {

        cerrarEditor();

    }
);


function cerrarEditor() {

    documentoEnEdicion =
        null;


    editorDocumento.style.display =
        "none";


    editarId.value = "";
    editarTitulo.value = "";
    editarAutor.value = "";
    editarDescripcion.value = "";
    editarPortada.value = "";
    editarArchivo.value = "";


    mensajeEdicion.textContent =
        "";
}


/* =========================================
   GUARDAR EDICIÓN COMPLETA
   ========================================= */

guardarEdicion.addEventListener(
    "click",
    async () => {

        if (!documentoEnEdicion) {
            return;
        }


        const nuevoTitulo =
            editarTitulo.value.trim();


        const nuevoAutor =
            editarAutor.value.trim();


        const nuevaDescripcion =
            editarDescripcion.value.trim();


        const nuevaCategoria =
            editarCategoria.value;


        const nuevaPortadaFile =
            editarPortada.files[0];


        const nuevoArchivoFile =
            editarArchivo.files[0];


        if (!nuevoTitulo) {

            mensajeEdicion.style.color =
                "red";

            mensajeEdicion.textContent =
                "El título es obligatorio.";

            return;
        }


        if (!nuevoAutor) {

            mensajeEdicion.style.color =
                "red";

            mensajeEdicion.textContent =
                "El autor es obligatorio.";

            return;
        }


        if (
            nuevoArchivoFile &&
            nuevoArchivoFile.size >
                30 * 1024 * 1024
        ) {

            mensajeEdicion.style.color =
                "red";

            mensajeEdicion.textContent =
                "El nuevo archivo no puede superar los 30 MB.";

            return;
        }


        const {
            data: { session },
            error: errorSesion
        } =
            await supabaseClient.auth
                .getSession();


        if (
            errorSesion ||
            !session
        ) {

            mensajeEdicion.style.color =
                "red";

            mensajeEdicion.textContent =
                "Debes iniciar sesión.";

            return;
        }


        guardarEdicion.disabled =
            true;


        guardarEdicion.textContent =
            "Guardando...";


        mensajeEdicion.style.color =
            "#333";


        mensajeEdicion.textContent =
            "Guardando cambios...";


        let nuevaUrlPortada =
            documentoEnEdicion.portada_url;


        let nuevaRutaPortada =
            documentoEnEdicion.portada_path;


        let nuevaUrlArchivo =
            documentoEnEdicion.archivo_url;


        let nuevoNombreArchivo =
            documentoEnEdicion.archivo_nombre;


        let nuevoTipoArchivo =
            documentoEnEdicion.tipo_archivo;


        let rutaPortadaNuevaSubida =
            null;


        let rutaArchivoNuevoSubido =
            null;


        /* =================================
           NUEVA PORTADA
           ================================= */

        if (nuevaPortadaFile) {

            const nombrePortada =
                `${Date.now()}_${limpiarNombreArchivo(
                    nuevaPortadaFile.name
                )}`;


            rutaPortadaNuevaSubida =
                `${session.user.id}/portadas/${nombrePortada}`;


            const { error: errorPortada } =
                await supabaseClient.storage
                    .from("biblioteca")
                    .upload(
                        rutaPortadaNuevaSubida,
                        nuevaPortadaFile,
                        {
                            cacheControl:
                                "3600",

                            upsert:
                                false,

                            contentType:
                                nuevaPortadaFile.type
                        }
                    );


            if (errorPortada) {

                restaurarBotonEdicion();


                mensajeEdicion.style.color =
                    "red";


                mensajeEdicion.textContent =
                    "No fue posible subir la nueva portada: " +
                    errorPortada.message;


                return;
            }


            const { data: datosPortada } =
                supabaseClient.storage
                    .from("biblioteca")
                    .getPublicUrl(
                        rutaPortadaNuevaSubida
                    );


            nuevaUrlPortada =
                datosPortada.publicUrl;


            nuevaRutaPortada =
                rutaPortadaNuevaSubida;
        }


        /* =================================
           NUEVO DOCUMENTO
           ================================= */

        if (nuevoArchivoFile) {

            const nombreArchivoNuevo =
                `${Date.now()}_${limpiarNombreArchivo(
                    nuevoArchivoFile.name
                )}`;


            rutaArchivoNuevoSubido =
                `${session.user.id}/${nombreArchivoNuevo}`;


            const { error: errorArchivo } =
                await supabaseClient.storage
                    .from("biblioteca")
                    .upload(
                        rutaArchivoNuevoSubido,
                        nuevoArchivoFile,
                        {
                            cacheControl:
                                "3600",

                            upsert:
                                false,

                            contentType:
                                nuevoArchivoFile.type
                        }
                    );


            if (errorArchivo) {

                if (
                    rutaPortadaNuevaSubida
                ) {

                    await supabaseClient.storage
                        .from("biblioteca")
                        .remove([
                            rutaPortadaNuevaSubida
                        ]);

                }


                restaurarBotonEdicion();


                mensajeEdicion.style.color =
                    "red";


                mensajeEdicion.textContent =
                    "No fue posible subir el nuevo documento: " +
                    errorArchivo.message;


                return;
            }


            const { data: datosArchivo } =
                supabaseClient.storage
                    .from("biblioteca")
                    .getPublicUrl(
                        rutaArchivoNuevoSubido
                    );


            nuevaUrlArchivo =
                datosArchivo.publicUrl;


            nuevoNombreArchivo =
                nuevoArchivoFile.name;


            nuevoTipoArchivo =
                nuevoArchivoFile.type ||
                "archivo";
        }


        /* =================================
           ACTUALIZAR BASE DE DATOS
           ================================= */

        const { error: errorActualizar } =
            await supabaseClient
                .from("documentos")
                .update({

                    titulo:
                        nuevoTitulo,

                    autor:
                        nuevoAutor,

                    descripcion:
                        nuevaDescripcion ||
                        null,

                    categoria:
                        nuevaCategoria,

                    portada_url:
                        nuevaUrlPortada ||
                        null,

                    portada_path:
                        nuevaRutaPortada ||
                        null,

                    archivo_url:
                        nuevaUrlArchivo,

                    archivo_nombre:
                        nuevoNombreArchivo,

                    tipo_archivo:
                        nuevoTipoArchivo

                })
                .eq(
                    "id",
                    documentoEnEdicion.id
                );


        if (errorActualizar) {

            const archivosNuevos =
                [];


            if (
                rutaPortadaNuevaSubida
            ) {

                archivosNuevos.push(
                    rutaPortadaNuevaSubida
                );

            }


            if (
                rutaArchivoNuevoSubido
            ) {

                archivosNuevos.push(
                    rutaArchivoNuevoSubido
                );

            }


            if (
                archivosNuevos.length
            ) {

                await supabaseClient.storage
                    .from("biblioteca")
                    .remove(
                        archivosNuevos
                    );

            }


            restaurarBotonEdicion();


            mensajeEdicion.style.color =
                "red";


            mensajeEdicion.textContent =
                "No fue posible guardar los cambios: " +
                errorActualizar.message;


            return;
        }


        /* =================================
           BORRAR PORTADA ANTERIOR
           ================================= */

        if (
            nuevaPortadaFile &&
            documentoEnEdicion.portada_path
        ) {

            await supabaseClient.storage
                .from("biblioteca")
                .remove([
                    documentoEnEdicion
                        .portada_path
                ]);

        }


        /* =================================
           BORRAR ARCHIVO ANTERIOR
           ================================= */

        if (nuevoArchivoFile) {

            const rutaAnterior =
                obtenerRutaStorage(
                    documentoEnEdicion
                        .archivo_url
                );


            if (rutaAnterior) {

                await supabaseClient.storage
                    .from("biblioteca")
                    .remove([
                        rutaAnterior
                    ]);

            }
        }


        restaurarBotonEdicion();


        mensaje.style.color =
            "green";


        mensaje.textContent =
            "Documento actualizado correctamente.";


        cerrarEditor();


        await cargarDocumentosAdmin();
    }
);


/* =========================================
   RESTAURAR BOTÓN DE EDICIÓN
   ========================================= */

function restaurarBotonEdicion() {

    guardarEdicion.disabled =
        false;


    guardarEdicion.textContent =
        "Guardar cambios";
}


/* =========================================
   ELIMINAR DOCUMENTO
   ========================================= */

async function eliminarDocumento(
    documento,
    botonEliminar
) {

    const confirmar =
        window.confirm(
            `¿Estás seguro de eliminar "${documento.titulo}"?`
        );


    if (!confirmar) {
        return;
    }


    const rutaArchivo =
        obtenerRutaStorage(
            documento.archivo_url
        );


    if (!rutaArchivo) {

        alert(
            "No fue posible identificar la ruta del archivo."
        );

        return;
    }


    botonEliminar.disabled =
        true;


    botonEliminar.textContent =
        "Eliminando...";


    const archivosAEliminar =
        [rutaArchivo];


    if (
        documento.portada_path
    ) {

        archivosAEliminar.push(
            documento.portada_path
        );

    }


    const { error: errorStorage } =
        await supabaseClient.storage
            .from("biblioteca")
            .remove(
                archivosAEliminar
            );


    if (errorStorage) {

        console.error(
            errorStorage
        );


        botonEliminar.disabled =
            false;


        botonEliminar.textContent =
            "Eliminar";


        alert(
            "No fue posible eliminar el archivo: " +
            errorStorage.message
        );


        return;
    }


    const { error: errorTabla } =
        await supabaseClient
            .from("documentos")
            .delete()
            .eq(
                "id",
                documento.id
            );


    if (errorTabla) {

        botonEliminar.disabled =
            false;


        botonEliminar.textContent =
            "Eliminar";


        alert(
            "El archivo fue eliminado, pero no se pudo eliminar el registro: " +
            errorTabla.message
        );


        return;
    }


    mensaje.style.color =
        "green";


    mensaje.textContent =
        "Documento eliminado correctamente.";


    await cargarDocumentosAdmin();
}


/* =========================================
   OBTENER RUTA DE STORAGE
   ========================================= */

function obtenerRutaStorage(
    urlArchivo
) {

    try {

        const url =
            new URL(
                urlArchivo
            );


        const marcador =
            "/storage/v1/object/public/biblioteca/";


        const posicion =
            url.pathname.indexOf(
                marcador
            );


        if (
            posicion === -1
        ) {
            return null;
        }


        const rutaCodificada =
            url.pathname.substring(
                posicion +
                marcador.length
            );


        return decodeURIComponent(
            rutaCodificada
        );


    } catch (error) {

        console.error(
            "URL de archivo inválida:",
            error
        );


        return null;
    }
}


/* =========================================
   ESCAPAR HTML
   ========================================= */

function escaparHTMLAdmin(
    texto
) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.textContent =
        texto || "";


    return elemento.innerHTML;
}


/* =========================================
   INICIAR
   ========================================= */

cargarDocumentosAdmin();