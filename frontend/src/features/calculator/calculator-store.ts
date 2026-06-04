import { create } from "zustand";

export type CalculatorMode =
  | "standard"
  | "scientific"
  | "discount"
  | "commission"
  | "margin"
  | "tax"
  | "emi"
  | "quote";

export interface CalculatorHistoryEntry {
  id: string;
  createdAt: string;
  expression: string;
  result: string;
}

interface CalculatorWindowState {
  open: boolean;
  minimized: boolean;
  pinned: boolean;
  mode: CalculatorMode;
  x: number;
  y: number;
  width: number;
  height: number;
  history: CalculatorHistoryEntry[];
}

interface CalculatorStore extends CalculatorWindowState {
  openCalculator: (mode?: CalculatorMode, value?: string | number) => void;
  closeCalculator: () => void;
  minimizeCalculator: () => void;
  restoreCalculator: () => void;
  togglePinned: () => void;
  setMode: (mode: CalculatorMode) => void;
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
  resetWindow: () => void;
  addHistory: (entry: Omit<CalculatorHistoryEntry, "id" | "createdAt">) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
  incomingValue: string;
  consumeIncomingValue: () => string;
}

const STORAGE_KEY = "zodo:floating-calculator:v1";

const defaultState: CalculatorWindowState = {
  open: false,
  minimized: false,
  pinned: false,
  mode: "standard",
  x: 280,
  y: 90,
  width: 380,
  height: 620,
  history: [],
};

function readStoredState(): CalculatorWindowState {
  if (typeof window === "undefined") return defaultState;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...defaultState,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 100) : [],
      width: Math.min(Math.max(Number(parsed.width) || defaultState.width, 320), 600),
      height: Math.min(Math.max(Number(parsed.height) || defaultState.height, 450), 800),
    };
  } catch {
    return defaultState;
  }
}

function persistState(state: Partial<CalculatorWindowState>) {
  if (typeof window === "undefined") return;
  const current = readStoredState();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
}

export const useCalculatorStore = create<CalculatorStore>((set, get) => ({
  ...readStoredState(),
  incomingValue: "",
  openCalculator: (mode, value) => {
    const nextMode = mode || get().mode;
    const incomingValue = value === undefined ? "" : String(value);
    persistState({ open: true, minimized: false, mode: nextMode });
    set({ open: true, minimized: false, mode: nextMode, incomingValue });
  },
  closeCalculator: () => {
    persistState({ open: false, minimized: false });
    set({ open: false, minimized: false });
  },
  minimizeCalculator: () => {
    persistState({ minimized: true });
    set({ minimized: true });
  },
  restoreCalculator: () => {
    persistState({ open: true, minimized: false });
    set({ open: true, minimized: false });
  },
  togglePinned: () => {
    const pinned = !get().pinned;
    persistState({ pinned });
    set({ pinned });
  },
  setMode: (mode) => {
    persistState({ mode });
    set({ mode });
  },
  setPosition: (x, y) => {
    persistState({ x, y });
    set({ x, y });
  },
  setSize: (width, height) => {
    const safeWidth = Math.min(Math.max(width, 320), 600);
    const safeHeight = Math.min(Math.max(height, 450), 800);
    persistState({ width: safeWidth, height: safeHeight });
    set({ width: safeWidth, height: safeHeight });
  },
  resetWindow: () => {
    const next = { x: defaultState.x, y: defaultState.y, width: defaultState.width, height: defaultState.height };
    persistState(next);
    set(next);
  },
  addHistory: (entry) => {
    const history = [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        expression: entry.expression,
        result: entry.result,
      },
      ...get().history,
    ].slice(0, 100);
    persistState({ history });
    set({ history });
  },
  deleteHistory: (id) => {
    const history = get().history.filter((entry) => entry.id !== id);
    persistState({ history });
    set({ history });
  },
  clearHistory: () => {
    persistState({ history: [] });
    set({ history: [] });
  },
  consumeIncomingValue: () => {
    const value = get().incomingValue;
    set({ incomingValue: "" });
    return value;
  },
}));

export function sendValueToCalculator(value: string | number, mode?: CalculatorMode) {
  useCalculatorStore.getState().openCalculator(mode, value);
}
