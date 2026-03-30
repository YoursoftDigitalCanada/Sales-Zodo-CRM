import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { getEmailConfigStatus, sendEmail as apiSendEmail } from "@/features/emails/services/emails-service";
import { AlertTriangle, Bold, Italic, Link2, List, ListOrdered, Mail, Paperclip, Send, Settings, Smile, Underline, X } from "lucide-react";

function plainTextToHtml(value: string) {
  return value
    .split("\n")
    .map((line) => (line ? line : "<br/>"))
    .join("<br/>");
}

function htmlToPlainText(value: string) {
  if (typeof window === "undefined") {
    return value.replace(/<[^>]+>/g, " ");
  }

  const temp = document.createElement("div");
  temp.innerHTML = value;
  return (temp.textContent || temp.innerText || "").replace(/\u00A0/g, " ");
}

export function ComposeEmailSheet({
  isOpen,
  onClose,
  defaultRecipientEmail,
  defaultRecipientName,
  clientId,
  leadId,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipientEmail?: string | null;
  defaultRecipientName?: string | null;
  clientId?: string | number;
  leadId?: string | number;
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [mailboxStatus, setMailboxStatus] = useState<{
    smtpConfigured: boolean;
    imapConfigured: boolean;
    mailboxAddress: string | null;
  } | null>(null);
  const [isCheckingMailbox, setIsCheckingMailbox] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setTo(defaultRecipientEmail || "");
    setCc("");
    setSubject(defaultRecipientName ? `Regarding ${defaultRecipientName}` : "");
    setBodyHtml("");
    setAttachments([]);
    setShowCc(false);
    setIsEditorFocused(false);

    requestAnimationFrame(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    });
  }, [defaultRecipientEmail, defaultRecipientName, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setIsCheckingMailbox(true);

    getEmailConfigStatus()
      .then((status) => {
        if (!cancelled) {
          setMailboxStatus(status);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMailboxStatus(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingMailbox(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const syncEditorState = useCallback(() => {
    setBodyHtml(editorRef.current?.innerHTML || "");
  }, []);

  const applyEditorCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorState();
  }, [syncEditorState]);

  const handleSend = async () => {
    if (mailboxStatus && !mailboxStatus.smtpConfigured) {
      toast({
        title: "Mailbox Not Configured",
        description: "Set up your personal mailbox in Settings > Email before sending from lead, client, or Letter Box screens.",
        variant: "destructive",
      });
      return;
    }

    if (!to.trim() || !subject.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in the recipient and subject before sending.",
        variant: "destructive",
      });
      return;
    }

    const currentBodyHtml = (editorRef.current?.innerHTML || bodyHtml || "").trim();
    const bodyText = htmlToPlainText(currentBodyHtml).trim();
    if (!bodyText && attachments.length === 0) {
      toast({
        title: "Missing Message",
        description: "Please write a message or attach a file.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const toAddresses = to
        .split(/[,;]/)
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email }));
      const ccAddresses = cc
        ? cc
            .split(/[,;]/)
            .map((email) => email.trim())
            .filter(Boolean)
            .map((email) => ({ email }))
        : undefined;

      await apiSendEmail({
        toAddresses,
        ccAddresses,
        subject,
        bodyHtml: currentBodyHtml || plainTextToHtml(bodyText),
        bodyText,
        clientId: clientId != null ? String(clientId) : undefined,
        leadId: leadId != null ? String(leadId) : undefined,
        attachments,
      });

      toast({
        title: "Email Sent",
        description: defaultRecipientName
          ? `Your email to ${defaultRecipientName} has been sent.`
          : "Your email has been sent.",
      });
      onSent?.();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to send email.";
      toast({
        title: "Email Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-[rgba(15,23,42,0.06)]">
          <div className="pr-8">
            <SheetTitle className="flex items-center gap-2 text-[#0F172A]">
              <Mail className="h-5 w-5 text-[#14B8A6]" />
              Compose Email
            </SheetTitle>
            <SheetDescription>
              {defaultRecipientName
                ? `Send an email to ${defaultRecipientName} from your configured mailbox${mailboxStatus?.mailboxAddress ? ` (${mailboxStatus.mailboxAddress})` : ""}.`
                : `Send an email from your configured mailbox${mailboxStatus?.mailboxAddress ? ` (${mailboxStatus.mailboxAddress})` : ""}.`}
            </SheetDescription>
          </div>
        </SheetHeader>

        {!isCheckingMailbox && mailboxStatus && !mailboxStatus.smtpConfigured ? (
          <div className="mx-6 mt-4 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 text-[#DC2626]" />
                <div>
                  <p className="text-sm font-medium text-[#991B1B]">Your personal mailbox is not configured</p>
                  <p className="mt-1 text-sm text-[#B91C1C]">
                    Letter Box, lead/client quick-send, and manual email composer all use the same personal mailbox settings.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  onClose();
                  navigate("/settings/email");
                }}
              >
                <Settings size={14} className="mr-1" />
                Open Settings
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <Label className="w-14 text-sm text-[#64748B]">To</Label>
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@email.com"
                className="h-10 border-0 border-b border-[rgba(15,23,42,0.08)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#14B8A6]"
              />
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-xs font-medium text-[#14B8A6] hover:text-[#0D9488]"
                >
                  Cc
                </button>
              )}
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-3">
              <Label className="w-14 text-sm text-[#64748B]">Cc</Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@email.com"
                className="flex-1 h-10 border-0 border-b border-[rgba(15,23,42,0.08)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#14B8A6]"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label className="w-14 text-sm text-[#64748B]">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 h-10 border-0 border-b border-[rgba(15,23,42,0.08)] rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#14B8A6]"
            />
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-[#64748B]">Message</Label>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  {[
                    { icon: Bold, label: "Bold", command: "bold" },
                    { icon: Italic, label: "Italic", command: "italic" },
                    { icon: Underline, label: "Underline", command: "underline" },
                    { icon: List, label: "Bullet List", command: "insertUnorderedList" },
                    { icon: ListOrdered, label: "Numbered List", command: "insertOrderedList" },
                  ].map((tool) => (
                    <Tooltip key={tool.label}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => applyEditorCommand(tool.command)}
                          className="p-2 rounded-md hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
                        >
                          <tool.icon size={15} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tool.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => {
                          const url = window.prompt("Enter a link URL");
                          if (!url) return;
                          applyEditorCommand("createLink", url);
                        }}
                        className="p-2 rounded-md hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
                      >
                        <Link2 size={15} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Insert Link</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => applyEditorCommand("insertText", "🙂")}
                        className="p-2 rounded-md hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
                      >
                        <Smile size={15} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Insert Emoji</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            <div className="relative rounded-xl border border-[#E2E8F0] bg-white min-h-[320px] p-4">
              {!isEditorFocused && !htmlToPlainText(bodyHtml).trim() && (
                <span className="pointer-events-none absolute left-4 top-4 text-[#94A3B8] text-sm">
                  Write your message here...
                </span>
              )}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorState}
                onFocus={() => setIsEditorFocused(true)}
                onBlur={() => {
                  setIsEditorFocused(false);
                  syncEditorState();
                }}
                className="min-h-[288px] w-full outline-none text-[#334155] prose prose-sm max-w-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_p]:my-0"
              />
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-[#64748B]">Attachments</Label>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                    <Paperclip size={14} className="text-[#64748B]" />
                    <span className="text-sm text-[#0F172A]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, fileIndex) => fileIndex !== index))}
                      className="text-[#64748B] hover:text-[#DC2626]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-6 py-4 flex items-center justify-between gap-3">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setAttachments((prev) => [...prev, ...Array.from(e.target.files || [])]);
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Paperclip size={15} />
              Attach Files
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#14B8A6] hover:bg-[#0D9488] text-white gap-2"
              onClick={handleSend}
              disabled={isSending || (!isCheckingMailbox && Boolean(mailboxStatus) && !mailboxStatus.smtpConfigured)}
            >
              <Send size={15} />
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
