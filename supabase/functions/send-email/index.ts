import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respuesta(
      { error: "Método no permitido." },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
      console.error("Faltan variables de entorno.");

      return respuesta(
        { error: "La función no está configurada correctamente." },
        500,
      );
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return respuesta(
        { error: "Debes iniciar sesión." },
        401,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return respuesta(
        { error: "La sesión no es válida." },
        401,
      );
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .maybeSingle();

    if (
      perfilError ||
      !perfil ||
      perfil.rol !== "administrador"
    ) {
      return respuesta(
        { error: "No tienes permisos para enviar este correo." },
        403,
      );
    }

    const cuerpo = await req.json();

    const correo = String(cuerpo.correo ?? "").trim();
    const nombre = String(cuerpo.nombre ?? "").trim();

    if (!correo || !nombre) {
      return respuesta(
        { error: "El nombre y el correo son obligatorios." },
        400,
      );
    }

    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    if (!correoValido) {
      return respuesta(
        { error: "El correo electrónico no es válido." },
        400,
      );
    }

    const nombreSeguro = escaparHTML(nombre);

    const correoResend = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            "Cátedra de la Pacoreñidad <colaboradores@catedradelapacorenidad.com>",
          to: [correo],
          subject:
            "Bienvenido como colaborador de la Cátedra de la Pacoreñidad",
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
                  style="background:#f5f2eb;padding:30px 15px;"
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
                          box-shadow:0 8px 24px rgba(0,0,0,0.10);
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
                                font-size:28px;
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
                              Conociendo nuestras raíces,
                              construimos futuro
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:36px 34px;">

                            <h2
                              style="
                                margin:0 0 20px;
                                color:#184d2b;
                                font-size:24px;
                              "
                            >
                              ¡Bienvenido, ${nombreSeguro}!
                            </h2>

                            <p
                              style="
                                margin:0 0 18px;
                                font-size:16px;
                                line-height:1.7;
                              "
                            >
                              Nos alegra informarte que tu solicitud
                              para participar como colaborador de la
                              <strong>Cátedra de la Pacoreñidad</strong>
                              ha sido aprobada.
                            </p>

                            <p
                              style="
                                margin:0 0 18px;
                                font-size:16px;
                                line-height:1.7;
                              "
                            >
                              Desde ahora podrás vincularte al proceso
                              de construcción colectiva de este
                              repositorio, compartir aportes y contribuir
                              a la preservación de la historia, la cultura,
                              el patrimonio y la identidad de Pácora.
                            </p>

                            <p
                              style="
                                margin:0 0 26px;
                                font-size:16px;
                                line-height:1.7;
                              "
                            >
                              Gracias por querer sumar tus conocimientos,
                              experiencias y capacidades a este proyecto
                              educativo y cultural.
                            </p>

                            <table
                              role="presentation"
                              cellspacing="0"
                              cellpadding="0"
                              border="0"
                              align="center"
                            >
                              <tr>
                                <td
                                  style="
                                    background:#a87528;
                                    border-radius:8px;
                                  "
                                >
                                  <a
                                    href="https://www.catedradelapacorenidad.com/login.html"
                                    target="_blank"
                                    style="
                                      display:inline-block;
                                      padding:14px 25px;
                                      color:#ffffff;
                                      text-decoration:none;
                                      font-weight:bold;
                                      font-size:16px;
                                    "
                                  >
                                    Ingresar a la plataforma
                                  </a>
                                </td>
                              </tr>
                            </table>

                          </td>
                        </tr>

                        <tr>
                          <td
                            style="
                              padding:22px 30px;
                              background:#eee9df;
                              text-align:center;
                              color:#666666;
                              font-size:13px;
                              line-height:1.5;
                            "
                          >
                            Este mensaje fue enviado automáticamente por
                            la plataforma de la Cátedra de la Pacoreñidad.
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

    const resultadoResend = await correoResend.json();

    if (!correoResend.ok) {
      console.error(
        "Error enviado por Resend:",
        resultadoResend,
      );

      return respuesta(
        {
          error: "No fue posible enviar el correo.",
          detalle: resultadoResend,
        },
        502,
      );
    }

    return respuesta({
      success: true,
      message: "Correo enviado correctamente.",
      id: resultadoResend.id,
    });
  } catch (error) {
    console.error("Error en send-email:", error);

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