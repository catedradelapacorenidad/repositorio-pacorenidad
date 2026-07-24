const tituloHistoria = document.getElementById("tituloHistoria");
const contenidoHistoria = document.getElementById("contenidoHistoria");
const estadoHistoria = document.getElementById("estadoHistoria");

async function cargarHistoriaPublica() {
    estadoHistoria.textContent = "Cargando contenido...";

    const { data, error } = await supabaseClient
        .from("Historia")
        .select("titulo, contenido")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
        console.error("Error al cargar la historia:", error);
        estadoHistoria.style.color = "#b52b2b";
        estadoHistoria.textContent =
            "No fue posible cargar el contenido histórico.";
        return;
    }

    if (!data) {
        estadoHistoria.style.color = "#8b5a33";
        estadoHistoria.textContent =
            "Todavía no hay contenido histórico publicado.";
        return;
    }

    tituloHistoria.textContent = data.titulo || "Historia de Pácora";
    contenidoHistoria.textContent = data.contenido || "";

    estadoHistoria.textContent = "";
}

cargarHistoriaPublica();