async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const mensaje = document.getElementById("mensaje");

    mensaje.textContent = "";

    if (!email || !password) {
        mensaje.textContent = "Escribe el correo y la contraseña.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error(error);
        mensaje.textContent = "No fue posible iniciar sesión: " + error.message;
        return;
    }

    mensaje.style.color = "#235437";
    mensaje.textContent = "Ingreso exitoso.";

    window.location.href = "admin.html";
}

async function register() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const mensaje = document.getElementById("mensaje");

    mensaje.textContent = "";

    if (!email || !password) {
        mensaje.textContent = "Escribe un correo y una contraseña.";
        return;
    }

    if (password.length < 6) {
        mensaje.textContent = "La contraseña debe tener al menos 6 caracteres.";
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        console.error(error);
        mensaje.textContent = "No fue posible crear la cuenta: " + error.message;
        return;
    }

    mensaje.style.color = "#235437";

    if (data.session) {
        mensaje.textContent = "Cuenta creada correctamente.";

        setTimeout(() => {
            window.location.href = "admin.html";
        }, 1000);
    } else {
        mensaje.textContent =
            "Cuenta creada. Revisa tu correo para confirmar el registro.";
    }
}