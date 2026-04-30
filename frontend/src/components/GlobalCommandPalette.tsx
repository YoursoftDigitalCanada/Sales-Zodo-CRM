import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  FileStack,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MessageSquare,
  PanelLeft,
  Plus,
  Receipt,
  Settings,
  Sparkles,
  Upload,
  Download,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type PaletteAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  section: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
};

interface GlobalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenHelp: () => void;
  onOpenAi: () => void;
  onToggleSidebar: () => void;
}

export function GlobalCommandPalette({
  open,
  onOpenChange,
  onCreate,
  onExport,
  onImport,
  onOpenHelp,
  onOpenAi,
  onToggleSidebar,
}: GlobalCommandPaletteProps) {
  const navigate = useNavigate();

  const items = useMemo<PaletteAction[]>(
    () => [
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        section: "Navigate",
        keywords: ["home overview dashboard"],
        action: () => navigate("/dashboard"),
      },
      {
        id: "nav-leads",
        label: "Go to Leads",
        icon: UserPlus,
        section: "Navigate",
        keywords: ["crm leads all leads pipeline"],
        action: () => navigate("/leads"),
      },
      {
        id: "nav-clients",
        label: "Go to Accounts",
        icon: Users,
        section: "Navigate",
        keywords: ["accounts clients companies customers directory"],
        action: () => navigate("/accounts"),
      },
      {
        id: "nav-jobs",
        label: "Go to Deals",
        icon: FolderKanban,
        section: "Navigate",
        keywords: ["deals opportunities pipeline kanban revenue"],
        action: () => navigate("/deals"),
      },
      {
        id: "nav-calendar",
        label: "Go to Calendar",
        icon: Calendar,
        section: "Navigate",
        keywords: ["events meetings calendar"],
        action: () => navigate("/calendar"),
      },
      {
        id: "nav-tasks",
        label: "Go to Tasks",
        icon: CheckSquare,
        section: "Navigate",
        keywords: ["tasks todos follow up"],
        action: () => navigate("/tasks"),
      },
      {
        id: "nav-invoices",
        label: "Go to Invoices",
        icon: Receipt,
        section: "Navigate",
        keywords: ["finance invoices billing"],
        action: () => navigate("/invoice"),
      },
      {
        id: "nav-quotes",
        label: "Go to Proposals",
        icon: FileStack,
        section: "Navigate",
        keywords: ["quotes estimates proposals"],
        action: () => navigate("/proposals"),
      },
      {
        id: "nav-letterbox",
        label: "Go to Mail",
        icon: Mail,
        section: "Navigate",
        keywords: ["email mailbox sales inbox mail letter box"],
        action: () => navigate("/mail"),
      },
      {
        id: "nav-chats",
        label: "Go to Chats",
        icon: MessageSquare,
        section: "Navigate",
        keywords: ["chat employee messaging"],
        action: () => navigate("/chats"),
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        icon: Settings,
        section: "Navigate",
        keywords: ["settings preferences email security"],
        action: () => navigate("/settings"),
      },
      {
        id: "nav-estimator",
        label: "Go to AI Sales Assistant",
        icon: Zap,
        section: "Navigate",
        keywords: ["sales assistant ai lead scoring email writer forecast"],
        action: () => navigate("/ai/sales-assistant"),
      },
      {
        id: "action-create",
        label: "Create New Item",
        icon: Plus,
        section: "Actions",
        shortcut: "⌘N",
        keywords: ["new create add"],
        action: onCreate,
      },
      {
        id: "action-export",
        label: "Export Current Data",
        icon: Download,
        section: "Actions",
        shortcut: "⌘⇧E",
        keywords: ["export download csv report"],
        action: onExport,
      },
      {
        id: "action-import",
        label: "Import Data",
        icon: Upload,
        section: "Actions",
        shortcut: "⌘⇧I",
        keywords: ["import upload csv"],
        action: onImport,
      },
      {
        id: "action-help",
        label: "Open Help Center",
        icon: HelpCircle,
        section: "Actions",
        shortcut: "⌘/",
        keywords: ["help support shortcuts docs"],
        action: onOpenHelp,
      },
      {
        id: "action-ai",
        label: "Open AI Assistant",
        icon: Sparkles,
        section: "Actions",
        shortcut: "⌘⇧A",
        keywords: ["ai assistant ask zodo copilot"],
        action: onOpenAi,
      },
      {
        id: "action-sidebar",
        label: "Toggle Sidebar",
        icon: PanelLeft,
        section: "Actions",
        shortcut: "⌘B",
        keywords: ["sidebar collapse expand navigation"],
        action: onToggleSidebar,
      },
    ],
    [navigate, onCreate, onExport, onImport, onOpenAi, onOpenHelp, onToggleSidebar]
  );

  const grouped = useMemo(() => {
    return items.reduce<Record<string, PaletteAction[]>>((acc, item) => {
      acc[item.section] = acc[item.section] || [];
      acc[item.section].push(item);
      return acc;
    }, {});
  }, [items]);

  const handleSelect = (action: () => void) => {
    onOpenChange(false);
    window.setTimeout(() => action(), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border border-[rgba(15,23,42,0.06)] bg-white p-0 card-shadow sm:max-w-2xl">
        <DialogTitle className="sr-only">Global search and command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages, create items, and run global CRM actions with the keyboard.
        </DialogDescription>
        <Command className="bg-white">
          <CommandInput placeholder="Search pages, actions, and shortcuts..." />
          <CommandList className="max-h-[460px]">
            <CommandEmpty>No matching pages or actions found.</CommandEmpty>

            {Object.entries(grouped).map(([section, sectionItems], sectionIndex) => (
              <div key={section}>
                {sectionIndex > 0 ? <CommandSeparator /> : null}
                <CommandGroup heading={section}>
                  {sectionItems.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                      onSelect={() => handleSelect(item.action)}
                      className="rounded-md px-3 py-3"
                    >
                      <item.icon className="mr-3 h-4 w-4 text-[#0891B2]" />
                      <span className="text-sm text-[#0F172A]">{item.label}</span>
                      {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalCommandPalette;
