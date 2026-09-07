const contenedor =
    document.getElementById("lista-documentos");


/* =========================================
   CARGAR DOCUMENTOS APROBADOS
   ========================================= */

async function cargarDocumentos() {

    contenedor.innerHTML =
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
                nombre_colaborador,
                mostrar_colaborador,
                created_at
            `)
            .eq(
                "estado",
                "aprobado"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Error al cargar documentos:",
            error
        );

        contenedor.innerHTML = `
            <p class="mensaje-error">
                No fue posible cargar los documentos:
                ${escaparHTML(error.message)}
            </p>
        `;

        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        contenedor.innerHTML = `
            <p>
                Todavía no hay documentos publicados
                en la biblioteca.
            </p>
        `;

        return;
    }


    const documentosPorCategoria =
        agruparPorCategoria(data);


    contenedor.innerHTML =
        "";


    Object.entries(
        documentosPorCategoria
    ).forEach(
        ([categoria, documentos]) => {

            const seccion =
                document.createElement(
                    "section"
                );


            seccion.className =
                "categoria-documentos";


            const tituloCategoria =
                document.createElement(
                    "h3"
                );


            tituloCategoria.textContent =
                categoria ||
                "Otros";


            const grid =
                document.createElement(
                    "div"
                );


            grid.className =
                "documentos-grid";


            documentos.forEach(
                (documento) => {

                    grid.appendChild(
                        crearTarjetaDocumento(
                            documento
                        )
                    );

                }
            );


            seccion.appendChild(
                tituloCategoria
            );


            seccion.appendChild(
                grid
            );


            contenedor.appendChild(
                seccion
            );
        }
    );
}


/* =========================================
   AGRUPAR POR CATEGORÍA
   ========================================= */

function agruparPorCategoria(
    documentos
) {

    return documentos.reduce(
        (grupos, documento) => {

            const categoria =
                documento.categoria ||
                "Otros";


            if (!grupos[categoria]) {
                grupos[categoria] =
                    [];
            }


            grupos[categoria].push(
                documento
            );


            return grupos;

        },
        {}
    );
}


/* =========================================
   CREAR TARJETA
   ========================================= */

function crearTarjetaDocumento(
    documento
) {

    const tarjeta =
        document.createElement(
            "article"
        );


    tarjeta.className =
        "documento-card";


    const descripcion =
        documento.descripcion?.trim() ||
        "Documento disponible para consulta.";


    const autor =
        documento.autor?.trim() ||
        "Autor no registrado";


    /* =====================================
       PERSONA QUE APORTÓ EL DOCUMENTO
       ===================================== */

    let aporteColaborador =
        "";


    if (
        documento.mostrar_colaborador === true &&
        documento.nombre_colaborador?.trim()
    ) {

        aporteColaborador = `
            <p
                class="documento-aportado-por"
                style="
                    margin: 4px 0 10px;
                    font-size: 14px;
                    color: #666;
                "
            >
                <strong>Aportado por:</strong>
                ${escaparHTML(
                    documento.nombre_colaborador.trim()
                )}
            </p>
        `;

    }


    /* =====================================
       PORTADA
       ===================================== */

    const portada =
        documento.portada_url
            ? `
                <img
                    src="${escaparHTML(documento.portada_url)}"
                    alt="Portada de ${escaparHTML(
                        documento.titulo ||
                        "documento"
                    )}"
                    class="documento-portada"
                    loading="lazy"
                >
            `
            : `
                <div
                    class="
                        documento-portada
                        documento-portada-generica
                    "
                >
                    <span>
                        📚
                    </span>

                    <small>
                        Sin portada
                    </small>
                </div>
            `;


    /* =====================================
       CONTENIDO DE LA TARJETA
       ===================================== */

    tarjeta.innerHTML = `

        <a
            href="${escaparHTML(
                documento.archivo_url
            )}"
            target="_blank"
            rel="noopener noreferrer"
            class="documento-portada-enlace"
            aria-label="Leer ${escaparHTML(
                documento.titulo ||
                "documento"
            )}"
        >
            ${portada}
        </a>


        <div class="documento-contenido">

            <h4>
                ${escaparHTML(
                    documento.titulo ||
                    "Documento sin título"
                )}
            </h4>


            <p class="documento-autor">
                ${escaparHTML(
                    autor
                )}
            </p>


            ${aporteColaborador}


            <p class="documento-descripcion">
                ${escaparHTML(
                    descripcion
                )}
            </p>


            <a
                href="${escaparHTML(
                    documento.archivo_url
                )}"
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


/* =========================================
   OBTENER ICONO
   ========================================= */

function obtenerIcono(
    tipoArchivo = ""
) {

    if (
        tipoArchivo.includes(
            "pdf"
        )
    ) {
        return "📕";
    }


    if (
        tipoArchivo.includes(
            "word"
        )
    ) {
        return "📘";
    }


    if (
        tipoArchivo.includes(
            "image"
        )
    ) {
        return "🖼️";
    }


    if (
        tipoArchivo.includes(
            "audio"
        )
    ) {
        return "🎵";
    }


    if (
        tipoArchivo.includes(
            "video"
        )
    ) {
        return "🎥";
    }


    return "📄";
}


/* =========================================
   ESCAPAR HTML
   ========================================= */

function escaparHTML(
    texto
) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.textContent =
        texto ?? "";


    return elemento.innerHTML;
}


/* =========================================
   INICIAR
   ========================================= */

cargarDocumentos();