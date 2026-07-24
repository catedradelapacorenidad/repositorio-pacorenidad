const express = require("express");
const multer = require("multer");
const supabase = require("../supabaseClient");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

const bucketName = process.env.SUPABASE_BUCKET || "pacorenidad-documentos";

router.get("/", async (req, res) => {
  const { category } = req.query;

  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (category && category !== "Todas") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ message: "No se pudieron cargar los documentos", error });
  }

  res.json(data);
});

router.post("/", upload.single("file"), async (req, res) => {
  const { title, category, description, author } = req.body;
  const file = req.file;

  if (!title || !category || !file) {
    return res.status(400).json({
      message: "El titulo, la categoria y el archivo son obligatorios"
    });
  }

  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
  const filePath = `${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (uploadError) {
    return res.status(500).json({
      message: "No se pudo subir el archivo a Supabase Storage",
      error: uploadError
    });
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  const { data, error: insertError } = await supabase
    .from("documents")
    .insert({
      title,
      category,
      description,
      author,
      file_name: file.originalname,
      file_path: filePath,
      file_type: file.mimetype,
      file_size: file.size,
      public_url: publicUrlData.publicUrl
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({
      message: "El archivo subio, pero no se pudo guardar el registro",
      error: insertError
    });
  }

  res.status(201).json(data);
});

module.exports = router;
