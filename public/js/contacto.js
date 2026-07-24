const formularioContacto = document.getElementById("form-contacto");
const botonEnviar = document.getElementById("btn-enviar");
const estadoContacto = document.getElementById("estado-contacto");

if (!formularioContacto) {
    console.error("No se encontró el formulario de contacto.");
} else {
    formularioContacto.addEventListener("submit", enviarMensajeContacto);
}

async function enviarMensajeContacto(evento) {
    evento.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const asunto = document.getElementById("asunto").value;
    const mensaje = document.getElementById("mensaje").value.trim();

    if (!nombre || !correo || !asunto || !mensaje) {
        mostrarEstadoContacto(
            "Debes completar todos los campos.",
            "#b52b2b"
        );
        return;
    }

    botonEnviar.disabled = true;
    botonEnviar.textContent = "Enviando...";

    mostrarEstadoContacto(
        "Estamos enviando tu mensaje...",
        "#8b5a33"
    );

    try {
        if (typeof supabaseClient === "undefined") {
            throw new Error(
                "No se encontró la conexión con Supabase."
            );
        }

        const { data, error } = await supabaseClient
            .from("mensajes_contacto")
            .insert([
                {
                    nombre,
                    correo,
                    asunto,
                    mensaje
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        console.log("Mensaje guardado:", data);

        mostrarEstadoContacto(
            "Mensaje enviado correctamente. Gracias por comunicarte con la Cátedra.",
            "#247a3c"
        );

        formularioContacto.reset();

    } catch (error) {
        console.error("Error completo al enviar:", error);

        mostrarEstadoContacto(
            "No fue posible enviar el mensaje. Revisa la consola para identificar el error.",
            "#b52b2b"
        );

    } finally {
        botonEnviar.disabled = false;
        botonEnviar.textContent = "Enviar mensaje";
    }
}

function mostrarEstadoContacto(texto, color) {
    estadoContacto.textContent = texto;
    estadoContacto.style.color = color;
    estadoContacto.style.fontWeight = "600";
    estadoContacto.style.marginTop = "15px";
}