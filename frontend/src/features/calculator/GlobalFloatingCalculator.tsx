import { useCallback, useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import {
  Calculator,
  Copy,
  Delete,
  Eraser,
  GripHorizontal,
  History,
  Maximize2,
  Minus,
  Pin,
  PinOff,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { type CalculatorMode, useCalculatorStore } from "./calculator-store";

const modeLabels: Array<{ value: CalculatorMode; label: string }> = [
  { value: "standard", label: "Standard" },
  { value: "scientific", label: "Scientific" },
  { value: "discount", label: "Discount" },
  { value: "commission", label: "Commission" },
  { value: "margin", label: "Margin" },
  { value: "tax", label: "Tax" },
  { value: "emi", label: "EMI" },
  { value: "quote", label: "Quote" },
];

const numberFormatter = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 2,
});

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  return numberFormatter.format(value);
}

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error("Factorial supports whole numbers from 0 to 170");
  }
  let result = 1;
  for (let i = 2; i <= value; i += 1) result *= i;
  return result;
}

function compileExpression(expression: string) {
  const normalized = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt");

  const withoutAllowedWords = normalized.replace(/\b(sin|cos|tan|log|ln|sqrt|pi)\b/gi, "");
  if (/[A-Za-z_$]/.test(withoutAllowedWords)) {
    throw new Error("Unsupported expression");
  }

  let compiled = normalized
    .replace(/\^/g, "**")
    .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)")
    .replace(/\bpi\b/gi, "Math.PI")
    .replace(/\bsin\s*\(/gi, "Math.sin(")
    .replace(/\bcos\s*\(/gi, "Math.cos(")
    .replace(/\btan\s*\(/gi, "Math.tan(")
    .replace(/\blog\s*\(/gi, "Math.log10(")
    .replace(/\bln\s*\(/gi, "Math.log(")
    .replace(/\bsqrt\s*\(/gi, "Math.sqrt(");

  let previous = "";
  while (previous !== compiled) {
    previous = compiled;
    compiled = compiled.replace(/(\d+(?:\.\d+)?|\([^()]+\))!/g, "factorial($1)");
  }

  if (!/^[0-9+\-*/().,\s%!*A-Za-z]+$/.test(compiled)) {
    throw new Error("Unsupported expression");
  }
  const allowedNames = new Set(["Math", "sin", "cos", "tan", "log", "sqrt", "PI", "factorial"]);
  const names = compiled.match(/[A-Za-z]+/g) || [];
  if (names.some((name) => !allowedNames.has(name))) {
    throw new Error("Unsupported expression");
  }

  return compiled;
}

function evaluateExpression(expression: string) {
  const compiled = compileExpression(expression);
  // Expression is sanitized above and runs client-side only.
  const result = Function("factorial", `"use strict"; return (${compiled});`)(factorial);
  if (!Number.isFinite(result)) throw new Error("Invalid calculation");
  return Number(result);
}

function copyText(text: string, toast: ReturnType<typeof useToast>["toast"], label = "Copied") {
  void navigator.clipboard?.writeText(text);
  toast({ title: label, description: text });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-3 dark:border-white/10 dark:bg-slate-950">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-[#0F172A] dark:text-slate-100">{value}</div>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#64748B] dark:text-slate-400">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded-md border-[rgba(15,23,42,0.08)] bg-white pr-10 text-sm dark:border-white/10 dark:bg-slate-950"
        />
        {suffix ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">{suffix}</span> : null}
      </div>
    </div>
  );
}

export function GlobalFloatingCalculator() {
  const {
    open,
    minimized,
    pinned,
    mode,
    x,
    y,
    width,
    height,
    history,
    openCalculator,
    closeCalculator,
    minimizeCalculator,
    restoreCalculator,
    togglePinned,
    setMode,
    setPosition,
    setSize,
    resetWindow,
    addHistory,
    deleteHistory,
    clearHistory,
    consumeIncomingValue,
  } = useCalculatorStore();
  const { toast } = useToast();
  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState(0);

  const [discount, setDiscount] = useState({ price: "", percent: "" });
  const [commission, setCommission] = useState({ value: "", percent: "" });
  const [margin, setMargin] = useState({ cost: "", selling: "" });
  const [tax, setTax] = useState({ amount: "", percent: "" });
  const [emi, setEmi] = useState({ principal: "", rate: "", duration: "" });
  const [quote, setQuote] = useState({ quantity: "", unitPrice: "", discount: "", tax: "" });

  const append = useCallback((token: string) => {
    setExpression((current) => (current === "0" ? token : `${current}${token}`));
  }, []);

  const calculate = useCallback(() => {
    if (!expression.trim()) return;
    try {
      const result = evaluateExpression(expression);
      const formatted = String(Number(result.toFixed(10)));
      setDisplay(formatted);
      setExpression(formatted);
      addHistory({ expression, result: formatted });
    } catch (error) {
      toast({
        title: "Calculation error",
        description: (error as Error).message || "Check the formula and try again.",
        variant: "destructive",
      });
    }
  }, [addHistory, expression, toast]);

  useEffect(() => {
    const value = consumeIncomingValue();
    if (!value) return;
    setExpression(String(value));
    setDisplay(String(value));
  }, [consumeIncomingValue, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        openCalculator();
        return;
      }
      if (!open || minimized) return;
      if (event.key === "Escape") {
        closeCalculator();
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        calculate();
        return;
      }
      if (event.key === "Backspace") {
        setExpression((current) => current.slice(0, -1));
        return;
      }
      if (/^[0-9+\-*/().%]$/.test(event.key)) {
        append(event.key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [append, calculate, closeCalculator, minimized, open, openCalculator]);

  useEffect(() => {
    const onSendValue = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: string | number; mode?: CalculatorMode }>).detail;
      if (detail?.value === undefined) return;
      openCalculator(detail.mode, detail.value);
    };
    window.addEventListener("zodo:calculator:send-value", onSendValue);
    return () => window.removeEventListener("zodo:calculator:send-value", onSendValue);
  }, [openCalculator]);

  const businessResult = useMemo(() => {
    const toNum = (value: string) => Number(value) || 0;
    if (mode === "discount") {
      const amount = toNum(discount.price) * (toNum(discount.percent) / 100);
      return { expression: `${discount.price || 0} - ${discount.percent || 0}%`, values: [["Discount Amount", amount], ["Final Price", toNum(discount.price) - amount]] };
    }
    if (mode === "commission") {
      const amount = toNum(commission.value) * (toNum(commission.percent) / 100);
      return { expression: `${commission.value || 0} × ${commission.percent || 0}%`, values: [["Commission Amount", amount]] };
    }
    if (mode === "margin") {
      const profit = toNum(margin.selling) - toNum(margin.cost);
      const marginPercent = toNum(margin.selling) ? (profit / toNum(margin.selling)) * 100 : 0;
      return { expression: `${margin.selling || 0} - ${margin.cost || 0}`, values: [["Profit", profit], ["Margin %", marginPercent]] };
    }
    if (mode === "tax") {
      const amount = toNum(tax.amount) * (toNum(tax.percent) / 100);
      return { expression: `${tax.amount || 0} + ${tax.percent || 0}% tax`, values: [["Tax Amount", amount], ["Total Amount", toNum(tax.amount) + amount]] };
    }
    if (mode === "emi") {
      const principal = toNum(emi.principal);
      const monthlyRate = toNum(emi.rate) / 12 / 100;
      const months = Math.max(toNum(emi.duration), 0);
      const monthly = monthlyRate && months ? (principal * monthlyRate * ((1 + monthlyRate) ** months)) / (((1 + monthlyRate) ** months) - 1) : months ? principal / months : 0;
      return { expression: `${principal} financed at ${emi.rate || 0}% for ${months} months`, values: [["Monthly EMI", monthly], ["Total Payable", monthly * months]] };
    }
    if (mode === "quote") {
      const subtotal = toNum(quote.quantity) * toNum(quote.unitPrice);
      const discountAmount = subtotal * (toNum(quote.discount) / 100);
      const taxable = Math.max(subtotal - discountAmount, 0);
      const taxAmount = taxable * (toNum(quote.tax) / 100);
      return { expression: `${quote.quantity || 0} × ${quote.unitPrice || 0}`, values: [["Subtotal", subtotal], ["Discount", discountAmount], ["Tax", taxAmount], ["Grand Total", taxable + taxAmount]] };
    }
    return null;
  }, [commission, discount, emi, margin, mode, quote, tax]);

  const saveBusinessResult = () => {
    if (!businessResult) return;
    const result = businessResult.values.map(([label, value]) => `${label}: ${formatNumber(value)}`).join(" · ");
    addHistory({ expression: businessResult.expression, result });
    toast({ title: "Saved to history", description: result });
  };

  if (!open) return null;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={restoreCalculator}
        className="fixed bottom-6 right-6 z-[9999] flex h-12 items-center gap-2 rounded-md border border-[#0891B2]/20 bg-white px-4 text-sm font-semibold text-[#0F172A] shadow-xl transition hover:bg-[#ECFEFF] dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
      >
        <Calculator size={18} className="text-[#0891B2]" />
        Calculator
      </button>
    );
  }

  return (
    <Rnd
      size={{ width, height }}
      position={{ x, y }}
      minWidth={320}
      minHeight={450}
      maxWidth={600}
      maxHeight={800}
      bounds="window"
      dragHandleClassName="calculator-drag-handle"
      disableDragging={pinned}
      enableResizing={!pinned}
      onDragStop={(_, data) => setPosition(data.x, data.y)}
      onResizeStop={(_, __, ref, ___, position) => {
        setSize(ref.offsetWidth, ref.offsetHeight);
        setPosition(position.x, position.y);
      }}
      className="z-[9999]"
    >
      <section className="flex h-full flex-col overflow-hidden rounded-md border border-[rgba(15,23,42,0.10)] bg-[#F8FAFC] shadow-2xl dark:border-white/10 dark:bg-slate-900">
        <header className="calculator-drag-handle flex h-12 cursor-move items-center justify-between border-b border-[rgba(15,23,42,0.08)] bg-white px-3 dark:border-white/10 dark:bg-slate-950">
          <div className="flex min-w-0 items-center gap-2">
            <Calculator size={18} className="text-[#0891B2]" />
            <div className="truncate text-sm font-semibold text-[#0F172A] dark:text-slate-100">Sales Calculator</div>
            <GripHorizontal size={14} className="text-[#94A3B8]" />
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={togglePinned} title={pinned ? "Unpin" : "Pin to screen"}>
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={resetWindow} title="Reset position">
              <Maximize2 size={15} />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={minimizeCalculator} title="Minimize">
              <Minus size={15} />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={closeCalculator} title="Close">
              <X size={15} />
            </Button>
          </div>
        </header>

        <Tabs value={mode} onValueChange={(value) => setMode(value as CalculatorMode)} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[rgba(15,23,42,0.08)] bg-white p-2 dark:border-white/10 dark:bg-slate-950">
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="h-9 justify-start rounded-md bg-[#F1F5F9] p-1 dark:bg-slate-800">
                {modeLabels.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="rounded-md px-3 text-xs">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {(["standard", "scientific"] as CalculatorMode[]).map((tab) => (
              <TabsContent key={tab} value={tab} className="m-0 h-full">
                <div className="flex h-full flex-col p-3">
                  <div className="rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-3 text-right dark:border-white/10 dark:bg-slate-950">
                    <div className="min-h-6 truncate text-sm text-[#64748B] dark:text-slate-400">{expression || "0"}</div>
                    <div className="truncate text-3xl font-semibold text-[#0F172A] dark:text-slate-100">{display}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {tab === "scientific" ? ["sin(", "cos(", "tan(", "log(", "ln(", "sqrt(", "^", "!", "(", ")", "π", "MR"].map((token) => (
                      <Button key={token} type="button" variant="outline" className="h-10 rounded-md" onClick={() => token === "MR" ? append(String(memory)) : append(token)}>
                        {token}
                      </Button>
                    )) : null}
                    {["CE", "C", "⌫", "÷", "7", "8", "9", "×", "4", "5", "6", "-", "1", "2", "3", "+", "%", "0", ".", "="].map((token) => (
                      <Button
                        key={token}
                        type="button"
                        variant={token === "=" ? "default" : "outline"}
                        className={cn("h-11 rounded-md", token === "=" && "bg-[#0891B2] text-white hover:bg-[#0891B2]/90")}
                        onClick={() => {
                          if (token === "=") return calculate();
                          if (token === "C") {
                            setExpression("");
                            setDisplay("0");
                            return;
                          }
                          if (token === "CE") {
                            setExpression("");
                            return;
                          }
                          if (token === "⌫") {
                            setExpression((current) => current.slice(0, -1));
                            return;
                          }
                          append(token);
                        }}
                      >
                        {token}
                      </Button>
                    ))}
                  </div>
                  {tab === "scientific" ? (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      <Button type="button" variant="outline" className="rounded-md" onClick={() => setMemory(Number(display) || 0)}>MS</Button>
                      <Button type="button" variant="outline" className="rounded-md" onClick={() => setMemory((current) => current + (Number(display) || 0))}>M+</Button>
                      <Button type="button" variant="outline" className="rounded-md" onClick={() => setMemory((current) => current - (Number(display) || 0))}>M-</Button>
                      <Button type="button" variant="outline" className="rounded-md" onClick={() => setMemory(0)}>MC</Button>
                    </div>
                  ) : null}
                </div>
              </TabsContent>
            ))}

            <BusinessTabs
              mode={mode}
              discount={discount}
              setDiscount={setDiscount}
              commission={commission}
              setCommission={setCommission}
              margin={margin}
              setMargin={setMargin}
              tax={tax}
              setTax={setTax}
              emi={emi}
              setEmi={setEmi}
              quote={quote}
              setQuote={setQuote}
              businessResult={businessResult}
              onSave={saveBusinessResult}
            />
          </div>
        </Tabs>

        <footer className="border-t border-[rgba(15,23,42,0.08)] bg-white p-2 dark:border-white/10 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <History size={14} />
              {history.length}/100 history
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-md" onClick={clearHistory}>
              <Eraser size={14} className="mr-1" />
              Clear
            </Button>
          </div>
          <ScrollArea className="mt-2 h-28 rounded-md border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] dark:border-white/10 dark:bg-slate-900">
            <div className="divide-y divide-[rgba(15,23,42,0.06)] dark:divide-white/10">
              {history.length ? history.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-2 p-2 text-xs">
                  <button type="button" className="min-w-0 text-left" onClick={() => { setExpression(entry.result); setDisplay(entry.result); }}>
                    <div className="truncate text-[#0F172A] dark:text-slate-100">{entry.expression}</div>
                    <div className="truncate font-semibold text-[#0891B2]">{entry.result}</div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => copyText(entry.result, toast, "Result copied")}>
                      <Copy size={13} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => deleteHistory(entry.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              )) : <div className="p-4 text-center text-xs text-[#64748B]">No calculations yet.</div>}
            </div>
          </ScrollArea>
        </footer>
      </section>
    </Rnd>
  );
}

function BusinessTabs(props: {
  mode: CalculatorMode;
  discount: { price: string; percent: string };
  setDiscount: (value: { price: string; percent: string }) => void;
  commission: { value: string; percent: string };
  setCommission: (value: { value: string; percent: string }) => void;
  margin: { cost: string; selling: string };
  setMargin: (value: { cost: string; selling: string }) => void;
  tax: { amount: string; percent: string };
  setTax: (value: { amount: string; percent: string }) => void;
  emi: { principal: string; rate: string; duration: string };
  setEmi: (value: { principal: string; rate: string; duration: string }) => void;
  quote: { quantity: string; unitPrice: string; discount: string; tax: string };
  setQuote: (value: { quantity: string; unitPrice: string; discount: string; tax: string }) => void;
  businessResult: { expression: string; values: Array<[string, number]> } | null;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const currentResult = props.businessResult?.values.at(-1)?.[1] ?? 0;
  const formula = props.businessResult?.expression || "";

  const quickAction = (label: string) => {
    const text = `${formula}\nResult: ${formatNumber(currentResult)}`;
    copyText(text, toast, label);
  };

  const resultPanel = props.businessResult ? (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {props.businessResult.values.map(([label, value]) => (
          <Metric key={label} label={label} value={formatNumber(value)} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="rounded-md" onClick={() => copyText(formatNumber(currentResult), toast, "Result copied")}><Copy size={14} className="mr-2" />Copy Result</Button>
        <Button type="button" variant="outline" className="rounded-md" onClick={() => copyText(formula, toast, "Formula copied")}><Copy size={14} className="mr-2" />Copy Formula</Button>
        <Button type="button" variant="outline" className="rounded-md" onClick={props.onSave}><Save size={14} className="mr-2" />Save to Notes</Button>
        <Button type="button" variant="outline" className="rounded-md" onClick={() => quickAction("Ready for Deal")}><Send size={14} className="mr-2" />Add to Deal</Button>
        <Button type="button" variant="outline" className="rounded-md" onClick={() => quickAction("Ready for Opportunity")}><Send size={14} className="mr-2" />Opportunity</Button>
        <Button type="button" variant="outline" className="rounded-md" onClick={() => quickAction("Ready for Quote")}><Send size={14} className="mr-2" />Add to Quote</Button>
      </div>
    </div>
  ) : null;

  const wrapper = (children: React.ReactNode) => (
    <div className="h-full overflow-y-auto p-3">
      <div className="space-y-4">
        {children}
        {resultPanel}
      </div>
    </div>
  );

  return (
    <>
      <TabsContent value="discount" className="m-0 h-full">{wrapper(<><NumberField label="Product Price" value={props.discount.price} onChange={(price) => props.setDiscount({ ...props.discount, price })} /><NumberField label="Discount" suffix="%" value={props.discount.percent} onChange={(percent) => props.setDiscount({ ...props.discount, percent })} /></>)}</TabsContent>
      <TabsContent value="commission" className="m-0 h-full">{wrapper(<><NumberField label="Deal Value" value={props.commission.value} onChange={(value) => props.setCommission({ ...props.commission, value })} /><NumberField label="Commission" suffix="%" value={props.commission.percent} onChange={(percent) => props.setCommission({ ...props.commission, percent })} /></>)}</TabsContent>
      <TabsContent value="margin" className="m-0 h-full">{wrapper(<><NumberField label="Cost Price" value={props.margin.cost} onChange={(cost) => props.setMargin({ ...props.margin, cost })} /><NumberField label="Selling Price" value={props.margin.selling} onChange={(selling) => props.setMargin({ ...props.margin, selling })} /></>)}</TabsContent>
      <TabsContent value="tax" className="m-0 h-full">{wrapper(<><NumberField label="Amount" value={props.tax.amount} onChange={(amount) => props.setTax({ ...props.tax, amount })} /><NumberField label="Tax" suffix="%" value={props.tax.percent} onChange={(percent) => props.setTax({ ...props.tax, percent })} /></>)}</TabsContent>
      <TabsContent value="emi" className="m-0 h-full">{wrapper(<><NumberField label="Principal Amount" value={props.emi.principal} onChange={(principal) => props.setEmi({ ...props.emi, principal })} /><NumberField label="Interest Rate" suffix="%" value={props.emi.rate} onChange={(rate) => props.setEmi({ ...props.emi, rate })} /><NumberField label="Duration" suffix="mo" value={props.emi.duration} onChange={(duration) => props.setEmi({ ...props.emi, duration })} /></>)}</TabsContent>
      <TabsContent value="quote" className="m-0 h-full">{wrapper(<><NumberField label="Quantity" value={props.quote.quantity} onChange={(quantity) => props.setQuote({ ...props.quote, quantity })} /><NumberField label="Unit Price" value={props.quote.unitPrice} onChange={(unitPrice) => props.setQuote({ ...props.quote, unitPrice })} /><NumberField label="Discount" suffix="%" value={props.quote.discount} onChange={(discount) => props.setQuote({ ...props.quote, discount })} /><NumberField label="Tax" suffix="%" value={props.quote.tax} onChange={(tax) => props.setQuote({ ...props.quote, tax })} /></>)}</TabsContent>
    </>
  );
}
