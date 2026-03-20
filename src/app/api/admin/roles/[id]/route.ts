import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminForUser } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = updateRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("roles")
    .update({
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : null),
      ...(parsed.data.permissions !== undefined
        ? { permissions: parsed.data.permissions }
        : null),
    })
    .eq("id", params.id)
    .select("id,name,permissions")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ role: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Note: we need auth info, so use _req for cookies/supabase client.
  const supabase = createSupabaseServerClient(_req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: defaultRole } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("name", "User")
    .maybeSingle();

  const defaultRoleId = defaultRole?.id;
  if (!defaultRoleId) {
    return NextResponse.json({ error: 'Default role "User" missing.' }, { status: 500 });
  }

  // Reassign any profiles currently using the deleted role.
  await supabaseAdmin.from("profiles").update({ role_id: defaultRoleId }).eq("role_id", params.id);

  const { error } = await supabaseAdmin.from("roles").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

