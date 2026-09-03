document.addEventListener("DOMContentLoaded", () => {

    const inputBusqueda = document.getElementById("textoBusqueda");
    const btnBuscar = document.getElementById("btnBuscar");
    const resultados = document.getElementById("resultadosBusqueda");
    const resumen = document.getElementById("resumenResultados");

    const botonesFiltro = document.querySelectorAll(".filtro");

let resultadosActuales = [];
let filtroActivo = "todos";

    async function buscarArticulos() {

        const termino = inputBusqueda.value.trim();

        if (!termino) {
            resultados.innerHTML = `
                <div class="estado-buscador">
                    Escribe una palabra o tema para comenzar la búsqueda.
                </div>
            `;
            resumen.textContent = "";
            return;
        }

        resultados.innerHTML = `
            <div class="estado-buscador">
                Buscando...
            </div>
        `;

        try {

            const { data: articulos, error: errorArticulos } =
                await supabaseClient
                    .from("articulos")
                    .select(`
                        id,
                        titulo,
                        tipo,
                        categoria,
                        descripcion_corta,
                        contenido
                    `)
                    .eq("estado", "publicado")
                    .or(
                        `titulo.ilike.%${termino}%,descripcion_corta.ilike.%${termino}%,contenido.ilike.%${termino}%,categoria.ilike.%${termino}%`
                    );

            if (errorArticulos) {
                throw errorArticulos;
            }

            const { data: personajes, error: errorPersonajes } =
                await supabaseClient
                    .from("personajes")
                    .select(`
                        id,
                        nombre,
                        descripcion_corta,
                        biografia,
                        categoria
                    `)
                    .or(
                        `nombre.ilike.%${termino}%,descripcion_corta.ilike.%${termino}%,biografia.ilike.%${termino}%,categoria.ilike.%${termino}%`
                    );

            if (errorPersonajes) {
                throw errorPersonajes;
            }
// Buscar documentos de la Biblioteca Digital
const { data: documentos, error: errorDocumentos } =
    await supabaseClient
        .from("documentos")
        .select(`
            id,
            titulo,
            descripcion,
            categoria,
            archivo_url,
            archivo_nombre,
            tipo_archivo
        `)
        .or(
            `titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%,categoria.ilike.%${termino}%,archivo_nombre.ilike.%${termino}%`
        );

if (errorDocumentos) {
    throw errorDocumentos;
}
// Buscar lugares de patrimonio aprobados
const { data: lugares, error: errorLugares } =
    await supabaseClient
        .from("lugares")
        .select(`
            id,
            nombre,
            categoria,
            descripcion,
            direccion
        `)
        .eq("estado", "aprobado")
        .or(
            `nombre.ilike.%${termino}%,categoria.ilike.%${termino}%,descripcion.ilike.%${termino}%,direccion.ilike.%${termino}%`
        );

if (errorLugares) {
    throw errorLugares;
}
const { data: recursos, error: errorRecursos } = await supabaseClient
    .from("recursos_pedagogicos")
    .select(`
    id,
    titulo,
    descripcion,
    objetivo_pedagogico,
    area,
    nivel,
    grado,
    eje_catedra,
    archivo_url,
    archivo_path,
    estado
`)
    .eq("estado", "publicado")
    .or(
        `titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%,objetivo_pedagogico.ilike.%${termino}%,area.ilike.%${termino}%,eje_catedra.ilike.%${termino}%`
    );

if (errorRecursos) {
    console.error("Error buscando recursos pedagógicos:", errorRecursos);
}

// Generar enlaces temporales para los recursos pedagógicos
const recursosConEnlace = await Promise.all(
    (recursos || []).map(async (item) => {

        // Si ya existe una URL utilizable, conservarla
        if (item.archivo_url) {
            return {
                ...item,
                enlaceSeguro: item.archivo_url
            };
        }

        if (!item.archivo_path) {
            return {
                ...item,
                enlaceSeguro: null
            };
        }

        const { data, error } = await supabaseClient.storage
            .from("recursos-pedagogicos")
            .createSignedUrl(item.archivo_path, 3600);

        if (error) {
            console.error(
                "No fue posible generar el enlace del recurso:",
                error
            );

            return {
                ...item,
                enlaceSeguro: null
            };
        }

        return {
            ...item,
            enlaceSeguro: data.signedUrl
        };
    })
);
            const resultadosUnificados = [
                ...(articulos || []).map(item => ({
                    id: item.id,
                    titulo: item.titulo,
                    descripcion:
                        item.descripcion_corta ||
                        item.contenido ||
                        "",
                    tipoResultado:
                        item.tipo === "tradicion-oral"
                            ? "tradicion"
                            : "articulo",
                    etiqueta:
                        item.tipo === "tradicion-oral"
                            ? "Tradición oral"
                            : "Artículo",
                    enlace: `articulo.html?id=${item.id}`
                })),

                ...(personajes || []).map(item => ({
                    id: item.id,
                    titulo: item.nombre,
                    descripcion:
                        item.descripcion_corta ||
                        item.biografia ||
                        "",
                    tipoResultado: "personaje",
                    etiqueta: "Personaje",
                    enlace: `personajes.html?id=${item.id}`
                })),
                ...(documentos || []).map(item => ({
    id: item.id,
    titulo: item.titulo,
    descripcion:
        item.descripcion ||
        item.archivo_nombre ||
        "Documento disponible en la Biblioteca Digital.",
    tipoResultado: "documento",
    etiqueta: "Biblioteca",
    enlace: item.archivo_url
})),
...(recursosConEnlace || []).map(item => ({
    id: item.id,
    titulo: item.titulo,
    descripcion:
        item.descripcion ||
        item.objetivo_pedagogico ||
        "Recurso pedagógico de la Cátedra de la Pacoreñidad.",
    tipoResultado: "recurso",
    etiqueta: "Recurso pedagógico",
    enlace: item.enlaceSeguro,
    archivoPath: item.archivo_path
})),
...(lugares || []).map(item => ({
    id: item.id,
    titulo: item.nombre,
    descripcion:
        item.descripcion ||
        item.direccion ||
        "Lugar de interés patrimonial de Pácora.",
    tipoResultado: "patrimonio",
    etiqueta: "Patrimonio",
    enlace: `mapa.html?id=${item.id}`
}))

            ];

            resultadosActuales = resultadosUnificados;
filtroActivo = "todos";

botonesFiltro.forEach(boton => {
    boton.classList.toggle(
        "activo",
        boton.dataset.tipo === "todos"
    );
});

mostrarResultados(resultadosActuales);

        } catch (error) {

            console.error(
                "Error al realizar la búsqueda:",
                error
            );

            resumen.textContent = "";

            resultados.innerHTML = `
                <div class="estado-buscador">
                    No fue posible realizar la búsqueda.
                </div>
            `;
        }
    }

    function mostrarResultados(datos) {

        resumen.textContent =
            `${datos.length} resultado${datos.length === 1 ? "" : "s"} encontrado${datos.length === 1 ? "" : "s"}`;

        if (datos.length === 0) {

            resultados.innerHTML = `
                <div class="estado-buscador">
                    No encontramos resultados para esta búsqueda.
                </div>
            `;

            return;
        }

        resultados.innerHTML = datos.map(item => {

            const descripcion =
                item.descripcion ||
                "Contenido de la Cátedra de la Pacoreñidad.";

            return `
                <article class="resultado">

                    <span class="resultado-tipo">
                        ${item.etiqueta}
                    </span>

                    <h2>${item.titulo}</h2>

                    <p>
                        ${descripcion.length > 250
                            ? descripcion.substring(0, 250) + "..."
                            : descripcion}
                    </p>

                    <a href="${item.enlace}">
                        Ver contenido →
                    </a>

                </article>
            `;

        }).join("");
    }
botonesFiltro.forEach(boton => {

    boton.addEventListener("click", () => {

        filtroActivo = boton.dataset.tipo;

        botonesFiltro.forEach(b => {
            b.classList.remove("activo");
        });

        boton.classList.add("activo");

        if (filtroActivo === "todos") {
            mostrarResultados(resultadosActuales);
            return;
        }

        const resultadosFiltrados = resultadosActuales.filter(
            item => item.tipoResultado === filtroActivo
        );

        mostrarResultados(resultadosFiltrados);
    });

});
    btnBuscar.addEventListener("click", buscarArticulos);

    inputBusqueda.addEventListener("keydown", (event) => {

        if (event.key === "Enter") {
            buscarArticulos();
        }

    });

});