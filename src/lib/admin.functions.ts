import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      newPassword: z.string().min(8).max(128),
    })
  )
  .handler(async ({ data, context }) => {
    // Verify caller is admin or super_admin
    const { data: roles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error("Failed to verify role");
    const isAdmin = !!roles?.some((r: any) =>
      ["admin", "super_admin"].includes(r.role)
    );
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { password: data.newPassword }
    );
    if (error) throw new Error(error.message);

    // Audit log
    await context.supabase.from("audit_log").insert({
      actor_id: context.userId,
      action: "user.password.reset",
      target_type: "user",
      target_id: data.userId,
    });

    return { ok: true };
  });
