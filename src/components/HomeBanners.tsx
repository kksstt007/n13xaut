import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import tradeImage from "@/assets/home-gold-trade.jpg";
import investImage from "@/assets/home-gold-invest.jpg";

const banners = [
  { image: tradeImage, title: "Trade gold.", subtitle: "XAU₮ / USDT", detail: "Your next position starts here.", action: "Open trading", to: "/trade" as const, alt: "Gold bullion bars on a dark studio surface" },
  { image: investImage, title: "Gold Earn.", subtitle: "GOLD INVESTMENT", detail: "Explore plans. Manage your portfolio.", action: "Explore plans", to: "/invest" as const, alt: "Stacked gold bullion bars and a gold coin" },
];

export function HomeBanners() {
  const [active, setActive] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(true);
  const [visible, setVisible] = React.useState(true);
  const startX = React.useRef<number | null>(null);
  const move = React.useCallback((direction: number) => setActive((previous) => (previous + direction + banners.length) % banners.length), []);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  React.useEffect(() => {
    if (hovered || focused || reducedMotion || !visible) return;
    const timer = window.setInterval(() => move(1), 6000);
    return () => window.clearInterval(timer);
  }, [hovered, focused, reducedMotion, visible, move]);

  return (
    <section
      className="home-banner relative overflow-hidden rounded-lg border border-border"
      aria-label="Gold highlights" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onPointerDown={(event) => { if (event.pointerType === "touch") startX.current = event.clientX; }}
      onPointerCancel={() => { startX.current = null; }}
      onPointerUp={(event) => {
        if (startX.current !== null && Math.abs(event.clientX - startX.current) > 45) move(event.clientX < startX.current ? 1 : -1);
        startX.current = null;
      }}
    >
      <div className={`home-banner-track ${active === 1 ? "home-banner-second" : ""}`}>
        {banners.map((banner, index) => (
          <div key={banner.to} className="home-banner-slide relative shrink-0 w-full" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${banners.length}`} aria-hidden={active !== index} inert={active !== index}>
            <img src={banner.image} alt={banner.alt} width={1536} height={768} loading={index === 0 ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />
            <div className="relative z-10 flex h-full flex-col items-start justify-center px-5 pb-8 sm:px-7 w-[60%]">
              <p className="text-[9px] sm:text-[10px] font-semibold text-gold mb-2">{banner.subtitle}</p>
              <h2 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-normal">{banner.title}</h2>
              <p className="text-[11px] sm:text-xs text-foreground/70 mt-2 max-w-44 leading-relaxed">{banner.detail}</p>
              <Button asChild size="sm" className="mt-4 text-[11px] shadow-none">
                <Link to={banner.to} tabIndex={active === index ? 0 : -1}>{banner.action}<ArrowUpRight /></Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-2 flex justify-center">
        <div className="flex gap-1" aria-label="Choose banner">
          {banners.map((banner, index) => (
            <Button key={banner.to} variant="ghost" size="icon" className="h-7 w-6 hover:bg-transparent" aria-label={`Show ${banner.title.replace(".", "")} banner`} aria-pressed={active === index} onClick={() => setActive(index)}>
              <span className={`size-1.5 rounded-full transition-colors ${active === index ? "bg-gold" : "bg-foreground/30"}`} />
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}