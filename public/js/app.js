const documentsList = document.querySelector("#documents-list");
const statusMessage = document.querySelector("#status-message");
const documentCount = document.querySelector("#document-count");
const categoryFilter = document.querySelector("#category-filter");
const uploadForm = document.querySelector("#upload-form");
const uploadMessage = document.querySelector("#upload-message");

async function loadDocuments() {
  const selectedCategory = categoryFilter.value;
  const query = selectedCategory === "Todas" ? "" : `?category=${encodeURIComponent(selectedCategory)}`;

  statusMessage.textContent = "Cargando documentos...";
  documentsList.innerHTML = "";

  try {
    const response = await fetch(`/api/documents${query}`);
    const documents = await response.json();

    if (!response.ok) {
      throw new Error(documents.message || "No se pudieron cargar los documentos");
    }

    renderDocuments(documents);
  } catch (error) {
    statusMessage.textContent = error.message;
    documentCount.textContent = "0 archivos";
  }
}

function renderDocuments(documents) {
  documentCount.textContent = `${documents.length} ${documents.length === 1 ? "archivo" : "archivos"}`;

  if (documents.length === 0) {
    statusMessage.textContent = "No hay documentos en esta categoria.";
    return;
  }

  statusMessage.textContent = "";

  documentsList.innerHTML = documents
    .map((documentItem) => {
      const createdAt = new Date(documentItem.created_at).toLocaleDateString("es-CO");
      const size = formatBytes(documentItem.file_size);

      return `
        <article class="document-card">
          <h3>${escapeHtml(documentItem.title)}</h3>
          <p>${escapeHtml(documentItem.description || "Sin descripcion registrada.")}</p>
          <div class="meta">
            <span class="badge">${escapeHtml(documentItem.category)}</span>
            <span>${escapeHtml(documentItem.author || "Autor no registrado")}</span>
            <span>${createdAt}</span>
            <span>${size}</span>
          </div>
          <a class="download-link" href="${documentItem.public_url}" target="_blank" rel="noopener" download>
            Descargar archivo
          </a>
        </article>
      `;
    })
    .join("");
}

function formatBytes(bytes) {
  if (!bytes) return "Tamano no disponible";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = uploadForm.querySelector("button");
  const formData = new FormData(uploadForm);

  uploadMessage.className = "form-message";
  uploadMessage.textContent = "Subiendo documento...";
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "No se pudo subir el documento");
    }

    uploadForm.reset();
    uploadMessage.className = "form-message success";
    uploadMessage.textContent = "Documento subido correctamente.";
    await loadDocuments();
  } catch (error) {
    uploadMessage.className = "form-message error";
    uploadMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

categoryFilter.addEventListener("change", loadDocuments);

loadDocuments();
const menuButton = document.getElementById("menuButton");
const mainNav = document.getElementById("mainNav");

if (menuButton && mainNav) {
  menuButton.addEventListener("click", function () {
    const estaAbierto = mainNav.classList.toggle("open");

    menuButton.setAttribute(
      "aria-expanded",
      estaAbierto ? "true" : "false"
    );

    menuButton.setAttribute(
      "aria-label",
      estaAbierto ? "Cerrar menú" : "Abrir menú"
    );

    menuButton.textContent = estaAbierto ? "✕" : "☰";
  });

  document.addEventListener("click", function (evento) {
    const clicDentroDelMenu = mainNav.contains(evento.target);
    const clicEnBoton = menuButton.contains(evento.target);

    if (!clicDentroDelMenu && !clicEnBoton) {
      cerrarMenu();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      cerrarMenu();
    }
  });
}

function cerrarMenu() {
  if (!menuButton || !mainNav) {
    return;
  }

  mainNav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  menuButton.textContent = "☰";
}