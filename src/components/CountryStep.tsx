import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { CountryPicker } from "@/components/CountryPicker";
import type { Country } from "@/lib/countries-list";

export function CountryStep({
  country,
  onChange,
  onContinue,
  title,
}: {
  country: Country;
  onChange: (c: Country) => void;
  onContinue: () => void;
  title: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Logo />
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Step 1 of 2 · {title}</p>
          <h2 className="mt-2 text-2xl font-display font-bold">Select your country / region</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your country of residence to continue.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Country / Region</label>
          <CountryPicker value={country} onChange={onChange} showDial />
        </div>
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-lg bg-gradient-gold py-3 text-sm font-semibold text-primary-foreground"
        >
          Continue
        </button>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export function CountryChip({ country, onChange }: { country: Country; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-input px-4 py-2.5 text-sm">
      <span className="truncate">
        {country.flag} {country.name} <span className="text-muted-foreground">(+{country.dial})</span>
      </span>
      <button type="button" onClick={onChange} className="text-xs font-medium text-gold hover:underline">
        Change
      </button>
    </div>
  );
}
