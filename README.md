# Repositorio Digital de la Catedra de la Pacorenidad

Aplicacion web para consultar informacion por categorias, descargar archivos y subir documentos multimedia al repositorio digital.

## Tecnologias usadas

- HTML: estructura de las pantallas.
- CSS: diseno visual y adaptacion a celulares.
- JavaScript: interaccion en el navegador.
- Node.js + Express: servidor y API.
- Supabase: base de datos y almacenamiento de archivos.

## Estructura del proyecto

```text
repositorio-pacorenidad/
  public/
    index.html
    css/
      styles.css
    js/
      app.js
  server/
    server.js
    supabaseClient.js
    routes/
      documents.js
  supabase/
    schema.sql
  .env.example
  package.json
  README.md
```

## Instalacion paso a paso

1. Instala Node.js desde https://nodejs.org.
2. Abre una terminal en esta carpeta.
3. Instala las dependencias:

```bash
npm install
```

4. Crea un proyecto en Supabase.
5. En Supabase, abre el editor SQL y ejecuta el archivo:

```text
supabase/schema.sql
```

6. Crea un bucket de almacenamiento llamado:

```text
pacorenidad-documentos
```

7. Copia `.env.example` y renombralo como `.env`.
8. Completa `.env` con la URL y la clave `service_role` de Supabase.
9. Inicia la aplicacion:

```bash
npm start
```

10. Abre el navegador en:

```text
http://localhost:3000
```

## Que hace cada archivo

### `package.json`

Lista las librerias que necesita el proyecto y define comandos utiles:

- `npm start`: ejecuta el servidor.
- `npm run dev`: ejecuta el servidor con recarga automatica usando Nodemon.

### `.env.example`

Plantilla de variables privadas. No debes escribir claves secretas directamente en el codigo.

### `public/index.html`

Pagina principal. Contiene:

- encabezado del repositorio;
- filtros por categoria;
- listado de documentos;
- formulario para subir archivos multimedia.

### `public/css/styles.css`

Define colores, espaciados, tarjetas, botones, formularios y el diseno responsive.

### `public/js/app.js`

Codigo del navegador. Se encarga de:

- pedir documentos al servidor;
- mostrar documentos por categoria;
- enviar archivos nuevos al servidor;
- mostrar mensajes de carga, error o exito.

### `server/server.js`

Archivo principal del backend. Crea el servidor Express, sirve la carpeta `public` y conecta las rutas de documentos.

### `server/supabaseClient.js`

Crea el cliente de Supabase usando las variables del archivo `.env`.

### `server/routes/documents.js`

Define la API:

- `GET /api/documents`: lista documentos.
- `GET /api/documents?category=Historia`: filtra por categoria.
- `POST /api/documents`: sube un archivo y guarda sus datos en Supabase.

### `supabase/schema.sql`

Script para crear la tabla `documents`, indices y politicas basicas de lectura.

## Categorias sugeridas

- Historia
- Tradicion oral
- Patrimonio cultural
- Personajes
- Fotografia
- Audio y video
- Documentos academicos

Puedes cambiar estas categorias en `public/js/app.js` y en el formulario de `public/index.html`.

## Nota de seguridad

Este proyecto usa `SUPABASE_SERVICE_ROLE_KEY` solamente en el servidor. Nunca la pongas en archivos de frontend como `index.html` o `app.js`.
