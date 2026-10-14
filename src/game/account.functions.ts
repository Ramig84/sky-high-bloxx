import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Permanently deletes the caller's account and every record tied to it. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => ({ confirm: String(d?.confirm ?? "") }))
  .handler(async ({ data, context }) => {
    if (data.confirm !== "DELETE") throw new Error("Type DELETE to confirm");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    for (const t of ["game_runs", "player_profiles"] as const) {
      const { error } = await supabaseAdmin.from(t).delete().eq("user_id", uid);
      if (error) throw new Error("Could not delete your data; please try again");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error("Could not delete your account; please try again");
    return { ok: true };
  });
