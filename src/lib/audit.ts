import { writeAuditLog, writeLoginHistory } from "./audit.functions";

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
    await writeAuditLog({
      data: {
        action: opts.action,
        target: opts.target ?? null,
        target_type: opts.target_type ?? null,
        target_id: opts.target_id ?? null,
        prev_value: opts.prev_value ?? null,
        new_value: opts.new_value ?? null,
        device_info: deviceInfo(),
      },
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

export async function logLogin(success: boolean, failure_reason?: string) {
  try {
    await writeLoginHistory({
      data: {
        success,
        failure_reason: failure_reason ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        device_info: deviceInfo(),
      },
    });
  } catch (e) {
    console.warn("login history failed", e);
  }
}
