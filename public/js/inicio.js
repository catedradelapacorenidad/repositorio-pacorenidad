document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".slide");
  const prevButton = document.querySelector(".prev");
  const nextButton = document.querySelector(".next");

  if (!slides.length) {
    return;
  }

  let currentSlide = 0;
  let automaticChange;

  function showSlide(index) {
    slides.forEach((slide) => {
      slide.classList.remove("active");
    });

    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add("active");
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function previousSlide() {
    showSlide(currentSlide - 1);
  }

  function startAutomaticChange() {
    automaticChange = setInterval(nextSlide, 5000);
  }

  function restartAutomaticChange() {
    clearInterval(automaticChange);
    startAutomaticChange();
  }

  nextButton?.addEventListener("click", () => {
    nextSlide();
    restartAutomaticChange();
  });

  prevButton?.addEventListener("click", () => {
    previousSlide();
    restartAutomaticChange();
  });

  showSlide(0);
  startAutomaticChange();
});
// Registrar visita al repositorio
async function registrarVisita() {
    try {
        const ahora = Date.now();

        const ultimaVisita = localStorage.getItem(
            "ultimaVisitaPacorenidad"
        );

        const unDia = 24 * 60 * 60 * 1000;

        if (
            ultimaVisita &&
            ahora - Number(ultimaVisita) < unDia
        ) {
            return;
        }

        const { error } = await supabaseClient
            .from("visitas")
            .insert({
                pagina: "inicio"
            });

        if (error) {
            console.error(
                "No se pudo registrar la visita:",
                error
            );
            return;
        }

        localStorage.setItem(
            "ultimaVisitaPacorenidad",
            String(ahora)
        );

    } catch (error) {
        console.error(
            "Error al registrar la visita:",
            error
        );
    }
}

registrarVisita();
async function mostrarTotalVisitas() {
    const contador = document.getElementById("totalVisitas");

    if (!contador) {
        return;
    }

    try {
        const { count, error } = await supabaseClient
            .from("visitas")
            .select("*", {
                count: "exact",
                head: true
            });

        if (error) {
            throw error;
        }

        contador.textContent = Number(count || 0).toLocaleString("es-CO");

    } catch (error) {
        console.error(
            "No se pudo consultar el total de visitas:",
            error
        );

        contador.textContent = "—";
    }
}

mostrarTotalVisitas();