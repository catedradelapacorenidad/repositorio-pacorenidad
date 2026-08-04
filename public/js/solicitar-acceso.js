document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById(
    "form-solicitud"
  );

  const botonEnviar = document.getElementById(
    "enviar-solicitud"
  );

  const mensajeEstado = document.getElementById(
    "mensaje-estado"
  );

  function mostrarMensaje(texto, tipo = "normal") {
    mensajeEstado.textContent = texto;

    mensajeEstado.style.marginTop = "20px";
    mensajeEstado.style.padding = texto
      ? "15px"
      : "0";

    mensajeEstado.style.borderRadius = "10px";

    if (tipo === "exito") {
      mensajeEstado.style.color = "#145c2c";
      mensajeEstado.style.background = "#d8f3df";
      return;
    }

    if (tipo === "error") {
      mensajeEstado.style.color = "#8b1e25";
      mensajeEstado.style.background = "#f8d7da";
      return;
    }

    mensajeEstado.style.color = "#555";
    mensajeEstado.style.background = "#f5f2e9";
  }

  function limpiarTexto(valor) {
    return String(valor || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();

      botonEnviar.disabled = true;
      botonEnviar.textContent = "Enviando solicitud...";

      mostrarMensaje(
        "Registrando tu solicitud..."
      );

      try {
        const nombre = limpiarTexto(
          document.getElementById("nombre").value
        );

        const correo = limpiarTexto(
          document.getElementById("correo").value
        ).toLowerCase();

        const telefono = limpiarTexto(
          document.getElementById("telefono").value
        );

        const institucion = limpiarTexto(
          document.getElementById("institucion").value
        );

        const municipio = limpiarTexto(
          document.getElementById("municipio").value
        );

        const mensaje = document
          .getElementById("mensaje")
          .value
          .trim();

        if (!nombre || !correo || !municipio || !mensaje) {
          throw new Error(
            "Completa todos los campos obligatorios."
          );
        }

        if (!correoValido(correo)) {
          throw new Error(
            "Escribe un correo electrónico válido."
          );
        }

        if (mensaje.length < 20) {
          throw new Error(
            "Explica un poco más por qué deseas colaborar."
          );
        }

        const {
          error
        } = await supabaseClient
          .from("solicitudes_colaborador")
          .insert({
            nombre,
            correo,
            telefono: telefono || null,
            institucion: institucion || null,
            municipio,
            mensaje,
            estado: "pendiente"
          });

        if (error) {
          throw error;
        }

        formulario.reset();

        document.getElementById(
          "municipio"
        ).value = "Pácora";

        mostrarMensaje(
          "Tu solicitud fue enviada correctamente. " +
          "El equipo administrador la revisará y se pondrá " +
          "en contacto contigo a través del correo registrado.",
          "exito"
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      } catch (error) {
        console.error(
          "Error al enviar la solicitud:",
          error
        );

        mostrarMensaje(
          error.message ||
          "No fue posible enviar la solicitud. Intenta nuevamente.",
          "error"
        );

      } finally {
        botonEnviar.disabled = false;
        botonEnviar.textContent = "Enviar solicitud";
      }
    }
  );
});