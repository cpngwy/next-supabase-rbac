import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminForUser } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // profiles -> roles is the FK join used for role name/permissions
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id,name,email,role_id, roles ( id, name, permissions )")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const users =
    data?.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role_id: row.role_id,
      role_name: row.roles?.name ?? null,
      permissions: row.roles?.permissions ?? [],
    })) ?? [];

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = createUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Find default "User" role if role_id wasn't provided.
  let roleId = parsed.data.role_id;
  if (!roleId) {
    const { data: roleRow, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id")
      .eq("name", "User")
      .single();

    if (roleError || !roleRow?.id) {
      return NextResponse.json(
        { error: roleError?.message ?? 'Default role "User" missing.' },
        { status: 400 },
      );
    }

    roleId = roleRow.id;
  }

  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { name: parsed.data.name },
    });

  if (authError || !authUser?.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Could not create user." },
      { status: 400 },
    );
  }

  const createdUserId = authUser.user.id;

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: createdUserId,
    name: parsed.data.name,
    email: parsed.data.email,
    role_id: roleId,
  });

  if (profileError) {
    // Best-effort cleanup if profile insert fails.
    await supabaseAdmin.auth.admin.deleteUser(createdUserId);
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

