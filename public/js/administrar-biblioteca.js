const titulo = document.getElementById("titulo");
const descripcion = document.getElementById("descripcion");
const categoria = document.getElementById("categoria");
const archivo = document.getElementById("archivo");
const boton = document.getElementById("subir");
const mensaje = document.getElementById("mensaje");

function limpiarNombreArchivo(nombre) {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

boton.addEventListener("click", async () => {
    const tituloValor = titulo.value.trim();
    const descripcionValor = descripcion.value.trim();
    const categoriaValor = categoria.value;
    const file = archivo.files[0];

    mensaje.textContent = "";

    if (!tituloValor) {
        mensaje.style.color = "red";
        mensaje.textContent = "Escribe el título del documento.";
        return;
    }

    if (!file) {
        mensaje.style.color = "red";
        mensaje.textContent = "Selecciona un archivo.";
        return;
    }

    const limiteBytes = 20 * 1024 * 1024;

    if (file.size > limiteBytes) {
        mensaje.style.color = "red";
        mensaje.textContent = "El archivo no puede superar los 20 MB.";
        return;
    }

    const {
        data: { session },
        error: errorSesion
    } = await supabaseClient.auth.getSession();

    if (errorSesion || !session) {
        mensaje.style.color = "red";
        mensaje.textContent = "Debes iniciar sesión para subir documentos.";
        return;
    }

    boton.disabled = true;
    boton.textContent = "Subiendo...";
    mensaje.style.color = "#333";
    mensaje.textContent = "Subiendo documento...";

    const nombreLimpio = limpiarNombreArchivo(file.name);
    const nombreArchivo = `${Date.now()}_${nombreLimpio}`;

    const rutaArchivo = `${session.user.id}/${nombreArchivo}`;

    // 1. Subir el archivo al bucket biblioteca
    const { error: errorStorage } = await supabaseClient.storage
        .from("biblioteca")
        .upload(rutaArchivo, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
        });

    if (errorStorage) {
        console.error("Error al subir el archivo:", errorStorage);

        boton.disabled = false;
        boton.textContent = "Subir documento";

        mensaje.style.color = "red";
        mensaje.textContent =
            "No fue posible subir el archivo: " + errorStorage.message;

        return;
    }

    // 2. Obtener la URL pública
    const { data: datosUrl } = supabaseClient.storage
        .from("biblioteca")
        .getPublicUrl(rutaArchivo);

    const urlArchivo = datosUrl.publicUrl;

    // 3. Guardar la información en la tabla documentos
    const { error: errorTabla } = await supabaseClient
        .from("documentos")
        .insert({
            titulo: tituloValor,
            descripcion: descripcionValor || null,
            categoria: categoriaValor,
            archivo_url: urlArchivo,
            archivo_nombre: file.name,
            tipo_archivo: file.type || "archivo",
            usuario_id: session.user.id
        });

    if (errorTabla) {
        console.error("Error al registrar el documento:", errorTabla);

        // Elimina el archivo si falló el registro en la tabla
        await supabaseClient.storage
            .from("biblioteca")
            .remove([rutaArchivo]);

        boton.disabled = false;
        boton.textContent = "Subir documento";

        mensaje.style.color = "red";
        mensaje.textContent =
            "No fue posible registrar el documento: " +
            errorTabla.message;

        return;
    }

    boton.disabled = false;
    boton.textContent = "Subir documento";

    mensaje.style.color = "green";
    mensaje.textContent = "Documento subido correctamente.";

    titulo.value = "";
    descripcion.value = "";
    categoria.selectedIndex = 0;
    archivo.value = "";

await cargarDocumentosAdmin();
}); const listaAdminDocumentos = document.getElementById(
    "lista-admin-documentos"
);

async function cargarDocumentosAdmin() {
    listaAdminDocumentos.innerHTML =
        "<p>Cargando documentos...</p>";

    const { data, error } = await supabaseClient
        .from("documentos")
        .select(`
            id,
            titulo,
            descripcion,
            categoria,
            archivo_url,
            archivo_nombre
        `)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error al cargar documentos:", error);

        listaAdminDocumentos.innerHTML = `
            <p style="color:red;">
                No fue posible cargar los documentos:
                ${escaparHTMLAdmin(error.message)}
            </p>
        `;

        return;
    }

    if (!data || data.length === 0) {
        listaAdminDocumentos.innerHTML =
            "<p>No hay documentos publicados.</p>";

        return;
    }

    listaAdminDocumentos.innerHTML = "";
    listaAdminDocumentos.className = "lista-admin";

    data.forEach((documento) => {
        const item = document.createElement("article");
        item.className = "item-admin";

        const informacion = document.createElement("div");

        const tituloDocumento = document.createElement("h3");
        tituloDocumento.textContent =
            documento.titulo || "Documento sin título";

        const descripcionDocumento = document.createElement("p");
        descripcionDocumento.textContent =
            documento.descripcion ||
            "Sin descripción.";

        const detalles = document.createElement("small");
        detalles.textContent =
            `${documento.categoria || "Sin categoría"} · ` +
            `${documento.archivo_nombre || "Archivo"}`;

        informacion.appendChild(tituloDocumento);
        informacion.appendChild(descripcionDocumento);
        informacion.appendChild(detalles);

        const acciones = document.createElement("div");
        acciones.className = "acciones-admin";

        const botonVer = document.createElement("a");
        botonVer.href = documento.archivo_url;
        botonVer.target = "_blank";
        botonVer.rel = "noopener noreferrer";
        botonVer.textContent = "Ver";
        botonVer.className = "btn-ver-admin";

        const botonEliminar = document.createElement("button");
        botonEliminar.type = "button";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.className = "btn-eliminar";

        botonEliminar.addEventListener("click", async () => {
            await eliminarDocumento(documento, botonEliminar);
        });

        acciones.appendChild(botonVer);
        acciones.appendChild(botonEliminar);

        item.appendChild(informacion);
        item.appendChild(acciones);

        listaAdminDocumentos.appendChild(item);
    });
}

async function eliminarDocumento(documento, botonEliminar) {
    const confirmar = window.confirm(
        `¿Estás seguro de eliminar "${documento.titulo}"?`
    );

    if (!confirmar) {
        return;
    }

    const rutaArchivo = obtenerRutaStorage(
        documento.archivo_url
    );

    if (!rutaArchivo) {
        alert(
            "No fue posible identificar la ruta del archivo."
        );
        return;
    }

    botonEliminar.disabled = true;
    botonEliminar.textContent = "Eliminando...";

    const { error: errorStorage } =
        await supabaseClient.storage
            .from("biblioteca")
            .remove([rutaArchivo]);

    if (errorStorage) {
        console.error(
            "Error al eliminar de Storage:",
            errorStorage
        );

        botonEliminar.disabled = false;
        botonEliminar.textContent = "Eliminar";

        alert(
            "No fue posible eliminar el archivo: " +
            errorStorage.message
        );

        return;
    }

    const { error: errorTabla } = await supabaseClient
        .from("documentos")
        .delete()
        .eq("id", documento.id);

    if (errorTabla) {
        console.error(
            "Error al eliminar el registro:",
            errorTabla
        );

        botonEliminar.disabled = false;
        botonEliminar.textContent = "Eliminar";

        alert(
            "El archivo fue eliminado, pero no se pudo " +
            "eliminar el registro: " +
            errorTabla.message
        );

        return;
    }

    mensaje.style.color = "green";
    mensaje.textContent =
        "Documento eliminado correctamente.";

    await cargarDocumentosAdmin();
}

function obtenerRutaStorage(urlArchivo) {
    try {
        const url = new URL(urlArchivo);

        const marcador =
            "/storage/v1/object/public/biblioteca/";

        const posicion = url.pathname.indexOf(marcador);

        if (posicion === -1) {
            return null;
        }

        const rutaCodificada = url.pathname.substring(
            posicion + marcador.length
        );

        return decodeURIComponent(rutaCodificada);
    } catch (error) {
        console.error(
            "URL de archivo inválida:",
            error
        );

        return null;
    }
}

function escaparHTMLAdmin(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = texto || "";
    return elemento.innerHTML;
}

cargarDocumentosAdmin();