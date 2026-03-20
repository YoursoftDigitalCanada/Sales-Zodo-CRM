import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  createMetaConnection,
  createTwilioConnection,
  getProviderLabel,
  type WhatsAppConnection,
  type WhatsAppProvider,
} from "@/features/whatsapp/whatsapp-store";

interface WhatsAppConnectionModalProps {
  provider: WhatsAppProvider;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (connection: WhatsAppConnection) => void;
}

type FormErrors = Partial<Record<"accessToken" | "phoneNumberId" | "businessAccountId" | "accountSid" | "authToken" | "whatsappNumber", string>>;

const fieldClass =
  "h-12 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] px-4 text-sm text-[#0F172A] shadow-none placeholder:text-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#0F766E]/20";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

export function WhatsAppConnectionModal({
  provider,
  open,
  onOpenChange,
  onConnect,
}: WhatsAppConnectionModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    accountSid: "",
    authToken: "",
    whatsappNumber: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) {
      setErrors({});
      setForm({
        accessToken: "",
        phoneNumberId: "",
        businessAccountId: "",
        accountSid: "",
        authToken: "",
        whatsappNumber: "",
      });
    }
  }, [open, provider]);

  const title = useMemo(
    () =>
      provider === "meta"
        ? "Connect WhatsApp via Meta"
        : "Connect WhatsApp via Twilio",
    [provider],
  );

  const description = useMemo(
    () =>
      provider === "meta"
        ? "You can get these credentials from Meta Developer Dashboard."
        : "Use your Twilio WhatsApp-enabled number.",
    [provider],
  );

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (provider === "meta") {
      if (!form.accessToken.trim()) {
        nextErrors.accessToken = "Access token is required.";
      }
      if (!form.phoneNumberId.trim()) {
        nextErrors.phoneNumberId = "Phone Number ID is required.";
      }
      if (!form.businessAccountId.trim()) {
        nextErrors.businessAccountId = "Business Account ID is required.";
      }
    } else {
      if (!form.accountSid.trim()) {
        nextErrors.accountSid = "Account SID is required.";
      }
      if (!form.authToken.trim()) {
        nextErrors.authToken = "Auth Token is required.";
      }

      const digits = digitsOnly(form.whatsappNumber);
      if (!digits) {
        nextErrors.whatsappNumber = "WhatsApp number is required.";
      } else if (digits.length < 8 || digits.length > 12) {
        nextErrors.whatsappNumber = "Enter a valid phone number after +91.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const simulateConnectionHealth = () => {
    if (provider === "meta") {
      return (
        form.accessToken.trim().length >= 8 &&
        !form.accessToken.toLowerCase().includes("invalid")
      );
    }

    return (
      form.accountSid.trim().startsWith("AC") &&
      form.accountSid.trim().length >= 12 &&
      form.authToken.trim().length >= 8
    );
  };

  const handleTestConnection = () => {
    if (!validate()) {
      toast({
        title: "Missing connection details",
        description: "Complete the required fields before testing.",
        variant: "destructive",
      });
      return;
    }

    if (!simulateConnectionHealth()) {
      toast({
        title: "Connection failed",
        description: `We could not verify these ${getProviderLabel(provider)} credentials.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Connection successful",
      description: `${getProviderLabel(provider)} credentials look valid and ready to use.`,
    });
  };

  const handleConnect = () => {
    if (!validate()) {
      toast({
        title: "Missing connection details",
        description: "Complete the required fields before connecting WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    if (!simulateConnectionHealth()) {
      toast({
        title: "Unable to connect",
        description: `Please review your ${getProviderLabel(provider)} credentials and try again.`,
        variant: "destructive",
      });
      return;
    }

    const connection =
      provider === "meta"
        ? createMetaConnection({
            phoneNumberId: form.phoneNumberId,
            businessAccountId: form.businessAccountId,
          })
        : createTwilioConnection({
            accountSid: form.accountSid,
            whatsappNumber: `whatsapp:+91${digitsOnly(form.whatsappNumber)}`,
          });

    onConnect(connection);
    onOpenChange(false);
  };

  const renderError = (message?: string) =>
    message ? <p className="mt-1.5 text-xs text-[#DC2626]">{message}</p> : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] rounded-[28px] border-none p-0 shadow-[0_40px_120px_rgba(15,23,42,0.18)]">
        <div className="rounded-[28px] bg-white">
          <div className="rounded-t-[28px] bg-[linear-gradient(135deg,#ECFDF5_0%,#F8FAFC_48%,#ECFEFF_100%)] px-6 py-6 sm:px-8">
            <DialogHeader className="space-y-3 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#BBF7D0] bg-white/80 px-3 py-1 text-xs font-semibold text-[#166534]">
                <ShieldCheck size={14} />
                Provider-owned WhatsApp number
              </div>
              <DialogTitle className="text-2xl font-semibold text-[#0F172A]">
                {title}
              </DialogTitle>
              <DialogDescription className="max-w-xl text-sm text-[#475569]">
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8">
            <div className="rounded-2xl border border-[#D1FAE5] bg-[#F0FDFA] p-4 text-sm text-[#0F766E]">
              <div className="flex items-start gap-3">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">We never provision numbers on your behalf.</p>
                  <p className="mt-1 text-[#0F766E]/80">
                    Connect your own {getProviderLabel(provider)} WhatsApp Business credentials and keep provider billing under your account.
                  </p>
                </div>
              </div>
            </div>

            {provider === "meta" ? (
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#0F172A]">
                    Access Token
                  </span>
                  <Input
                    value={form.accessToken}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accessToken: event.target.value,
                      }))
                    }
                    placeholder="EAAG..."
                    className={fieldClass}
                  />
                  {renderError(errors.accessToken)}
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">
                      Phone Number ID
                    </span>
                    <Input
                      value={form.phoneNumberId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phoneNumberId: event.target.value,
                        }))
                      }
                      placeholder="10394857..."
                      className={fieldClass}
                    />
                    {renderError(errors.phoneNumberId)}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">
                      Business Account ID
                    </span>
                    <Input
                      value={form.businessAccountId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          businessAccountId: event.target.value,
                        }))
                      }
                      placeholder="7829144..."
                      className={fieldClass}
                    />
                    {renderError(errors.businessAccountId)}
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">
                      Account SID
                    </span>
                    <Input
                      value={form.accountSid}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          accountSid: event.target.value,
                        }))
                      }
                      placeholder="ACxxxxxxxxxxxxxxxx"
                      className={fieldClass}
                    />
                    {renderError(errors.accountSid)}
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-[#0F172A]">
                      Auth Token
                    </span>
                    <Input
                      type="password"
                      value={form.authToken}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          authToken: event.target.value,
                        }))
                      }
                      placeholder="Your Twilio auth token"
                      className={fieldClass}
                    />
                    {renderError(errors.authToken)}
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#0F172A]">
                    WhatsApp Number
                  </span>
                  <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC]">
                    <span className="flex h-full items-center border-r border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm font-medium text-[#0F172A]">
                      whatsapp:+91
                    </span>
                    <input
                      value={form.whatsappNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          whatsappNumber: digitsOnly(event.target.value),
                        }))
                      }
                      inputMode="numeric"
                      placeholder="9876543210"
                      className="h-full w-full bg-transparent px-4 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
                    />
                  </div>
                  {renderError(errors.whatsappNumber)}
                </label>
              </div>
            )}

            <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 text-[#0F766E]" />
                <div>
                  <p className="font-medium text-[#0F172A]">Before you connect</p>
                  <p className="mt-1">
                    Verify the number is already enabled for WhatsApp Business messaging inside your {getProviderLabel(provider)} account.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-[rgba(15,23,42,0.08)] px-6 py-5 sm:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              className="h-11 rounded-xl border-[#CBD5E1] px-5"
            >
              Test Connection
            </Button>
            <Button
              type="button"
              onClick={handleConnect}
              className="h-11 rounded-xl bg-[#0F766E] px-5 text-white hover:bg-[#115E59]"
            >
              Connect WhatsApp
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
