require("dotenv").config();

const path = require("path");
const cors = require("cors");
const express = require("express");
const documentRoutes = require("./routes/documents");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/documents", documentRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Repositorio Digital activo" });
});

app.listen(port, () => {
  console.log(`Servidor disponible en http://localhost:${port}`);
});
