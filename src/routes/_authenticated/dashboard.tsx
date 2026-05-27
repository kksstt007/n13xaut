import { createFileRoute } from "@tanstack/react-router";
import { LandingContent } from "@/routes/index";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — XAUT.trade" }] }),
  component: Dashboard,
});

function Dashboard() {
  // Break out of AppShell's max-w-3xl px-4 pt-4 pb-28 container so the
  // landing sections render full-bleed like the public home page.
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen -mt-4 -mb-28 md:-mb-32">
      <LandingContent />
    </div>
  );
}
