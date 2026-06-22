import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const auditInput = z.object({
  action: z.string().min(1).max(128),
  target: z.string().max(256).nullish(),
  target_type: z.string().max(64).nullish(),
  target_id: z.string().max(128).nullish(),
  prev_value: z.unknown().nullish(),
  new_value: z.unknown().nullish(),
  device_info: z.record(z.unknown()).nullish(),
});

export const writeAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => auditInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("audit_log").insert({
      actor_id: context.userId, // forced from verified JWT — cannot be spoofed
      action: data.action,
      target: data.target ?? null,
      target_type: data.target_type ?? null,
      target_id: data.target_id ?? null,
      prev_value: (data.prev_value ?? null) as any,
      new_value: (data.new_value ?? null) as any,
      device_info: (data.device_info ?? null) as any,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const loginInput = z.object({
  success: z.boolean(),
  failure_reason: z.string().max(256).nullish(),
  user_agent: z.string().max(512).nullish(),
  device_info: z.record(z.unknown()).nullish(),
});

export const writeLoginHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => loginInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("login_history").insert({
      user_id: context.userId,
      user_agent: data.user_agent ?? null,
      device_info: (data.device_info ?? null) as any,
      success: data.success,
      failure_reason: data.failure_reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
