import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminForUser } from "@/lib/adminCheck";

export const dynamic = "force-dynamic";

const createRoleSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("roles")
    .select("id,name,permissions")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ roles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient(req);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminForUser(supabase, userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json();
  const parsed = createRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("roles")
    .insert({
      name: parsed.data.name,
      permissions: parsed.data.permissions,
    })
    .select("id,name,permissions")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ role: data });
}

