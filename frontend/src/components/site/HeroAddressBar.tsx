import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PrimaryAction, T } from "@/components/site/site-system";

type HeroAddressBarProps = {
  defaultValue?: string;
  buttonLabel?: string;
  navigateTo?: string;
  onSubmit?: (address: string) => void;
  testIdPrefix?: string;
  accent?: "primary" | "blue";
};

export function HeroAddressBar({
  defaultValue = "",
  buttonLabel = "Generate Estimate",
  navigateTo,
  onSubmit,
  testIdPrefix = "hero-address",
  accent = "primary",
}: HeroAddressBarProps) {
  const navigate = useNavigate();
  const [address, setAddress] = useState(defaultValue);

  useEffect(() => {
    setAddress(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = address.trim();
    if (!value) return;

    onSubmit?.(value);
    if (navigateTo) {
      navigate(`${navigateTo}?address=${encodeURIComponent(value)}`);
    }
  };

  const accentColor = accent === "blue" ? T.accent : T.primary;

  return (
    <form
      id={testIdPrefix}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[2rem] border bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 focus-within:-translate-y-[2px] md:flex-row md:items-center"
      style={{ borderColor: T.border }}
      data-testid={`${testIdPrefix}-form`}
    >
      <div className="flex items-center gap-3 px-2" style={{ color: T.textSecondary }}>
        <MapPin className="h-5 w-5" style={{ color: accentColor }} />
        <span className="hidden text-xs font-bold uppercase tracking-[0.22em] md:inline">
          Property address
        </span>
      </div>
      <input
        type="text"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="Enter property address"
        className="h-12 flex-1 rounded-full border border-transparent px-5 text-sm outline-none"
        style={{
          background: T.surfaceMuted,
          color: T.textPrimary,
        }}
        data-testid={`${testIdPrefix}-input`}
      />
      <PrimaryAction className="py-3.5" onClick={() => void handleSubmit()}>
        <Sparkles className="h-4 w-4" />
        {buttonLabel}
      </PrimaryAction>
    </form>
  );
}
