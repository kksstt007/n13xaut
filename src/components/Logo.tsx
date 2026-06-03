import logoAsset from "@/assets/tether-gold-logo.png.asset.json";

export function Logo({ size = 28, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="XAUT.trade"
        width={size}
        height={size}
        className="object-contain drop-shadow-[0_2px_8px_rgba(232,198,87,0.25)]"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight leading-none">
          XAUT<span className="text-gradient-gold">.trade</span>
        </span>
      )}
    </div>
  );
}
