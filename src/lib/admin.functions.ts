import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error("Failed to verify role");
  const isAdmin = !!roles?.some((r: any) =>
    ["admin", "super_admin"].includes(r.role)
  );
  if (!isAdmin) throw new Error("Forbidden");
}

export const adminResetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      newPassword: z.string().min(8).max(128),
    })
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      { password: data.newPassword }
    );
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_log").insert({
      actor_id: context.userId,
      action: "user.password.reset",
      target_type: "user",
      target_id: data.userId,
    });

    return { ok: true };
  });

export const adminGetUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (authErr) throw new Error(authErr.message);

    const uid = data.userId;
    const [profile, wallet, deposits, withdrawals, trades, logins, audit, notes, investments] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabaseAdmin.from("wallets").select("*").eq("user_id", uid).maybeSingle(),
        supabaseAdmin.from("deposits").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("withdrawals").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("trades").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("login_history").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("audit_log").select("*").or(`target_id.eq.${uid},actor_id.eq.${uid}`).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("notifications").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("investments").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(100),
      ]);

    return {
      auth: {
        id: authUser.user?.id ?? uid,
        email: authUser.user?.email ?? null,
        phone: authUser.user?.phone ?? null,
        email_confirmed_at: authUser.user?.email_confirmed_at ?? null,
        phone_confirmed_at: authUser.user?.phone_confirmed_at ?? null,
        last_sign_in_at: authUser.user?.last_sign_in_at ?? null,
        created_at: authUser.user?.created_at ?? null,
      },
      profile: profile.data,
      wallet: wallet.data,
      deposits: deposits.data ?? [],
      withdrawals: withdrawals.data ?? [],
      trades: trades.data ?? [],
      logins: logins.data ?? [],
      audit: audit.data ?? [],
      notifications: notes.data ?? [],
      investments: investments.data ?? [],
    };
  });

export const adminUpdateUserContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      userId: z.string().uuid(),
      email: z.string().email().optional().nullable(),
      phone: z.string().min(3).max(32).optional().nullable(),
    })
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const updates: any = {};
    if (typeof data.email === "string" && data.email.length > 0) {
      updates.email = data.email;
      updates.email_confirm = true;
    }
    if (typeof data.phone === "string") {
      // Update auth.users.phone too (without sending OTP)
      const digits = data.phone.replace(/\D/g, "");
      updates.phone = digits || null;
      if (digits) updates.phone_confirm = true;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        data.userId,
        updates
      );
      if (error) throw new Error(error.message);
    }

    // Mirror phone into profiles for app-side queries
    if (typeof data.phone === "string") {
      await supabaseAdmin
        .from("profiles")
        .update({ phone: data.phone || null })
        .eq("id", data.userId);
    }

    await context.supabase.from("audit_log").insert({
      actor_id: context.userId,
      action: "user.contact.update",
      target_type: "user",
      target_id: data.userId,
      new_value: {
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
    });

    return { ok: true };
  });
