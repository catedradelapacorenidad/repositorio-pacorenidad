const loading = document.getElementById("loading");
const adminContent = document.getElementById("adminContent");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");
const estadoEstadisticas = document.getElementById(
    "estadoEstadisticas"
);

async function verificarSesion() {
    try {
        const {
            data: { session },
            error: errorSesion
        } = await supabaseClient.auth.getSession();

        if (errorSesion) {
            throw errorSesion;
        }

        if (!session) {
            window.location.replace("login.html");
            return;
        }

        const usuario = session.user;

        /*
         * Consultar el rol real del usuario
         * en la tabla profiles.
         */
        const {
            data: perfil,
            error: errorPerfil
        } = await supabaseClient
            .from("profiles")
            .select("rol")
            .eq("id", usuario.id)
            .maybeSingle();

        if (errorPerfil) {
            console.error(
                "Error consultando el perfil:",
                errorPerfil
            );

            throw errorPerfil;
        }

        /*
         * Solo los administradores pueden
         * entrar a esta página.
         */
        if (
            !perfil ||
            perfil.rol !== "administrador"
        ) {
            loading.textContent =
                "No tienes permisos para acceder al panel de administración.";

            loading.style.color = "#b52b2b";

            /*
             * Cerramos la sesión para evitar que
             * el usuario permanezca dentro de una
             * ruta administrativa.
             */
            await supabaseClient.auth.signOut();

            setTimeout(() => {
                window.location.replace("login.html");
            }, 1800);

            return;
        }

        /*
         * Solo se muestra el panel después
         * de comprobar el rol.
         */
        userEmail.textContent =
            "Sesión iniciada como: " + usuario.email;

        loading.style.display = "none";
        adminContent.style.display = "block";

        await cargarEstadisticas();

    } catch (error) {
        console.error(
            "Error al verificar el acceso:",
            error
        );

        loading.textContent =
            "No fue posible verificar tus permisos.";

        loading.style.color = "#b52b2b";

        setTimeout(() => {
            window.location.replace("login.html");
        }, 1800);
    }
}

async function obtenerCantidad(
    tabla,
    filtro = null
) {
    let consulta = supabaseClient
        .from(tabla)
        .select("*", {
            count: "exact",
            head: true
        });

    if (filtro) {
        consulta = consulta.eq(
            filtro.campo,
            filtro.valor
        );
    }

    const { count, error } = await consulta;

    if (error) {
        console.error(
            `Error al contar registros de ${tabla}:`,
            error
        );

        return null;
    }

    return count ?? 0;
}

async function cargarEstadisticas() {
    estadoEstadisticas.style.display = "block";
    estadoEstadisticas.textContent =
        "Cargando estadísticas...";

    try {
        const [
            totalArticulos,
            totalArticulosPendientes,
            totalSolicitudesPendientes,
            totalPersonajes,
            totalDocumentos,
            totalGaleria,
            totalLugares,
            totalMensajes
        ] = await Promise.all([
   obtenerCantidad("articulos"),

obtenerCantidad(
    "articulos",
    {
        campo: "estado",
        valor: "pendiente"
    }
),

obtenerCantidad(
    "solicitudes_colaborador",
    {
        campo: "estado",
        valor: "pendiente"
    }
),

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

        document.getElementById(
            "totalArticulos"
        ).textContent =
            totalArticulos ?? "Error";

        document.getElementById(
            "totalArticulosPendientes"
        ).textContent =
            totalArticulosPendientes ?? "Error";

            document.getElementById(
    "totalSolicitudesPendientes"
).textContent =
    totalSolicitudesPendientes ?? "Error";

        document.getElementById(
            "totalPersonajes"
        ).textContent =
            totalPersonajes ?? "Error";

        document.getElementById(
            "totalDocumentos"
        ).textContent =
            totalDocumentos ?? "Error";

        document.getElementById(
            "totalGaleria"
        ).textContent =
            totalGaleria ?? "Error";

        document.getElementById(
            "totalLugares"
        ).textContent =
            totalLugares ?? "Error";

        document.getElementById(
            "totalMensajes"
        ).textContent =
            totalMensajes ?? "Error";

        estadoEstadisticas.textContent =
            "Estadísticas actualizadas correctamente.";

        setTimeout(() => {
            estadoEstadisticas.style.display = "none";
        }, 1800);

    } catch (error) {
        console.error(
            "Error al cargar estadísticas:",
            error
        );

        estadoEstadisticas.textContent =
            "No fue posible cargar todas las estadísticas.";
    }
}

logoutButton.addEventListener(
    "click",
    async function () {
        logoutButton.disabled = true;
        logoutButton.textContent =
            "Cerrando sesión...";

        await supabaseClient.auth.signOut();

        window.location.replace("login.html");
    }
);

verificarSesion();