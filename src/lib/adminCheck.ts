export async function isAdminForUser(
  supabase: any,
  userId: string,
): Promise<boolean> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.role_id) return false;

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("name")
    .eq("id", profile.role_id)
    .single();

  if (roleError || !role?.name) return false;

  return role.name === "Admin";
}

