const loading = document.getElementById("loading");
const adminContent = document.getElementById("adminContent");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const estadoEstadisticas = document.getElementById("estadoEstadisticas");

async function verificarSesion() {
    try {
        const {
            data: { session },
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (!session) {
            window.location.href = "login.html";
            return;
        }

        userEmail.textContent =
            "Sesión iniciada como: " + session.user.email;

        loading.style.display = "none";
        adminContent.style.display = "block";

        await cargarEstadisticas();

    } catch (error) {
        console.error("Error al verificar la sesión:", error);
        window.location.href = "login.html";
    }
}

async function obtenerCantidad(tabla, filtro = null) {
    let consulta = supabaseClient
        .from(tabla)
        .select("*", {
            count: "exact",
            head: true
        });

    if (filtro) {
        consulta = consulta.eq(filtro.campo, filtro.valor);
    }

    const { count, error } = await consulta;

    if (error) {
        console.error(`Error al contar registros de ${tabla}:`, error);
        return null;
    }

    return count ?? 0;
}

async function cargarEstadisticas() {
    estadoEstadisticas.textContent = "Cargando estadísticas...";

    try {
        const [
            totalPersonajes,
            totalDocumentos,
            totalGaleria,
            totalLugares,
            totalMensajes
        ] = await Promise.all([
            obtenerCantidad("personajes"),
            obtenerCantidad("documentos"),
            obtenerCantidad("galeria"),
            obtenerCantidad("lugares"),
            obtenerCantidad(
                "mensajes_contacto",
                {
                    campo: "leido",
                    valor: false
                }
            )
        ]);

        document.getElementById("totalPersonajes").textContent =
            totalPersonajes ?? "Error";

        document.getElementById("totalDocumentos").textContent =
            totalDocumentos ?? "Error";

        document.getElementById("totalGaleria").textContent =
            totalGaleria ?? "Error";

        document.getElementById("totalLugares").textContent =
            totalLugares ?? "Error";

        document.getElementById("totalMensajes").textContent =
            totalMensajes ?? "Error";

        estadoEstadisticas.textContent =
            "Estadísticas actualizadas correctamente.";

        setTimeout(() => {
            estadoEstadisticas.style.display = "none";
        }, 1800);

    } catch (error) {
        console.error("Error al cargar estadísticas:", error);

        estadoEstadisticas.textContent =
            "No fue posible cargar todas las estadísticas.";
    }
}

logoutButton.addEventListener("click", async function () {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
});

verificarSesion();