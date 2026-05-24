export const APP_SHORTCUT_EVENTS = {
  openAi: "zodo:shortcut-open-ai",
  closeAi: "zodo:shortcut-close-ai",
} as const;

function normalizeText(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function isDisabled(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.classList.contains("pointer-events-none")
  );
}

function getElementLabel(element: HTMLElement): string {
  const parts = [
    element.getAttribute("data-shortcut-label"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.textContent,
  ];

  return normalizeText(parts.filter(Boolean).join(" "));
}

function findInteractiveElements(root: ParentNode = document): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("button, a, [role='button'], [role='menuitem'], label")
  ).filter((element) => isVisible(element) && !isDisabled(element));
}

function findClickableByPatterns(patterns: string[], root: ParentNode = document): HTMLElement | null {
  const normalizedPatterns = patterns.map((pattern) => normalizeText(pattern));
  const elements = findInteractiveElements(root);

  for (const element of elements) {
    const label = getElementLabel(element);
    if (!label) continue;
    if (normalizedPatterns.some((pattern) => label.includes(pattern))) {
      return element;
    }
  }

  return null;
}

function clickElement(element: HTMLElement | null): boolean {
  if (!element) return false;
  element.click();
  return true;
}

async function clickMenuAction(triggerPatterns: string[], menuPatterns: string[]): Promise<boolean> {
  const trigger = findClickableByPatterns(triggerPatterns);
  if (!trigger) return false;

  trigger.click();

  await new Promise((resolve) => window.setTimeout(resolve, 60));

  const menuItem = findClickableByPatterns(menuPatterns);
  if (menuItem) {
    menuItem.click();
  }

  return true;
}

export async function triggerCreateUiAction(): Promise<boolean> {
  return clickElement(
    findClickableByPatterns([
      "add lead",
      "new proposal",
      "create proposal",
      "create invoice",
      "new invoice",
      "add client",
      "new deal",
      "add deal",
      "add employee",
      "add user",
      "invite users",
      "create role",
      "create department",
      "new estimate",
      "create estimate",
      "add",
      "new",
      "create",
    ])
  );
}

export async function triggerSaveUiAction(): Promise<boolean> {
  const activeElement = document.activeElement as HTMLElement | null;
  const closestForm = activeElement?.closest("form") as HTMLFormElement | null;
  if (closestForm && isVisible(closestForm)) {
    closestForm.requestSubmit();
    return true;
  }

  const visibleForms = Array.from(document.querySelectorAll<HTMLFormElement>("form")).filter((form) =>
    isVisible(form)
  );
  if (visibleForms.length === 1) {
    visibleForms[0].requestSubmit();
    return true;
  }

  return clickElement(
    findClickableByPatterns([
      "save changes",
      "save template",
      "save draft",
      "save and send",
      "save",
      "update",
      "complete & save",
    ])
  );
}

export async function triggerExportUiAction(): Promise<boolean> {
  const direct = clickElement(
    findClickableByPatterns([
      "export csv",
      "export as csv",
      "export log",
      "export report",
      "export leads",
      "export data",
    ])
  );
  if (direct) return true;

  return clickMenuAction(["export"], ["export as csv", "export csv", "export"]);
}

export async function triggerImportUiAction(): Promise<boolean> {
  const direct = clickElement(
    findClickableByPatterns([
      "import leads",
      "import data",
      "upload csv",
      "badge scanner import",
      "import",
    ])
  );
  if (direct) return true;

  const fileInput = document.querySelector<HTMLInputElement>("input[type='file']");
  if (fileInput) {
    fileInput.click();
    return true;
  }

  return false;
}

export function openAiShortcutPanel(): void {
  window.dispatchEvent(new Event(APP_SHORTCUT_EVENTS.openAi));
}

export function closeAiShortcutPanel(): void {
  window.dispatchEvent(new Event(APP_SHORTCUT_EVENTS.closeAi));
}

export { isEditableElement };
