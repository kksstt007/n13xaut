// Popular countries for auth country picker (Bybit-style).
// dial = international dialing prefix without leading +.
export type Country = {
  code: string;   // ISO-2
  name: string;
  dial: string;   // e.g. "1", "44", "95"
  flag: string;   // emoji
};

export const COUNTRIES: Country[] = [
  { code: "AU", name: "Australia",      dial: "61",  flag: "🇦🇺" },
  { code: "BR", name: "Brazil",         dial: "55",  flag: "🇧🇷" },
  { code: "CA", name: "Canada",         dial: "1",   flag: "🇨🇦" },
  { code: "CN", name: "China",          dial: "86",  flag: "🇨🇳" },
  { code: "FR", name: "France",         dial: "33",  flag: "🇫🇷" },
  { code: "DE", name: "Germany",        dial: "49",  flag: "🇩🇪" },
  { code: "HK", name: "Hong Kong",      dial: "852", flag: "🇭🇰" },
  { code: "IN", name: "India",          dial: "91",  flag: "🇮🇳" },
  { code: "ID", name: "Indonesia",      dial: "62",  flag: "🇮🇩" },
  { code: "IT", name: "Italy",          dial: "39",  flag: "🇮🇹" },
  { code: "JP", name: "Japan",          dial: "81",  flag: "🇯🇵" },
  { code: "MY", name: "Malaysia",       dial: "60",  flag: "🇲🇾" },
  { code: "MX", name: "Mexico",         dial: "52",  flag: "🇲🇽" },
  { code: "MM", name: "Myanmar",        dial: "95",  flag: "🇲🇲" },
  { code: "NL", name: "Netherlands",    dial: "31",  flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand",    dial: "64",  flag: "🇳🇿" },
  { code: "PH", name: "Philippines",    dial: "63",  flag: "🇵🇭" },
  { code: "SA", name: "Saudi Arabia",   dial: "966", flag: "🇸🇦" },
  { code: "SG", name: "Singapore",      dial: "65",  flag: "🇸🇬" },
  { code: "KR", name: "South Korea",    dial: "82",  flag: "🇰🇷" },
  { code: "ZA", name: "South Africa",   dial: "27",  flag: "🇿🇦" },
  { code: "ES", name: "Spain",          dial: "34",  flag: "🇪🇸" },
  { code: "CH", name: "Switzerland",    dial: "41",  flag: "🇨🇭" },
  { code: "TW", name: "Taiwan",         dial: "886", flag: "🇹🇼" },
  { code: "TH", name: "Thailand",       dial: "66",  flag: "🇹🇭" },
  { code: "TR", name: "Turkey",         dial: "90",  flag: "🇹🇷" },
  { code: "AE", name: "UAE",            dial: "971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dial: "44",  flag: "🇬🇧" },
  { code: "US", name: "United States",  dial: "1",   flag: "🇺🇸" },
  { code: "VN", name: "Vietnam",        dial: "84",  flag: "🇻🇳" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

// Build a synthetic email so phone-based accounts work with Supabase email/password
// without requiring an SMS provider. Format is stable so login can re-derive it.
export function phoneToSyntheticEmail(dial: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `p${dial}${digits}@phone.xaut.trade`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}
