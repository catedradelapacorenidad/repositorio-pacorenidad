import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://www.catedradelapacorenidad.com",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respuesta(
  contenido: Record<string, unknown>,
  estado = 200,
): Response {
  return new Response(JSON.stringify(contenido), {
    status: estado,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escaparHTML(valor: unknown): string {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function crearFila(
  etiqueta: string,
  valor: unknown,
): string {
  const valorSeguro =
    escaparHTML(valor || "No registrado");

  return `
    <tr>
      <td
        style="
          padding:10px;
          font-weight:bold;
          vertical-align:top;
          width:35%;
        "
      >
        ${escaparHTML(etiqueta)}:
      </td>

      <td
        style="
          padding:10px;
          vertical-align:top;
        "
      >
        ${valorSeguro}
      </td>
    </tr>
  `;
}

Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return respuesta(
      { error: "Método no permitido." },
      405,
    );
  }

  try {

    const resendApiKey =
      Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error(
        "Falta la variable RESEND_API_KEY."
      );

      return respuesta(
        {
          error:
            "La función no está configurada correctamente.",
        },
        500,
      );
    }

    const cuerpo = await req.json();

    const tipoNotificacion = String(
      cuerpo.tipo_notificacion ??
      "solicitud_colaborador"
    ).trim();

    let asunto = "";
    let tituloCorreo = "";
    let introduccion = "";
    let detalleHTML = "";
    let urlBoton = "";
    let textoBoton = "";

    /*
    =========================================
    NUEVA SOLICITUD DE COLABORADOR
    =========================================
    */

    if (
      tipoNotificacion ===
      "solicitud_colaborador"
    ) {

      const nombre =
        String(cuerpo.nombre ?? "").trim();

      const correo =
        String(cuerpo.correo ?? "").trim();

      const telefono =
        String(cuerpo.telefono ?? "").trim();

      const institucion =
        String(cuerpo.institucion ?? "").trim();

      const municipio =
        String(cuerpo.municipio ?? "").trim();

      const mensaje =
        String(cuerpo.mensaje ?? "").trim();

      if (!nombre || !correo) {
        return respuesta(
          {
            error:
              "Faltan los datos de la solicitud.",
          },
          400,
        );
      }

      asunto =
        `Nueva solicitud de colaborador: ${nombre}`;

      tituloCorreo =
        "Nueva solicitud de colaboración";

      introduccion =
        "Una persona ha solicitado participar " +
        "como colaborador de la Cátedra de la " +
        "Pacoreñidad.";

      detalleHTML = `
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            margin:22px 0;
            background:#f7f5ef;
            border-radius:10px;
          "
        >
          ${crearFila("Nombre", nombre)}
          ${crearFila("Correo", correo)}
          ${crearFila("Teléfono", telefono)}
          ${crearFila(
            "Institución",
            institucion
          )}
          ${crearFila("Municipio", municipio)}
        </table>

        <p>
          <strong>
            Motivo para colaborar:
          </strong>
        </p>

        <div
          style="
            padding:16px;
            background:#f7f5ef;
            border-left:4px solid #c9a227;
            line-height:1.6;
          "
        >
          ${escaparHTML(
            mensaje || "Sin mensaje"
          )}
        </div>
      `;

      urlBoton =
        "https://www.catedradelapacorenidad.com/administrar-solicitudes.html";

      textoBoton =
        "Revisar solicitud";
    }

    /*
    =========================================
    NUEVO APORTE
    =========================================
    */

    else if (
      tipoNotificacion === "nuevo_aporte"
    ) {

      const titulo =
        String(cuerpo.titulo ?? "").trim();

      const autor =
        String(cuerpo.autor ?? "").trim();

      const tipoAporte =
        String(cuerpo.tipo_aporte ?? "").trim();

      const categoria =
        String(cuerpo.categoria ?? "").trim();

      const descripcion =
        String(cuerpo.descripcion ?? "").trim();

      if (!titulo) {
        return respuesta(
          {
            error:
              "Falta el título del aporte.",
          },
          400,
        );
      }

      asunto =
        `Nuevo aporte pendiente: ${titulo}`;

      tituloCorreo =
        "Nuevo aporte pendiente de revisión";

      introduccion =
        "Un colaborador ha enviado un nuevo " +
        "aporte a la Cátedra de la Pacoreñidad " +
        "y está pendiente de revisión.";

      detalleHTML = `
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            margin:22px 0;
            background:#f7f5ef;
            border-radius:10px;
          "
        >
          ${crearFila("Título", titulo)}
          ${crearFila("Autor", autor)}
          ${crearFila(
            "Sección",
            tipoAporte
          )}
          ${crearFila(
            "Categoría",
            categoria
          )}
        </table>

        <p>
          <strong>
            Descripción:
          </strong>
        </p>

        <div
          style="
            padding:16px;
            background:#f7f5ef;
            border-left:4px solid #c9a227;
            line-height:1.6;
          "
        >
          ${escaparHTML(
            descripcion ||
            "Sin descripción"
          )}
        </div>
      `;

      urlBoton =
        "https://www.catedradelapacorenidad.com/administrar-articulos.html";

      textoBoton =
        "Revisar aporte";
    }

    /*
    =========================================
    APORTE CORREGIDO
    =========================================
    */

    else if (
      tipoNotificacion ===
      "aporte_corregido"
    ) {

      const titulo =
        String(cuerpo.titulo ?? "").trim();

      const autor =
        String(cuerpo.autor ?? "").trim();

      if (!titulo) {
        return respuesta(
          {
            error:
              "Falta el título del aporte corregido.",
          },
          400,
        );
      }

      asunto =
        `Aporte corregido y reenviado: ${titulo}`;

      tituloCorreo =
        "Aporte corregido y reenviado";

      introduccion =
        "Un colaborador realizó las correcciones " +
        "solicitadas y volvió a enviar su aporte " +
        "para revisión.";

      detalleHTML = `
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="
            margin:22px 0;
            background:#f7f5ef;
            border-radius:10px;
          "
        >
          ${crearFila("Título", titulo)}
          ${crearFila("Autor", autor)}
        </table>
      `;

      urlBoton =
        "https://www.catedradelapacorenidad.com/administrar-articulos.html";

      textoBoton =
        "Revisar aporte corregido";
    }

    /*
    =========================================
    TIPO NO RECONOCIDO
    =========================================
    */

    else {

      return respuesta(
        {
          error:
            "Tipo de notificación no reconocido.",
        },
        400,
      );
    }

    /*
    =========================================
    CONSTRUIR CORREO
    =========================================
    */

    const correoResend = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({

          from:
            "Cátedra de la Pacoreñidad <notificaciones@catedradelapacorenidad.com>",

          to: [
            "proferaulandres@gmail.com"
          ],

          subject: asunto,

          html: `
            <!DOCTYPE html>

            <html lang="es">

            <head>
              <meta charset="UTF-8">

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              >
            </head>

            <body
              style="
                margin:0;
                padding:0;
                background:#f5f2eb;
                font-family:Arial, Helvetica, sans-serif;
                color:#333333;
              "
            >

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  background:#f5f2eb;
                  padding:30px 15px;
                "
              >

                <tr>

                  <td align="center">

                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        max-width:620px;
                        background:#ffffff;
                        border-radius:16px;
                        overflow:hidden;
                        box-shadow:
                          0 8px 24px
                          rgba(0,0,0,0.10);
                      "
                    >

                      <tr>

                        <td
                          style="
                            background:#184d2b;
                            padding:30px;
                            text-align:center;
                          "
                        >

                          <h1
                            style="
                              margin:0;
                              color:#ffffff;
                              font-size:26px;
                              line-height:1.3;
                            "
                          >
                            Cátedra de la Pacoreñidad
                          </h1>

                          <p
                            style="
                              margin:10px 0 0;
                              color:#f1d77a;
                              font-size:16px;
                            "
                          >
                            ${escaparHTML(
                              tituloCorreo
                            )}
                          </p>

                        </td>

                      </tr>

                      <tr>

                        <td
                          style="
                            padding:34px;
                          "
                        >

                          <h2
                            style="
                              color:#184d2b;
                              margin-top:0;
                            "
                          >
                            ${escaparHTML(
                              tituloCorreo
                            )}
                          </h2>

                          <p
                            style="
                              font-size:16px;
                              line-height:1.7;
                            "
                          >
                            ${escaparHTML(
                              introduccion
                            )}
                          </p>

                          ${detalleHTML}

                          <div
                            style="
                              text-align:center;
                              margin-top:30px;
                            "
                          >

                            <a
                              href="${urlBoton}"
                              target="_blank"
                              style="
                                display:inline-block;
                                padding:14px 24px;
                                background:#a87528;
                                color:#ffffff;
                                text-decoration:none;
                                border-radius:8px;
                                font-weight:bold;
                              "
                            >
                              ${escaparHTML(
                                textoBoton
                              )}
                            </a>

                          </div>

                        </td>

                      </tr>

                      <tr>

                        <td
                          style="
                            padding:20px;
                            background:#eee9df;
                            text-align:center;
                            color:#666666;
                            font-size:13px;
                            line-height:1.5;
                          "
                        >
                          Notificación automática del
                          repositorio digital de la
                          Cátedra de la Pacoreñidad.
                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

              </table>

            </body>

            </html>
          `,
        }),
      },
    );

    const resultado =
      await correoResend.json();

    if (!correoResend.ok) {

      console.error(
        "Error enviado por Resend:",
        resultado,
      );

      return respuesta(
        {
          error:
            "No fue posible enviar la notificación.",
          detalle: resultado,
        },
        502,
      );
    }

    return respuesta({
      success: true,
      message:
        "Administrador notificado correctamente.",
      tipo: tipoNotificacion,
      id: resultado.id,
    });

  } catch (error) {

    console.error(
      "Error en send-admin-notification:",
      error,
    );

    return respuesta(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      },
      500,
    );
  }
});