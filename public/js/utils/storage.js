export function limpiarNombreArchivo(nombre) {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function validarArchivo(archivo, limiteMB = 20) {
    if (!archivo) {
        return {
            valido: false,
            mensaje: "Debes seleccionar un archivo."
        };
    }

    const limiteBytes = limiteMB * 1024 * 1024;

    if (archivo.size > limiteBytes) {
        return {
            valido: false,
            mensaje: `El archivo no puede superar los ${limiteMB} MB.`
        };
    }

    return {
        valido: true,
        mensaje: ""
    };
}

export async function subirArchivo({
    supabaseClient,
    bucket,
    archivo,
    usuarioId,
    limiteMB = 20
}) {
    const validacion = validarArchivo(archivo, limiteMB);

    if (!validacion.valido) {
        throw new Error(validacion.mensaje);
    }

    if (!supabaseClient) {
        throw new Error("No se encontró la conexión con Supabase.");
    }

    if (!bucket) {
        throw new Error("No se indicó el bucket de almacenamiento.");
    }

    if (!usuarioId) {
        throw new Error("No se encontró el usuario autenticado.");
    }

    const nombreLimpio = limpiarNombreArchivo(archivo.name);
    const nombreUnico = `${Date.now()}_${nombreLimpio}`;
    const rutaArchivo = `${usuarioId}/${nombreUnico}`;

    const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(rutaArchivo, archivo, {
            cacheControl: "3600",
            upsert: false,
            contentType: archivo.type || undefined
        });

    if (error) {
        throw new Error(error.message);
    }

    const { data: datosUrl } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(rutaArchivo);

    return {
        ruta: rutaArchivo,
        urlPublica: datosUrl.publicUrl,
        nombreOriginal: archivo.name,
        tipoArchivo: archivo.type || "archivo"
    };
}

export async function eliminarArchivo({
    supabaseClient,
    bucket,
    rutaArchivo
}) {
    if (!supabaseClient || !bucket || !rutaArchivo) {
        throw new Error(
            "Faltan datos para eliminar el archivo."
        );
    }

    const { error } = await supabaseClient.storage
        .from(bucket)
        .remove([rutaArchivo]);

    if (error) {
        throw new Error(error.message);
    }

    return true;
}

export function obtenerRutaDesdeUrl(urlArchivo, bucket) {
    if (!urlArchivo || !bucket) {
        return null;
    }

    try {
        const url = new URL(urlArchivo);

        const marcador =
            `/storage/v1/object/public/${bucket}/`;

        const posicion = url.pathname.indexOf(marcador);

        if (posicion === -1) {
            return null;
        }

        const rutaCodificada = url.pathname.substring(
            posicion + marcador.length
        );

        return decodeURIComponent(rutaCodificada);
    } catch (error) {
        console.error("URL de archivo inválida:", error);
        return null;
    }
}