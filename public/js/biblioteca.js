const contenedor = document.getElementById("lista-documentos");

async function cargarDocumentos() {
    contenedor.innerHTML = "<p>Cargando documentos...</p>";

    const { data, error } = await supabaseClient
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
    created_at
`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error al cargar documentos:", error);

        contenedor.innerHTML = `
            <p class="mensaje-error">
                No fue posible cargar los documentos: ${error.message}
            </p>
        `;
        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML = `
            <p>Todavía no hay documentos publicados en la biblioteca.</p>
        `;
        return;
    }

    const documentosPorCategoria = agruparPorCategoria(data);

    contenedor.innerHTML = "";

    Object.entries(documentosPorCategoria).forEach(([categoria, documentos]) => {
        const seccion = document.createElement("section");
        seccion.className = "categoria-documentos";

        const tituloCategoria = document.createElement("h3");
        tituloCategoria.textContent = categoria || "Otros";

        const grid = document.createElement("div");
        grid.className = "documentos-grid";

        documentos.forEach((documento) => {
            grid.appendChild(crearTarjetaDocumento(documento));
        });

        seccion.appendChild(tituloCategoria);
        seccion.appendChild(grid);
        contenedor.appendChild(seccion);
    });
}

function agruparPorCategoria(documentos) {
    return documentos.reduce((grupos, documento) => {
        const categoria = documento.categoria || "Otros";

        if (!grupos[categoria]) {
            grupos[categoria] = [];
        }

        grupos[categoria].push(documento);

        return grupos;
    }, {});
}

function crearTarjetaDocumento(documento) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "documento-card";

    const descripcion =
        documento.descripcion?.trim() ||
        "Documento disponible para consulta.";

    const autor =
        documento.autor?.trim() ||
        "Autor no registrado";

    const portada = documento.portada_url
        ? `
            <img
                src="${documento.portada_url}"
                alt="Portada de ${escaparHTML(documento.titulo || "documento")}"
                class="documento-portada"
                loading="lazy"
            >
        `
        : `
            <div class="documento-portada documento-portada-generica">
                <span>📚</span>
                <small>Sin portada</small>
            </div>
        `;

    tarjeta.innerHTML = `
        <a
            href="${documento.archivo_url}"
            target="_blank"
            rel="noopener noreferrer"
            class="documento-portada-enlace"
            aria-label="Leer ${escaparHTML(documento.titulo || "documento")}"
        >
            ${portada}
        </a>

        <div class="documento-contenido">
            <h4>
                ${escaparHTML(documento.titulo || "Documento sin título")}
            </h4>

            <p class="documento-autor">
                ${escaparHTML(autor)}
            </p>

            <p class="documento-descripcion">
                ${escaparHTML(descripcion)}
            </p>

            <a
                href="${documento.archivo_url}"
                target="_blank"
                rel="noopener noreferrer"
                class="documento-boton"
            >
                Leer documento
            </a>
        </div>
    `;

    return tarjeta;
}

function obtenerIcono(tipoArchivo = "") {
    if (tipoArchivo.includes("pdf")) {
        return "📕";
    }

    if (tipoArchivo.includes("word")) {
        return "📘";
    }

    if (tipoArchivo.includes("image")) {
        return "🖼️";
    }

    if (tipoArchivo.includes("audio")) {
        return "🎵";
    }

    if (tipoArchivo.includes("video")) {
        return "🎥";
    }

    return "📄";
}

function escaparHTML(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = texto;
    return elemento.innerHTML;
}

cargarDocumentos();