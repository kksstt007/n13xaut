import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";
import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-gold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-gradient-gold px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function isChunkLoadError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return (
    msg.includes("importing a module script failed") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("dynamically imported module") ||
    msg.includes("chunkloaderror") ||
    msg.includes("unknown variable dynamic import")
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const chunkErr = isChunkLoadError(error);

  React.useEffect(() => {
    if (!chunkErr || typeof window === "undefined") return;
    const KEY = "__xaut_chunk_reload__";
    const last = Number(sessionStorage.getItem(KEY) ?? "0");
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  }, [chunkErr]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {chunkErr ? "A new version is available. Reloading…" : (error as Error)?.message}
        </p>
        <button
          onClick={() => {
            if (chunkErr && typeof window !== "undefined") { window.location.reload(); return; }
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-gradient-gold px-4 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "XAUT.trade — Premium XAU/USDT Trading Platform" },
      { name: "description", content: "Trade Tether Gold (XAUT) against USDT with live charts, real-time execution, and institutional-grade tooling." },
      { name: "theme-color", content: "#0B0E11" },
      { property: "og:title", content: "XAUT.trade — Premium XAU/USDT Trading Platform" },
      { property: "og:description", content: "Trade Tether Gold (XAUT) against USDT with live charts, real-time execution, and institutional-grade tooling." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "XAUT.trade — Premium XAU/USDT Trading Platform" },
      { name: "twitter:description", content: "Trade Tether Gold (XAUT) against USDT with live charts, real-time execution, and institutional-grade tooling." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const qc = useQueryClient();
  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function SalesmartlyPositionFix() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Load only after hydration: the widget mutates the document on startup.
    if (!document.getElementById("xaut-live-chat-script")) {
      const script = document.createElement("script");
      script.id = "xaut-live-chat-script";
      script.src = "https://plugin-code.salesmartly.com/js/project_745267_769704_1781238182.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const SELECTORS = [
      "#s-chat-code", "#salesmartly-chat", '[id^="salesmartly"]', '[class*="salesmartly"]',
      "salesmartly-chat-widget", ".ss-widget-container", ".ss-chat-widget",
      ".ss-launcher", "#ss-widget", "#ss-launcher",
    ];
    const apply = (el: HTMLElement) => {
      el.style.setProperty("bottom", "calc(env(safe-area-inset-bottom, 0px) + 120px)", "important");
      el.style.setProperty("z-index", "30", "important");
    };
    const fix = () => {
      for (const sel of SELECTORS) {
        document.querySelectorAll<HTMLElement>(sel).forEach(apply);
      }
    };
    fix();
    // Observe DOM for the async widget instead of polling forever.
    const mo = new MutationObserver(() => fix());
    mo.observe(document.body, { childList: true, subtree: true });
    // Stop observing after the widget settles (~10s) to avoid perf cost.
    const stopId = window.setTimeout(() => mo.disconnect(), 10_000);

    // Silence noisy 3rd-party widget rejections (network/timeout/dynamic import)
    // so they don't surface in our runtime error UI.
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as any)?.message ?? e.reason ?? "");
      if (/salesmartly|widget-v2|chunk-common|Network Error|timeout of \d+ms|Unknown variable dynamic import/i.test(msg)) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      mo.disconnect();
      window.clearTimeout(stopId);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthSync />
        <SalesmartlyPositionFix />
        <Outlet />
        <Toaster richColors position="top-right" theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
