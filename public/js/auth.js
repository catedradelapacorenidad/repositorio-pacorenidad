async function obtenerRolUsuario(userId) {
    const { data: perfil, error } = await supabaseClient
        .from("profiles")
        .select("rol")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error("Error consultando el perfil:", error);
        throw new Error(
            "No fue posible verificar los permisos de la cuenta."
        );
    }

    if (!perfil || !perfil.rol) {
        throw new Error(
            "La cuenta no tiene un perfil o rol asignado."
        );
    }

    return perfil.rol;
}

async function redirigirSegunRol(usuario) {
    const rol = await obtenerRolUsuario(usuario.id);

    if (rol === "administrador") {
        window.location.replace("admin.html");
        return;
    }

    if (rol === "colaborador") {
        window.location.replace("panel.html");
        return;
    }

    await supabaseClient.auth.signOut();

    throw new Error(
        "Tu cuenta no tiene un rol autorizado para ingresar."
    );
}

async function login() {
    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    const mensaje = document.getElementById("mensaje");

    mensaje.textContent = "";
    mensaje.style.color = "#b52b2b";

    if (!email || !password) {
        mensaje.textContent =
            "Escribe el correo y la contraseña.";
        return;
    }

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            throw error;
        }

        if (!data.user) {
            throw new Error(
                "No fue posible identificar al usuario."
            );
        }

        mensaje.style.color = "#235437";
        mensaje.textContent =
            "Ingreso exitoso. Verificando permisos...";

        await redirigirSegunRol(data.user);

    } catch (error) {
        console.error("Error al iniciar sesión:", error);

        await supabaseClient.auth.signOut();

        mensaje.style.color = "#b52b2b";
        mensaje.textContent =
            error.message === "Invalid login credentials"
                ? "El correo o la contraseña son incorrectos."
                : error.message ||
                  "No fue posible iniciar sesión.";
    }
}

async function register() {
    const email = document
        .getElementById("email")
        .value
        .trim();

    const password = document
        .getElementById("password")
        .value;

    const mensaje = document.getElementById("mensaje");

    mensaje.textContent = "";
    mensaje.style.color = "#b52b2b";

    if (!email || !password) {
        mensaje.textContent =
            "Escribe un correo y una contraseña.";
        return;
    }

    if (password.length < 8) {
        mensaje.textContent =
            "La contraseña debe tener al menos 8 caracteres.";
        return;
    }

    try {
        const { data, error } =
            await supabaseClient.auth.signUp({
                email,
                password
            });

        if (error) {
            throw error;
        }

        mensaje.style.color = "#235437";

        if (data.session && data.user) {
            mensaje.textContent =
                "Cuenta creada. Verificando permisos...";

            await redirigirSegunRol(data.user);
            return;
        }

        mensaje.textContent =
            "Cuenta creada. Revisa tu correo para confirmar el registro.";

    } catch (error) {
        console.error("Error al crear la cuenta:", error);

        mensaje.style.color = "#b52b2b";
        mensaje.textContent =
            error.message ||
            "No fue posible crear la cuenta.";
    }
}