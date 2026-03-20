import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminForUser } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role_id: z.string().uuid().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = updateUserSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Auth user updates (email/password) are handled via service role.
  const authUpdate: { email?: string; password?: string } = {};
  if (parsed.data.email !== undefined) authUpdate.email = parsed.data.email;
  if (parsed.data.password !== undefined) authUpdate.password = parsed.data.password;

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(params.userId, authUpdate);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
  }

  const profileUpdate: { name?: string; email?: string; role_id?: string | null } =
    {};
  if (parsed.data.name !== undefined) profileUpdate.name = parsed.data.name;
  if (parsed.data.email !== undefined) profileUpdate.email = parsed.data.email;

  if (parsed.data.role_id !== undefined) {
    profileUpdate.role_id = parsed.data.role_id;
  }

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", params.userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(params.userId);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Best-effort: remove profile row too (depends on FK delete behavior).
  await supabaseAdmin.from("profiles").delete().eq("id", params.userId);

  return NextResponse.json({ ok: true });
}

