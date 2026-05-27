export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-md bg-gradient-gold grid place-items-center font-bold text-primary-foreground shadow-gold"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        X
      </div>
      <span className="font-display text-lg font-semibold tracking-tight">
        XAUT<span className="text-gradient-gold">.trade</span>
      </span>
    </div>
  );
}
