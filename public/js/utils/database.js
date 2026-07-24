// ===============================
// GUARDAR REGISTRO
// ===============================

export async function guardarRegistro(
    supabaseClient,
    tabla,
    datos
) {

    const { data, error } = await supabaseClient
        .from(tabla)
        .insert(datos)
        .select()
        .single();

    if (error) throw error;

    return data;
}


// ===============================
// LISTAR REGISTROS
// ===============================

export async function listarRegistros(
    supabaseClient,
    tabla,
    orden = "created_at"
) {

    const { data, error } = await supabaseClient
        .from(tabla)
        .select("*")
        .order(orden, { ascending: false });

    if (error) throw error;

    return data;
}


// ===============================
// OBTENER UN REGISTRO
// ===============================

export async function obtenerRegistro(
    supabaseClient,
    tabla,
    id
) {

    const { data, error } = await supabaseClient
        .from(tabla)
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;

    return data;
}


// ===============================
// ACTUALIZAR
// ===============================

export async function actualizarRegistro(
    supabaseClient,
    tabla,
    id,
    datos
) {

    const { data, error } = await supabaseClient
        .from(tabla)
        .update(datos)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;

    return data;
}


// ===============================
// ELIMINAR
// ===============================

export async function eliminarRegistro(
    supabaseClient,
    tabla,
    id
) {

    const { error } = await supabaseClient
        .from(tabla)
        .delete()
        .eq("id", id);

    if (error) throw error;

    return true;
}