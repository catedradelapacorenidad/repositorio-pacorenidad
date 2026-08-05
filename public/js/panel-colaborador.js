const loading = document.getElementById("loading");
const panelContent = document.getElementById("panelContent");
const userEmail = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutButton");

async function verificarAccesoColaborador() {
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

        const {
            data: perfil,
            error: errorPerfil
        } = await supabaseClient
            .from("profiles")
            .select("rol")
            .eq("id", usuario.id)
            .maybeSingle();

        if (errorPerfil) {
            throw errorPerfil;
        }

        if (!perfil || !perfil.rol) {
            await supabaseClient.auth.signOut();

            loading.textContent =
                "La cuenta no tiene un rol asignado.";

            loading.style.color = "#b52b2b";

            setTimeout(() => {
                window.location.replace("login.html");
            }, 1800);

            return;
        }

        if (
            perfil.rol !== "colaborador" &&
            perfil.rol !== "administrador"
        ) {
            await supabaseClient.auth.signOut();

            loading.textContent =
                "No tienes permisos para acceder a este panel.";

            loading.style.color = "#b52b2b";

            setTimeout(() => {
                window.location.replace("login.html");
            }, 1800);

            return;
        }

        userEmail.textContent =
            "Sesión iniciada como: " + usuario.email;

        loading.style.display = "none";
        panelContent.style.display = "block";

    } catch (error) {
        console.error(
            "Error verificando el acceso:",
            error
        );

        loading.textContent =
            "No fue posible verificar el acceso.";

        loading.style.color = "#b52b2b";

        setTimeout(() => {
            window.location.replace("login.html");
        }, 1800);
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

verificarAccesoColaborador();