console.log("editar-historia.js cargado correctamente");

const textarea = document.getElementById("editor");
const boton = document.getElementById("guardar");
const mensaje = document.getElementById("mensaje");

console.log("Textarea encontrado:", textarea);
console.log("Botón encontrado:", boton);

async function cargarHistoria() {
    mensaje.textContent = "Cargando contenido...";

    const { data, error } = await supabaseClient
        .from("Historia")
        .select("id, titulo, contenido, actualizado_en")
        .eq("id", 1)
        .maybeSingle();

    console.log("Datos recibidos:", data);
    console.log("Error recibido:", error);

    if (error) {
        mensaje.style.color = "red";
        mensaje.textContent = "Error: " + error.message;
        return;
    }

    if (!data) {
        mensaje.style.color = "#8b5a33";
        mensaje.textContent = "No se encontró el registro con id 1.";
        return;
    }

    textarea.value = data.contenido || "";
    mensaje.style.color = "green";
    mensaje.textContent = "Contenido cargado correctamente.";
}

boton.addEventListener("click", async function () {
    mensaje.style.color = "#333";
    mensaje.textContent = "Guardando...";

    const { data, error } = await supabaseClient
        .from("Historia")
        .update({
            contenido: textarea.value,
            actualizado_en: new Date().toISOString()
        })
        .eq("id", 1)
        .select();

    console.log("Resultado de guardar:", data);
    console.log("Error al guardar:", error);

    if (error) {
        mensaje.style.color = "red";
        mensaje.textContent = "Error al guardar: " + error.message;
        return;
    }

    mensaje.style.color = "green";
    mensaje.textContent = "Historia guardada correctamente.";
});

cargarHistoria();