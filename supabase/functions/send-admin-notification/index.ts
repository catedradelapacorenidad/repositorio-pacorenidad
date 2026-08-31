import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.catedradelapacorenidad.com",
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

    const nombre = String(
      cuerpo.nombre ?? ""
    ).trim();

    const correo = String(
      cuerpo.correo ?? ""
    ).trim();

    const telefono = String(
      cuerpo.telefono ?? ""
    ).trim();

    const institucion = String(
      cuerpo.institucion ?? ""
    ).trim();

    const municipio = String(
      cuerpo.municipio ?? ""
    ).trim();

    const mensaje = String(
      cuerpo.mensaje ?? ""
    ).trim();

    if (!nombre || !correo) {
      return respuesta(
        {
          error:
            "Faltan los datos de la solicitud.",
        },
        400,
      );
    }

    const nombreSeguro = escaparHTML(nombre);
    const correoSeguro = escaparHTML(correo);
    const telefonoSeguro =
      escaparHTML(telefono || "No registrado");
    const institucionSegura =
      escaparHTML(institucion || "No registrada");
    const municipioSeguro =
      escaparHTML(municipio || "No registrado");
    const mensajeSeguro =
      escaparHTML(mensaje || "Sin mensaje");

    const correoResend = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({

          from:
            "Cátedra de la Pacoreñidad <notificaciones@catedradelapacorenidad.com>",

          // CORREO DEL ADMINISTRADOR
          to: ["proferaulandres@gmail.com"],

          subject:
            `Nueva solicitud de colaborador: ${nombre}`,

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
                          0 8px 24px rgba(0,0,0,0.10);
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
                            Nueva solicitud de colaboración
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
                            Nueva solicitud pendiente
                          </h2>

                          <p
                            style="
                              font-size:16px;
                              line-height:1.7;
                            "
                          >
                            Una persona ha solicitado
                            participar como colaborador
                            de la Cátedra de la
                            Pacoreñidad.
                          </p>

                          <table
                            width="100%"
                            cellspacing="0"
                            cellpadding="10"
                            style="
                              margin:22px 0;
                              background:#f7f5ef;
                              border-radius:10px;
                            "
                          >

                            <tr>
                              <td>
                                <strong>Nombre:</strong>
                              </td>

                              <td>
                                ${nombreSeguro}
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <strong>Correo:</strong>
                              </td>

                              <td>
                                ${correoSeguro}
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <strong>Teléfono:</strong>
                              </td>

                              <td>
                                ${telefonoSeguro}
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <strong>Institución:</strong>
                              </td>

                              <td>
                                ${institucionSegura}
                              </td>
                            </tr>

                            <tr>
                              <td>
                                <strong>Municipio:</strong>
                              </td>

                              <td>
                                ${municipioSeguro}
                              </td>
                            </tr>

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
                              border-left:
                                4px solid #c9a227;
                              line-height:1.6;
                            "
                          >
                            ${mensajeSeguro}
                          </div>

                          <div
                            style="
                              text-align:center;
                              margin-top:30px;
                            "
                          >

                            <a
                              href="https://www.catedradelapacorenidad.com/administrar-solicitudes.html"
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
                              Revisar solicitud
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