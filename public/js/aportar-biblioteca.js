const titulo = document.getElementById("titulo");
const autor = document.getElementById("autor");
const descripcion = document.getElementById("descripcion");
const categoria = document.getElementById("categoria");
const portada = document.getElementById("portada");
const archivo = document.getElementById("archivo");

const nombreColaborador =
    document.getElementById("nombre-colaborador");

const mostrarColaborador =
    document.getElementById("mostrar-colaborador");

const botonEnviar =
    document.getElementById("enviar");

const mensaje =
    document.getElementById("mensaje");


/* =========================================
   LIMPIAR NOMBRE DE ARCHIVO
   ========================================= */

function limpiarNombreArchivo(nombre) {
    return nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
}


/* =========================================
   VERIFICAR SESIÓN Y CARGAR PERFIL
   ========================================= */

async function cargarDatosColaborador() {

    const {
        data: { session },
        error: errorSesion
    } =
        await supabaseClient.auth
            .getSession();


    if (errorSesion || !session) {
        return;
    }


    /*
     * Intentamos cargar el nombre registrado
     * en el perfil del colaborador.
     */

    const {
        data: perfil,
        error: errorPerfil
    } =
        await supabaseClient
            .from("profiles")
            .select("nombre")
            .eq(
                "id",
                session.user.id
            )
            .maybeSingle();


    if (
        !errorPerfil &&
        perfil?.nombre
    ) {
        nombreColaborador.value =
            perfil.nombre;
    }
}


/* =========================================
   ENVIAR APORTE
   ========================================= */

botonEnviar.addEventListener(
    "click",
    async () => {

        const tituloValor =
            titulo.value.trim();

        const autorValor =
            autor.value.trim();

        const descripcionValor =
            descripcion.value.trim();

        const categoriaValor =
            categoria.value;

        const nombreColaboradorValor =
            nombreColaborador.value.trim();

        const mostrarColaboradorValor =
            mostrarColaborador.checked;


        const portadaFile =
            portada.files[0];

        const archivoFile =
            archivo.files[0];


        mensaje.textContent = "";


        /* =================================
           VALIDACIONES
           ================================= */

        if (!tituloValor) {

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "Escribe el título del documento.";

            return;
        }


        if (!autorValor) {

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "Escribe el autor del documento.";

            return;
        }


        if (!nombreColaboradorValor) {

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "Escribe tu nombre para identificar quién realiza el aporte.";

            return;
        }


        if (!archivoFile) {

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "Selecciona el archivo del documento.";

            return;
        }


        const limiteBytes =
            30 * 1024 * 1024;


        if (
            archivoFile.size >
            limiteBytes
        ) {

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "El archivo no puede superar los 30 MB.";

            return;
        }


        /* =================================
           VERIFICAR SESIÓN
           ================================= */

        const {
            data: { session },
            error: errorSesion
        } =
            await supabaseClient.auth
                .getSession();


        if (
            errorSesion ||
            !session
        ) {

            mensaje.style.color =
                "red";

            mensaje.textContent =
                "Debes iniciar sesión para enviar un aporte.";

            return;
        }


        botonEnviar.disabled =
            true;

        botonEnviar.textContent =
            "Enviando...";


        mensaje.style.color =
            "#333";

        mensaje.textContent =
            "Subiendo documento...";


        /* =================================
           PREPARAR ARCHIVO
           ================================= */

        const nombreArchivoLimpio =
            limpiarNombreArchivo(
                archivoFile.name
            );


        const nombreArchivo =
            `${Date.now()}_${nombreArchivoLimpio}`;


        const rutaArchivo =
            `${session.user.id}/${nombreArchivo}`;


        /* =================================
           SUBIR DOCUMENTO
           ================================= */

        const {
            error: errorArchivo
        } =
            await supabaseClient.storage
                .from("biblioteca")
                .upload(
                    rutaArchivo,
                    archivoFile,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            archivoFile.type
                    }
                );


        if (errorArchivo) {

            console.error(
                "Error al subir documento:",
                errorArchivo
            );


            restaurarBoton();


            mensaje.style.color =
                "red";

            mensaje.textContent =
                "No fue posible subir el documento: " +
                errorArchivo.message;


            return;
        }


        /* =================================
           OBTENER URL DEL DOCUMENTO
           ================================= */

        const {
            data: datosArchivo
        } =
            supabaseClient.storage
                .from("biblioteca")
                .getPublicUrl(
                    rutaArchivo
                );


        const urlArchivo =
            datosArchivo.publicUrl;


        /* =================================
           PORTADA OPCIONAL
           ================================= */

        let urlPortada =
            null;

        let rutaPortada =
            null;


        if (portadaFile) {

            const nombrePortadaLimpio =
                limpiarNombreArchivo(
                    portadaFile.name
                );


            const nombrePortada =
                `${Date.now()}_${nombrePortadaLimpio}`;


            rutaPortada =
                `${session.user.id}/portadas/${nombrePortada}`;


            const {
                error: errorPortada
            } =
                await supabaseClient.storage
                    .from("biblioteca")
                    .upload(
                        rutaPortada,
                        portadaFile,
                        {
                            cacheControl:
                                "3600",

                            upsert:
                                false,

                            contentType:
                                portadaFile.type
                        }
                    );


            if (errorPortada) {

                console.error(
                    "Error al subir portada:",
                    errorPortada
                );


                await supabaseClient.storage
                    .from("biblioteca")
                    .remove([
                        rutaArchivo
                    ]);


                restaurarBoton();


                mensaje.style.color =
                    "red";

                mensaje.textContent =
                    "No fue posible subir la portada: " +
                    errorPortada.message;


                return;
            }


            const {
                data: datosPortada
            } =
                supabaseClient.storage
                    .from("biblioteca")
                    .getPublicUrl(
                        rutaPortada
                    );


            urlPortada =
                datosPortada.publicUrl;
        }


        /* =================================
           GUARDAR APORTE EN LA BASE DE DATOS
           ========================================= */

        const {
            error: errorTabla
        } =
            await supabaseClient
                .from("documentos")
                .insert({

                    titulo:
                        tituloValor,

                    autor:
                        autorValor,

                    descripcion:
                        descripcionValor ||
                        null,

                    categoria:
                        categoriaValor,

                    archivo_url:
                        urlArchivo,

                    archivo_nombre:
                        archivoFile.name,

                    tipo_archivo:
                        archivoFile.type ||
                        "archivo",

                    portada_url:
                        urlPortada,

                    portada_path:
                        rutaPortada,

                    usuario_id:
                        session.user.id,

                    /*
                     * Nombre de la persona que
                     * realizó el aporte.
                     */

                    nombre_colaborador:
                        nombreColaboradorValor,

                    /*
                     * Autorización para mostrar
                     * públicamente su nombre.
                     */

                    mostrar_colaborador:
                        mostrarColaboradorValor,

                    /*
                     * Todo aporte del colaborador
                     * debe ser revisado primero.
                     */

                    estado:
                        "pendiente"
                });


        /* =================================
           ERROR AL GUARDAR
           ================================= */

        if (errorTabla) {

            console.error(
                "Error al registrar aporte:",
                errorTabla
            );


            const archivosAEliminar =
                [rutaArchivo];


            if (rutaPortada) {

                archivosAEliminar.push(
                    rutaPortada
                );

            }


            await supabaseClient.storage
                .from("biblioteca")
                .remove(
                    archivosAEliminar
                );


            restaurarBoton();


            mensaje.style.color =
                "red";

            mensaje.textContent =
                "No fue posible registrar el aporte: " +
                errorTabla.message;


            return;
        }


        /* =================================
           APORTE ENVIADO
           ================================= */

        restaurarBoton();


        mensaje.style.color =
            "green";

        mensaje.textContent =
            "Tu aporte fue enviado correctamente y quedó pendiente de revisión antes de su publicación.";


        /*
         * Limpiamos los datos del documento.
         * Conservamos el nombre del colaborador
         * para facilitar otro aporte.
         */

        titulo.value = "";
        autor.value = "";
        descripcion.value = "";

        categoria.selectedIndex =
            0;

        portada.value = "";
        archivo.value = "";

        mostrarColaborador.checked =
            false;
    }
);


/* =========================================
   RESTAURAR BOTÓN
   ========================================= */

function restaurarBoton() {

    botonEnviar.disabled =
        false;

    botonEnviar.textContent =
        "Enviar para revisión";
}


/* =========================================
   INICIAR
   ========================================= */

cargarDatosColaborador();