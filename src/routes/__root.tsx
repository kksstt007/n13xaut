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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-gradient-gold px-4 py-2 text-sm text-primary-foreground">Try again</button>
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
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a0b9e52-fc42-44e7-9808-620a4b58e8a6/id-preview-8c68a6c2--b20ed8f4-5e58-41ff-8613-ed2367b362ad.lovable.app-1779908274478.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4a0b9e52-fc42-44e7-9808-620a4b58e8a6/id-preview-8c68a6c2--b20ed8f4-5e58-41ff-8613-ed2367b362ad.lovable.app-1779908274478.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
    scripts: [
      { src: "https://plugin-code.salesmartly.com/js/project_738986_763150_1780811811.js", async: true },
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthSync />
        <Outlet />
        <Toaster richColors position="top-right" theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
