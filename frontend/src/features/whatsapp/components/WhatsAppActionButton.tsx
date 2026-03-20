import { useMemo, useState, type ComponentProps } from "react";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWhatsAppIntegration } from "@/features/whatsapp/use-whatsapp-integration";
import { WhatsAppChatSheet } from "@/features/whatsapp/components/WhatsAppChatSheet";

interface WhatsAppActionButtonProps {
  contactName: string;
  phoneNumber?: string | null;
  className?: string;
  label?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}

export function WhatsAppActionButton({
  contactName,
  phoneNumber,
  className,
  label = "WhatsApp",
  variant = "outline",
  size = "sm",
}: WhatsAppActionButtonProps) {
  const [open, setOpen] = useState(false);
  const { access, primaryConnection } = useWhatsAppIntegration();

  const disabledReason = useMemo(() => {
    if (!phoneNumber) {
      return "Add a phone number to start a WhatsApp conversation.";
    }
    if (!access.enabled) {
      return "WhatsApp integration is available on Standard and Premium plans.";
    }
    if (!primaryConnection) {
      return "Connect WhatsApp in Settings to use this feature.";
    }
    return null;
  }, [access.enabled, phoneNumber, primaryConnection]);

  const button = (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={Boolean(disabledReason)}
      onClick={() => setOpen(true)}
      className={cn(
        "gap-1.5 rounded-lg border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F9FAFB]",
        !disabledReason && "hover:border-[#A7F3D0] hover:text-[#0F766E]",
        className,
      )}
    >
      <MessageCircle className={disabledReason ? "text-[#94A3B8]" : "text-[#16A34A]"} />
      {label}
    </Button>
  );

  return (
    <>
      {disabledReason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{button}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}

      {primaryConnection && phoneNumber ? (
        <WhatsAppChatSheet
          open={open}
          onOpenChange={setOpen}
          contactName={contactName}
          phoneNumber={phoneNumber}
          connection={primaryConnection}
          allowTeamAssignment={access.teamAssignment}
          allowAutomation={access.automation}
        />
      ) : null}
    </>
  );
}
