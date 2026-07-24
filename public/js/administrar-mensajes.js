const loading = document.getElementById("loading");
const contenidoMensajes = document.getElementById("contenidoMensajes");
const estadoMensajes = document.getElementById("estadoMensajes");
const listaMensajes = document.getElementById("listaMensajes");

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

        loading.style.display = "none";
        contenidoMensajes.style.display = "block";

        await cargarMensajes();

    } catch (error) {
        console.error("Error al verificar la sesión:", error);
        window.location.href = "login.html";
    }
}

async function cargarMensajes() {
    estadoMensajes.style.display = "block";
    estadoMensajes.textContent = "Cargando mensajes...";
    listaMensajes.innerHTML = "";

    const { data, error } = await supabaseClient
        .from("mensajes_contacto")
        .select("*")
        .order("creado_en", { ascending: false });

    if (error) {
        console.error("Error al cargar mensajes:", error);
        estadoMensajes.textContent =
            "No fue posible cargar los mensajes.";
        return;
    }

    if (!data || data.length === 0) {
        estadoMensajes.textContent =
            "Todavía no hay mensajes recibidos.";
        return;
    }

    estadoMensajes.style.display = "none";

    data.forEach(mensaje => {
        listaMensajes.appendChild(crearTarjetaMensaje(mensaje));
    });
}

function crearTarjetaMensaje(mensaje) {
    const tarjeta = document.createElement("article");

    tarjeta.className = mensaje.leido
        ? "mensaje-card"
        : "mensaje-card no-leido";

    const fecha = mensaje.creado_en
        ? new Date(mensaje.creado_en).toLocaleString("es-CO")
        : "Fecha no disponible";

    const asuntoSeguro = escaparHTML(mensaje.asunto || "Sin asunto");
    const nombreSeguro = escaparHTML(mensaje.nombre || "Sin nombre");
    const correoSeguro = escaparHTML(mensaje.correo || "");
    const mensajeSeguro = escaparHTML(mensaje.mensaje || "");

    tarjeta.innerHTML = `
        <div class="mensaje-superior">
            <div>
                <h2>${nombreSeguro}</h2>
                <p class="mensaje-correo">${correoSeguro}</p>
            </div>

            <span class="mensaje-fecha">${fecha}</span>
        </div>

        <p class="mensaje-asunto">
            Asunto: ${asuntoSeguro}
        </p>

        <div class="mensaje-texto">${mensajeSeguro}</div>

        <div class="mensaje-acciones">
            ${
                !mensaje.leido
                    ? `
                    <button
                        class="accion-button leer-button"
                        data-id="${mensaje.id}"
                    >
                        Marcar como leído
                    </button>
                    `
                    : ""
            }

            <a
                class="responder-link"
                href="mailto:${encodeURIComponent(mensaje.correo)}?subject=${encodeURIComponent(
                    "Respuesta: " + (mensaje.asunto || "Consulta")
                )}"
            >
                Responder por correo
            </a>

            <button
                class="accion-button eliminar-button"
                data-id="${mensaje.id}"
            >
                Eliminar
            </button>
        </div>
    `;

    const botonLeer = tarjeta.querySelector(".leer-button");

    if (botonLeer) {
        botonLeer.addEventListener("click", async () => {
            await marcarComoLeido(mensaje.id);
        });
    }

    const botonEliminar = tarjeta.querySelector(".eliminar-button");

    botonEliminar.addEventListener("click", async () => {
        await eliminarMensaje(mensaje.id);
    });

    return tarjeta;
}

async function marcarComoLeido(id) {
    const { error } = await supabaseClient
        .from("mensajes_contacto")
        .update({ leido: true })
        .eq("id", id);

    if (error) {
        console.error("Error al marcar el mensaje:", error);
        alert("No fue posible marcar el mensaje como leído.");
        return;
    }

    await cargarMensajes();
}

async function eliminarMensaje(id) {
    const confirmar = window.confirm(
        "¿Estás seguro de que deseas eliminar este mensaje?"
    );

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("mensajes_contacto")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error al eliminar el mensaje:", error);
        alert("No fue posible eliminar el mensaje.");
        return;
    }

    await cargarMensajes();
}

function escaparHTML(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = texto;
    return elemento.innerHTML;
}

verificarSesion();