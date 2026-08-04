import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface SolicitudPayload {
  solicitud_id?: number | string;
}

function responder(
  cuerpo: Record<string, unknown>,
  estado = 200,
): Response {
  return Response.json(cuerpo, {
    status: estado,
  });
}

export default {
  fetch: withSupabase(
    { auth: "user" },

    async (req, ctx) => {
      try {
        if (req.method !== "POST") {
          return responder(
            { error: "Método no permitido." },
            405,
          );
        }

        const payload =
          (await req.json()) as SolicitudPayload;

        const solicitudId = payload.solicitud_id;

        if (!solicitudId) {
          return responder(
            { error: "Falta el ID de la solicitud." },
            400,
          );
        }

        const claims = ctx.userClaims as
          | Record<string, unknown>
          | undefined;

        const administradorId =
          String(
            claims?.sub ??
              claims?.id ??
              "",
          );

        if (!administradorId) {
          return responder(
            {
              error:
                "No fue posible identificar al usuario conectado.",
            },
            401,
          );
        }

        /*
         * Verificar que la persona conectada
         * realmente sea administradora.
         */
        const {
          data: perfilAdministrador,
          error: errorPerfilAdministrador,
        } = await ctx.supabaseAdmin
          .from("profiles")
          .select("rol")
          .eq("id", administradorId)
          .maybeSingle();

        if (errorPerfilAdministrador) {
          console.error(
            "Error consultando administrador:",
            errorPerfilAdministrador,
          );

          return responder(
            {
              error:
                "No fue posible verificar tus permisos.",
            },
            500,
          );
        }

        if (
          !perfilAdministrador ||
          perfilAdministrador.rol !== "administrador"
        ) {
          return responder(
            {
              error:
                "No tienes permisos para aprobar colaboradores.",
            },
            403,
          );
        }

        /*
         * Buscar la solicitud.
         */
        const {
          data: solicitud,
          error: errorSolicitud,
        } = await ctx.supabaseAdmin
          .from("solicitudes_colaborador")
          .select(
            "id, nombre, correo, estado",
          )
          .eq("id", solicitudId)
          .maybeSingle();

        if (errorSolicitud) {
          console.error(
            "Error consultando solicitud:",
            errorSolicitud,
          );

          return responder(
            {
              error:
                "No fue posible consultar la solicitud.",
            },
            500,
          );
        }

        if (!solicitud) {
          return responder(
            { error: "La solicitud no existe." },
            404,
          );
        }

        if (solicitud.estado === "aprobada") {
          return responder(
            {
              error:
                "Esta solicitud ya fue aprobada anteriormente.",
            },
            409,
          );
        }

        if (!solicitud.correo) {
          return responder(
            {
              error:
                "La solicitud no tiene un correo válido.",
            },
            400,
          );
        }

        /*
         * Crear el usuario y enviarle
         * la invitación por correo.
         */
        const {
          data: invitacion,
          error: errorInvitacion,
        } =
          await ctx.supabaseAdmin.auth.admin
            .inviteUserByEmail(
              solicitud.correo,
              {
                data: {
                  nombre: solicitud.nombre,
                  rol: "colaborador",
                },

                redirectTo:
                  "https://www.catedradelapacorenidad.com/restablecer-contrasena.html",
              },
            );

        if (errorInvitacion) {
          console.error(
            "Error invitando usuario:",
            errorInvitacion,
          );

          return responder(
            {
              error:
                "No fue posible enviar la invitación.",
              detalle: errorInvitacion.message,
            },
            400,
          );
        }

        const usuarioId =
          invitacion.user?.id;

        if (!usuarioId) {
          return responder(
            {
              error:
                "Supabase no devolvió el ID del nuevo usuario.",
            },
            500,
          );
        }

        /*
         * Crear o actualizar su perfil.
         * Solo usamos columnas que ya sabemos
         * que existen: id y rol.
         */
        const {
          error: errorPerfilColaborador,
        } = await ctx.supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: usuarioId,
              rol: "colaborador",
            },
            {
              onConflict: "id",
            },
          );

        if (errorPerfilColaborador) {
          console.error(
            "Error creando perfil:",
            errorPerfilColaborador,
          );

          return responder(
            {
              error:
                "La invitación fue enviada, pero no fue posible crear el perfil.",
              detalle:
                errorPerfilColaborador.message,
            },
            500,
          );
        }

        /*
         * Marcar la solicitud como aprobada.
         */
        const {
          error: errorActualizarSolicitud,
        } = await ctx.supabaseAdmin
          .from("solicitudes_colaborador")
          .update({
            estado: "aprobada",
            reviewed_at:
              new Date().toISOString(),
            reviewed_by:
              administradorId,
          })
          .eq("id", solicitudId);

        if (errorActualizarSolicitud) {
          console.error(
            "Error actualizando solicitud:",
            errorActualizarSolicitud,
          );

          return responder(
            {
              error:
                "El usuario fue invitado, pero no se pudo actualizar la solicitud.",
              detalle:
                errorActualizarSolicitud.message,
            },
            500,
          );
        }

        return responder({
          ok: true,
          mensaje:
            "Colaborador creado e invitación enviada correctamente.",
          usuario_id: usuarioId,
        });
      } catch (error) {
        console.error(
          "Error inesperado:",
          error,
        );

        return responder(
          {
            error:
              "Ocurrió un error inesperado.",
            detalle:
              error instanceof Error
                ? error.message
                : String(error),
          },
          500,
        );
      }
    },
  ),
};