import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SendSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(2000).optional().nullable(),
  type: z.enum(["info", "success", "warning", "alert", "promo"]).default("info"),
  link: z.string().max(500).optional().nullable(),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("all") }),
    z.object({ kind: z.literal("users"), userIds: z.array(z.string().uuid()).min(1).max(10000) }),
  ]),
});

async function assertAdmin(context: any) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error("Failed to verify role");
  const isAdmin = !!roles?.some((r: any) => ["admin", "super_admin"].includes(r.role));
  if (!isAdmin) throw new Error("Forbidden");
}

export const sendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SendSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userIds: string[] = [];
    if (data.target.kind === "all") {
      const { data: users, error } = await supabaseAdmin
        .from("profiles")
        .select("id");
      if (error) throw new Error(error.message);
      userIds = (users ?? []).map((u: any) => u.id);
    } else {
      userIds = data.target.userIds;
    }

    if (userIds.length === 0) return { ok: true, count: 0 };

    const rows = userIds.map((uid) => ({
      user_id: uid,
      title: data.title,
      body: data.body ?? null,
      type: data.type,
      link: data.link ?? null,
      created_by: context.userId,
    }));

    // Chunk inserts for large broadcasts
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const slice = rows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.from("notifications").insert(slice);
      if (error) throw new Error(error.message);
    }

    await context.supabase.from("audit_log").insert({
      actor_id: context.userId,
      action: "notification.send",
      target_type: "notifications",
      new_value: { count: userIds.length, title: data.title, type: data.type, kind: data.target.kind },
    });

    return { ok: true, count: userIds.length };
  });
