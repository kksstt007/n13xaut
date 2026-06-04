import logoAsset from "@/assets/xaut-trade-logo.svg.asset.json";

export function Logo({ height = 32 }: { height?: number; size?: number; showWordmark?: boolean }) {
  // SVG intrinsic ratio is 137:43 (~3.186)
  const width = Math.round(height * (137 / 43));
  return (
    <img
      src={logoAsset.url}
      alt="XAUT.trade"
      width={width}
      height={height}
      className="block object-contain drop-shadow-[0_2px_8px_rgba(232,198,87,0.25)]"
      style={{ width, height }}
    />
  );
}
