export interface PrintableEmailRecipient {
  name?: string;
  email: string;
}

export interface PrintableEmailAttachment {
  name: string;
  size?: string;
  type?: string;
}

export interface PrintableEmailDocument {
  subject: string;
  from: PrintableEmailRecipient;
  to: PrintableEmailRecipient[];
  cc?: PrintableEmailRecipient[];
  bcc?: PrintableEmailRecipient[];
  dateLabel?: string;
  bodyHtml: string;
  attachments?: PrintableEmailAttachment[];
}

const escapeHtml = (value?: string | null) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const sanitizeBodyHtml = (value: string) =>
  value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

const formatRecipient = (recipient: PrintableEmailRecipient) => {
  const name = (recipient.name || "").trim();
  if (!name || name.toLowerCase() === recipient.email.toLowerCase()) {
    return escapeHtml(recipient.email);
  }
  return `${escapeHtml(name)} &lt;${escapeHtml(recipient.email)}&gt;`;
};

const renderRecipientLine = (label: string, recipients?: PrintableEmailRecipient[]) => {
  if (!recipients || recipients.length === 0) return "";
  return `
    <div class="meta-row">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="meta-value">${recipients.map(formatRecipient).join(", ")}</span>
    </div>
  `;
};

const renderEmailHtml = (email: PrintableEmailDocument) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(email.subject || "Email")}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { padding: 24px; }
      .page { width: 100%; max-width: 860px; margin: 0 auto; }
      .card { border: 1px solid rgba(15, 23, 42, 0.10); border-radius: 16px; padding: 32px; }
      .eyebrow { margin: 0 0 10px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
      .subject { margin: 0 0 24px; font-size: 30px; line-height: 1.2; font-weight: 700; color: #0f172a; }
      .meta-card { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 16px; background: #f8fafc; padding: 18px 20px; margin-bottom: 24px; }
      .meta-row { display: flex; gap: 16px; padding: 6px 0; align-items: flex-start; }
      .meta-label { width: 68px; flex-shrink: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; font-weight: 700; }
      .meta-value { flex: 1; min-width: 0; color: #0f172a; font-size: 14px; line-height: 1.6; word-break: break-word; }
      .body { color: #0f172a; font-size: 15px; line-height: 1.7; }
      .body img { max-width: 100%; height: auto; }
      .body table { width: 100% !important; max-width: 100%; border-collapse: collapse; }
      .body pre { white-space: pre-wrap; word-break: break-word; }
      .body blockquote { margin: 16px 0; padding-left: 16px; border-left: 3px solid #cbd5e1; color: #475569; }
      .attachments { margin-top: 28px; border-top: 1px solid rgba(15, 23, 42, 0.08); padding-top: 18px; }
      .attachments-title { margin: 0 0 12px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; font-weight: 700; }
      .attachment-list { margin: 0; padding-left: 18px; color: #475569; }
      .attachment-list li { margin: 6px 0; }
      @page { size: auto; margin: 12mm; }
      @media print {
        body { padding: 0; }
        .page { max-width: none; }
        .card { border: none; border-radius: 0; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <p class="eyebrow">Email</p>
        <h1 class="subject">${escapeHtml(email.subject || "(No Subject)")}</h1>

        <div class="meta-card">
          <div class="meta-row">
            <span class="meta-label">From</span>
            <span class="meta-value">${formatRecipient(email.from)}</span>
          </div>
          ${renderRecipientLine("To", email.to)}
          ${renderRecipientLine("Cc", email.cc)}
          ${renderRecipientLine("Bcc", email.bcc)}
          ${
            email.dateLabel
              ? `
                <div class="meta-row">
                  <span class="meta-label">Date</span>
                  <span class="meta-value">${escapeHtml(email.dateLabel)}</span>
                </div>
              `
              : ""
          }
        </div>

        <div class="body">${sanitizeBodyHtml(email.bodyHtml || "")}</div>

        ${
          email.attachments && email.attachments.length > 0
            ? `
              <div class="attachments">
                <p class="attachments-title">Attachments</p>
                <ul class="attachment-list">
                  ${email.attachments.map((attachment) => `
                    <li>
                      ${escapeHtml(attachment.name)}
                      ${
                        attachment.size
                          ? ` <span>(${escapeHtml(attachment.size)})</span>`
                          : ""
                      }
                    </li>
                  `).join("")}
                </ul>
              </div>
            `
            : ""
        }
      </div>
    </div>
  </body>
</html>
`;

export function printEmailDocument(email: PrintableEmailDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => {
        iframe.remove();
      }, 300);
      resolve();
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      iframe.remove();
      reject(error instanceof Error ? error : new Error("Could not open email print preview."));
    };

    iframe.onload = () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        fail(new Error("Could not open email print preview."));
        return;
      }

      printWindow.addEventListener("afterprint", cleanup, { once: true });

      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          window.setTimeout(cleanup, 1500);
        } catch (error) {
          fail(error);
        }
      }, 350);
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = renderEmailHtml(email);
  });
}
