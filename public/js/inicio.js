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