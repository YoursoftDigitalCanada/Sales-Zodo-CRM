import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Crown,
  Lock,
  Mail,
  MessageSquare,
  PhoneCall,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { WhatsAppActionButton } from "@/features/whatsapp/components/WhatsAppActionButton";
import { WhatsAppChatSheet } from "@/features/whatsapp/components/WhatsAppChatSheet";
import { WhatsAppConnectionCard } from "@/features/whatsapp/components/WhatsAppConnectionCard";
import { WhatsAppConnectionModal } from "@/features/whatsapp/components/WhatsAppConnectionModal";
import { useWhatsAppIntegration } from "@/features/whatsapp/use-whatsapp-integration";
import {
  disconnectWhatsAppConnection,
  refreshWhatsAppSync,
  saveWhatsAppConnection,
  type WhatsAppConnection,
} from "@/features/whatsapp/whatsapp-store";
import { cn } from "@/lib/utils";

const providerCards = [
  {
    id: "meta" as const,
    title: "Connect via Meta",
    subtitle: "Recommended",
    description: "Direct integration using WhatsApp Business Cloud API",
    accent: "from-[#D1FAE5] via-[#ECFEFF] to-white",
    points: ["Direct Meta credentials", "Cloud API workflow", "Fastest path for approved numbers"],
  },
  {
    id: "twilio" as const,
    title: "Connect via Twilio",
    subtitle: "Provider option",
    description: "Use Twilio to connect your WhatsApp Business number",
    accent: "from-[#DBEAFE] via-[#EEF2FF] to-white",
    points: ["Twilio-hosted sending", "Existing Twilio billing", "Ideal for teams already on Twilio"],
  },
];

const planCopy = {
  basic: {
    label: "Basic Plan",
    badge: "Locked",
    color: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    headline: "WhatsApp is disabled on Basic.",
    description: "Upgrade to Standard or Premium to connect your own WhatsApp Business provider and unlock CRM chat.",
  },
  standard: {
    label: "Standard Plan",
    badge: "Manual messaging",
    color: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
    headline: "Connect one WhatsApp number.",
    description: "Perfect for sales teams that want provider-owned WhatsApp messaging inside CRM without automations.",
  },
  premium: {
    label: "Premium Plan",
    badge: "Automation ready",
    color: "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
    headline: "Run WhatsApp at full scale.",
    description: "Premium unlocks multiple numbers, team assignment, analytics, and automation-ready messaging workflows.",
  },
};

export default function WhatsAppIntegrationPage() {
  const { toast } = useToast();
  const { access, connections, plan } = useWhatsAppIntegration();
  const [metaOpen, setMetaOpen] = useState(false);
  const [twilioOpen, setTwilioOpen] = useState(false);
  const [testChatOpen, setTestChatOpen] = useState(false);
  const [activeTestConnection, setActiveTestConnection] = useState<WhatsAppConnection | null>(null);

  const currentPlan = planCopy[plan];
  const limitReached = connections.length >= access.maxNumbers;

  const planHighlights = useMemo(
    () => [
      {
        label: "Connected numbers",
        value: access.enabled ? `${connections.length}/${access.maxNumbers}` : "0/0",
        icon: PlugZap,
      },
      {
        label: "Messaging mode",
        value: access.manualMessagingOnly ? "Manual only" : "Manual + automation",
        icon: MessageSquare,
      },
      {
        label: "Team assignment",
        value: access.teamAssignment ? "Enabled" : "Premium only",
        icon: Users,
      },
      {
        label: "Analytics",
        value: access.analytics ? "Enabled" : "Premium only",
        icon: BarChart3,
      },
    ],
    [access, connections.length],
  );

  const handleConnect = (connection: WhatsAppConnection) => {
    if (!access.enabled) {
      toast({
        title: "Upgrade required",
        description: "WhatsApp integration is available on Standard and Premium plans.",
        variant: "destructive",
      });
      return;
    }

    if (limitReached) {
      toast({
        title: "Connection limit reached",
        description:
          access.maxNumbers === 1
            ? "Your Standard plan supports one WhatsApp number."
            : `Your workspace already uses ${access.maxNumbers} WhatsApp numbers.`,
        variant: "destructive",
      });
      return;
    }

    const alreadyExists = connections.some(
      (existing) =>
        existing.provider === connection.provider &&
        existing.phoneNumber === connection.phoneNumber,
    );

    if (alreadyExists) {
      toast({
        title: "Number already connected",
        description: `${connection.phoneNumber} is already active in this workspace.`,
      });
      return;
    }

    saveWhatsAppConnection(connection);
    toast({
      title: "WhatsApp connected",
      description: `${connection.phoneNumber} is now ready inside CRM chat.`,
    });
  };

  const handleDisconnect = (connection: WhatsAppConnection) => {
    disconnectWhatsAppConnection(connection.id);
    toast({
      title: "WhatsApp disconnected",
      description: `${connection.phoneNumber} has been removed from this workspace.`,
    });
  };

  const handleRefreshSync = (connection: WhatsAppConnection) => {
    refreshWhatsAppSync(connection.id);
    toast({
      title: "Sync refreshed",
      description: `${connection.phoneNumber} was refreshed successfully.`,
    });
  };

  const handleSendTestMessage = (connection: WhatsAppConnection) => {
    refreshWhatsAppSync(connection.id);
    setActiveTestConnection(connection);
    setTestChatOpen(true);
    toast({
      title: "Test chat opened",
      description: "You can simulate an outbound WhatsApp message from the CRM panel.",
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(13,148,136,0.10),_transparent_38%),linear-gradient(180deg,#F8FAFC_0%,#F3F7FB_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
            <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.45fr,0.85fr] lg:px-8 lg:py-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0F766E]">
                  Settings / Integrations / WhatsApp
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">
                    WhatsApp Integration
                  </h1>
                  <Badge
                    variant="outline"
                    className={cn("rounded-full border px-3 py-1 text-xs font-semibold", currentPlan.color)}
                  >
                    {currentPlan.label}
                  </Badge>
                </div>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[#475569]">
                  Connect your WhatsApp Business account and chat with leads directly inside CRM.
                </p>
              </div>

              <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#F0FDFA_0%,#FFFFFF_100%)] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">Workspace access</p>
                    <p className="mt-1 text-sm text-[#64748B]">{currentPlan.headline}</p>
                  </div>
                  {plan === "premium" ? (
                    <Crown className="text-[#7C3AED]" />
                  ) : plan === "basic" ? (
                    <Lock className="text-[#B91C1C]" />
                  ) : (
                    <ShieldCheck className="text-[#0F766E]" />
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#475569]">
                  {currentPlan.description}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {planHighlights.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white/80 p-4"
                    >
                      <div className="flex items-center gap-2 text-[#0F766E]">
                        <item.icon size={16} />
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94A3B8]">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-[#0F172A]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Alert className="rounded-[28px] border-[#FDE68A] bg-[#FFFBEB] px-5 py-4 text-[#92400E] [&>svg]:text-[#D97706]">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">We do not provide WhatsApp numbers.</AlertTitle>
            <AlertDescription className="text-sm leading-6">
              Connect your own WhatsApp Business API through Meta or Twilio. Messaging charges are billed by your provider, not by Zodo CRM.
            </AlertDescription>
          </Alert>

          <section className="grid gap-6 xl:grid-cols-[1.35fr,0.65fr]">
            <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">
                    Provider selection
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">
                    Choose your WhatsApp provider
                  </h2>
                </div>
                <p className="text-sm text-[#64748B]">Upgrade anytime to unlock more numbers and automation.</p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {providerCards.map((card) => {
                  const disabled = !access.enabled || limitReached;

                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-br p-5",
                        card.accent,
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold text-[#0F172A]">
                            {card.subtitle}
                          </div>
                          <h3 className="mt-4 text-xl font-semibold text-[#0F172A]">
                            {card.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-[#475569]">
                            {card.description}
                          </p>
                        </div>
                        <PlugZap className="text-[#0F766E]" />
                      </div>

                      <div className="mt-5 space-y-2">
                        {card.points.map((point) => (
                          <div
                            key={point}
                            className="flex items-start gap-2 text-sm text-[#334155]"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#16A34A]" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        className="mt-6 h-11 rounded-xl bg-[#0F766E] px-5 text-white hover:bg-[#115E59] disabled:bg-[#94A3B8]"
                        disabled={disabled}
                        onClick={() =>
                          card.id === "meta" ? setMetaOpen(true) : setTwilioOpen(true)
                        }
                      >
                        {card.id === "meta" ? "Connect Meta" : "Connect Twilio"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">
                Plan-aware access
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">
                What this workspace can do
              </h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-medium text-[#0F172A]">Basic</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    WhatsApp integration disabled until plan upgrade.
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-medium text-[#0F172A]">Standard</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    One WhatsApp number and manual messaging from CRM records.
                  </p>
                </div>
                <div className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-medium text-[#0F172A]">Premium</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Multiple numbers, automation support, team assignment, and analytics.
                  </p>
                </div>
              </div>

              {!access.enabled ? (
                <div className="mt-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <p className="font-medium text-[#991B1B]">Upgrade required</p>
                  <p className="mt-1 text-sm text-[#B91C1C]">
                    Switch to Standard or Premium before you connect a provider-owned WhatsApp number.
                  </p>
                </div>
              ) : limitReached ? (
                <div className="mt-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                  <p className="font-medium text-[#92400E]">Connection cap reached</p>
                  <p className="mt-1 text-sm text-[#A16207]">
                    Disconnect an existing number or upgrade your plan for more capacity.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-[#D1FAE5] bg-[#F0FDFA] p-4">
                  <p className="font-medium text-[#0F766E]">Ready to connect</p>
                  <p className="mt-1 text-sm text-[#0F766E]">
                    Your workspace can connect a provider-owned WhatsApp Business number right now.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">
                  Connection status
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">
                  Active WhatsApp numbers
                </h2>
              </div>
              <p className="text-sm text-[#64748B]">
                {connections.length > 0
                  ? `${connections.length} connected number${connections.length === 1 ? "" : "s"}`
                  : "No active provider connection yet"}
              </p>
            </div>

            {connections.length > 0 ? (
              <div className="grid gap-4">
                {connections.map((connection) => (
                  <WhatsAppConnectionCard
                    key={connection.id}
                    connection={connection}
                    onDisconnect={handleDisconnect}
                    onRefreshSync={handleRefreshSync}
                    onSendTestMessage={handleSendTestMessage}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[30px] border border-dashed border-[rgba(15,23,42,0.12)] bg-white/70 px-6 py-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] text-[#0F766E]">
                  <MessageSquare />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-[#0F172A]">
                  No WhatsApp connection yet
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
                  Connect Meta or Twilio to activate WhatsApp messaging inside your CRM chat module. Once connected, the button on lead and client profiles becomes available instantly.
                </p>
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">
                Chat module preview
              </p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-[#0F172A]">
                    Lead and client actions
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    WhatsApp only becomes clickable when a provider is connected. The same button now lives inside lead and client profile headers.
                  </p>
                </div>
                <Badge variant="outline" className="border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]">
                  Right-side chat panel
                </Badge>
              </div>

              <div className="mt-6 rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#F8FAFC_0%,#FFFFFF_100%)] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">Priya Sharma</p>
                    <p className="mt-1 text-sm text-[#64748B]">Lead • +91 98765 43210</p>
                  </div>
                  <Badge variant="outline" className="border-[#E2E8F0] bg-white text-[#475569]">
                    CRM profile actions
                  </Badge>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto rounded-lg border-[#E5E7EB] px-3 py-2 text-xs font-medium text-[#374151]"
                  >
                    <PhoneCall className="text-[#14B8A6]" />
                    Call
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto rounded-lg border-[#E5E7EB] px-3 py-2 text-xs font-medium text-[#374151]"
                  >
                    <Mail className="text-[#14B8A6]" />
                    Email
                  </Button>
                  <WhatsAppActionButton
                    contactName="Priya Sharma"
                    phoneNumber="+919876543210"
                    className="h-auto px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F766E]">
                Smart behaviors
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#0F172A]">
                CRM-ready message handling
              </h2>

              <div className="mt-6 space-y-4">
                {[
                  {
                    icon: Sparkles,
                    title: "Incoming number matching",
                    copy: "Known WhatsApp numbers attach to existing leads or clients automatically.",
                  },
                  {
                    icon: ArrowUpRight,
                    title: "New lead creation",
                    copy: "Unknown numbers can create a new lead record so the team never loses context.",
                  },
                  {
                    icon: Bot,
                    title: "Timeline sync",
                    copy: "Every inbound and outbound message is designed to live inside the CRM activity timeline.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-3 text-[#0F766E] shadow-sm">
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[#64748B]">{item.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#0F172A_0%,#134E4A_100%)] p-5 text-white">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} />
                  <p className="text-sm font-semibold">Provider-owned billing</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  Messaging charges remain with Meta or Twilio. Zodo CRM only provides the workspace UI and message management experience.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <WhatsAppConnectionModal
        provider="meta"
        open={metaOpen}
        onOpenChange={setMetaOpen}
        onConnect={handleConnect}
      />
      <WhatsAppConnectionModal
        provider="twilio"
        open={twilioOpen}
        onOpenChange={setTwilioOpen}
        onConnect={handleConnect}
      />
      <WhatsAppChatSheet
        open={testChatOpen}
        onOpenChange={setTestChatOpen}
        contactName="Zodo Test Lead"
        phoneNumber={activeTestConnection?.phoneNumber ?? "+919999999999"}
        connection={activeTestConnection}
        allowTeamAssignment={access.teamAssignment}
        allowAutomation={access.automation}
      />
    </div>
  );
}
