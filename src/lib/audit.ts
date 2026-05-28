import { supabase } from "@/integrations/supabase/client";

function deviceInfo() {
  if (typeof navigator === "undefined") return {};
  return {
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : null,
  };
}

export async function logAudit(opts: {
  action: string;
  target?: string;
  target_type?: string;
  target_id?: string;
  prev_value?: unknown;
  new_value?: unknown;
}) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_log").insert({
      actor_id: data.user.id,
      action: opts.action,
      target: opts.target ?? null,
      target_type: opts.target_type ?? null,
      target_id: opts.target_id ?? null,
      prev_value: (opts.prev_value ?? null) as any,
      new_value: (opts.new_value ?? null) as any,
      device_info: deviceInfo() as any,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

export async function logLogin(success: boolean, failure_reason?: string) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("login_history").insert({
      user_id: data.user.id,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      device_info: deviceInfo() as any,
      success,
      failure_reason: failure_reason ?? null,
    });
  } catch (e) {
    console.warn("login history failed", e);
  }
}
