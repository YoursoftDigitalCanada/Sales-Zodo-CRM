import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Visual variant for theme differentiation */
  variant?: "minimal" | "friendly" | "enterprise";
  disabled?: boolean;
}

const VARIANT_STYLES: Record<string, { box: string; active: string; filled: string }> = {
  minimal: {
    box: "w-12 h-14 border border-slate-200 rounded-lg bg-white text-center text-xl font-semibold text-slate-900 transition-all duration-200 outline-none",
    active: "border-[#0891B2] ring-2 ring-[#0891B2]/10",
    filled: "border-slate-300 bg-slate-50/50",
  },
  friendly: {
    box: "w-[52px] h-[56px] border-2 border-slate-200 rounded-2xl bg-slate-50 text-center text-xl font-bold text-slate-900 transition-all duration-200 outline-none",
    active: "border-[#0891B2] bg-white ring-3 ring-[#0891B2]/12 scale-105",
    filled: "border-[#0891B2]/40 bg-[#0891B2]/5",
  },
  enterprise: {
    box: "w-11 h-12 border border-slate-300 rounded-md bg-white text-center text-lg font-mono font-semibold text-slate-900 transition-all duration-150 outline-none",
    active: "border-[#0891B2] border-b-2 ring-1 ring-[#0891B2]/8",
    filled: "border-slate-400 bg-slate-50",
  },
};

export function OtpInput({ value, onChange, length = 6, variant = "friendly", disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.friendly;

  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusInput = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, length - 1));
    inputsRef.current[clamped]?.focus();
  }, [length]);

  // Auto-focus first empty input on mount
  useEffect(() => {
    const firstEmpty = digits.findIndex((d) => !d);
    if (firstEmpty >= 0) focusInput(firstEmpty);
    else focusInput(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (idx: number, char: string) => {
    if (disabled) return;
    const sanitized = char.replace(/[^\d]/g, "").slice(0, length);
    if (!sanitized) return;

    const arr = [...digits];
    const nextDigits = sanitized.split("");

    nextDigits.forEach((digit, offset) => {
      const nextIndex = idx + offset;
      if (nextIndex < length) {
        arr[nextIndex] = digit;
      }
    });

    const newValue = arr.join("");
    onChange(newValue);

    focusInput(Math.min(idx + nextDigits.length, length - 1));
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = [...digits];
      if (arr[idx]) {
        arr[idx] = "";
        onChange(arr.join("").trimEnd());
      } else if (idx > 0) {
        arr[idx - 1] = "";
        onChange(arr.join("").trimEnd());
        focusInput(idx - 1);
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      focusInput(idx - 1);
    } else if (e.key === "ArrowRight" && idx < length - 1) {
      focusInput(idx + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData("text").replace(/[^\d]/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      focusInput(Math.min(Math.max(pasted.length - 1, 0), length - 1));
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { inputsRef.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit || ""}
          disabled={disabled}
          autoComplete="one-time-code"
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            setActiveIndex(idx);
            e.target.select();
          }}
          onBlur={() => setActiveIndex((current) => (current === idx ? null : current))}
          className={`${styles.box} ${digit ? styles.filled : ""} ${activeIndex === idx ? styles.active : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
          style={{
            caretColor: "#0891B2",
          }}
          aria-label={`Digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}
