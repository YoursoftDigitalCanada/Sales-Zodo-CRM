export interface PrintableInvoiceParty {
  businessName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  gstNumber?: string;
}

export interface PrintableInvoiceItem {
  description: string;
  details?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
}

export interface PrintableInvoiceSummaryLine {
  label: string;
  amount: number;
  tone?: "default" | "muted" | "positive";
}

export interface PrintableInvoiceDocument {
  title?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  amountDue?: number;
  amountDueLabel?: string;
  brandName?: string;
  brandLogoUrl?: string | null;
  billedBy: PrintableInvoiceParty;
  billedTo: PrintableInvoiceParty;
  items: PrintableInvoiceItem[];
  summaryLines: PrintableInvoiceSummaryLine[];
  total: number;
  notes?: string;
  terms?: string;
}

const escapeHtml = (value?: string | null) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatCurrency = (amount: number, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

const toMultilineHtml = (value?: string) =>
  escapeHtml(value).replaceAll("\n", "<br />");

const buildPartyLines = (party: PrintableInvoiceParty) => {
  const locality = [party.city, party.province, party.postalCode].filter(Boolean).join(", ");
  return [
    party.address,
    locality,
    party.country,
    party.email,
    party.phone,
    party.gstNumber ? `GST/HST: ${party.gstNumber}` : undefined,
  ].filter(Boolean) as string[];
};

const renderSummaryLine = (line: PrintableInvoiceSummaryLine, currency: string) => {
  const amountClass =
    line.tone === "positive"
      ? "summary-amount positive"
      : line.tone === "muted"
        ? "summary-amount muted"
        : "summary-amount";

  return `
    <div class="summary-row">
      <span class="summary-label">${escapeHtml(line.label)}</span>
      <span class="${amountClass}">${escapeHtml(formatCurrency(line.amount, currency))}</span>
    </div>
  `;
};

const renderInvoiceHtml = (invoice: PrintableInvoiceDocument) => {
  const currency = invoice.currency || "CAD";
  const amountDue = invoice.amountDue ?? invoice.total;
  const brandName = invoice.brandName?.trim() || invoice.billedBy.businessName || "Invoice";

  const fromLines = buildPartyLines(invoice.billedBy);
  const toLines = buildPartyLines(invoice.billedTo);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(invoice.invoiceNumber || "Invoice")}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #ffffff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { padding: 24px; }
      .page { width: 100%; max-width: 860px; margin: 0 auto; }
      .card { border: 1px solid rgba(15, 23, 42, 0.10); border-radius: 16px; padding: 32px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 28px; }
      .eyebrow { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; margin-bottom: 8px; }
      .title { font-size: 38px; line-height: 1; margin: 0 0 10px; font-weight: 700; }
      .subtitle { font-size: 16px; color: #475569; margin: 0; }
      .brand-block { text-align: right; min-width: 120px; }
      .logo-box { width: 88px; height: 88px; border-radius: 16px; border: 1px solid rgba(15, 23, 42, 0.08); background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; margin-left: auto; }
      .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .logo-text { font-size: 28px; font-weight: 700; color: #0f172a; }
      .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 20px; border-radius: 16px; background: #f8fafc; margin-bottom: 28px; }
      .summary-grid .value { margin-top: 6px; font-size: 16px; font-weight: 600; color: #0f172a; }
      .summary-grid .value.highlight { color: #0891b2; font-size: 22px; font-weight: 700; }
      .party-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-bottom: 28px; }
      .party-card { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 16px; padding: 18px; }
      .party-name { font-size: 18px; font-weight: 600; margin: 0 0 10px; }
      .party-line { margin: 4px 0; color: #475569; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
      thead th { padding: 14px 10px; border-bottom: 2px solid #22d3ee; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: #64748b; text-align: left; }
      thead th.qty { width: 90px; text-align: center; }
      thead th.money { width: 140px; text-align: right; }
      tbody td { padding: 14px 10px; border-bottom: 1px solid rgba(15, 23, 42, 0.08); vertical-align: top; font-size: 14px; }
      .item-title { font-weight: 600; color: #0f172a; margin-bottom: 4px; }
      .item-details { color: #64748b; font-size: 12px; }
      td.center { text-align: center; color: #475569; }
      td.right { text-align: right; color: #0f172a; }
      .summary-section { display: flex; justify-content: flex-end; margin-bottom: 28px; }
      .summary-box { width: 320px; }
      .summary-row, .total-row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; }
      .summary-label { color: #64748b; font-size: 14px; }
      .summary-amount { color: #0f172a; font-size: 14px; font-weight: 500; }
      .summary-amount.muted { color: #475569; }
      .summary-amount.positive { color: #16a34a; }
      .total-row { border-top: 1px solid rgba(15, 23, 42, 0.12); margin-top: 6px; padding-top: 14px; }
      .total-row .label { font-size: 15px; font-weight: 700; color: #0f172a; }
      .total-row .amount { font-size: 24px; font-weight: 800; color: #0891b2; }
      .extra-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
      .extra-card { border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 16px; padding: 18px; min-height: 120px; }
      .extra-title { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.08em; }
      .extra-body { color: #475569; font-size: 14px; line-height: 1.6; }
      .payment-instructions { margin-top: 24px; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 12px; background: #f8fafc; padding: 20px 24px; }
      .payment-instructions .extra-title { margin-bottom: 10px; }
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
        <div class="header">
          <div>
            <div class="eyebrow">${escapeHtml(invoice.title || "Invoice")}</div>
            <h1 class="title">INVOICE</h1>
            <p class="subtitle">${escapeHtml(invoice.invoiceNumber)}</p>
          </div>
          <div class="brand-block">
            <div class="logo-box">
              ${
                invoice.brandLogoUrl
                  ? `<img src="${escapeHtml(invoice.brandLogoUrl)}" alt="${escapeHtml(brandName)} logo" />`
                  : `<span class="logo-text">${escapeHtml((brandName || "IN").slice(0, 2).toUpperCase())}</span>`
              }
            </div>
          </div>
        </div>

        <div class="summary-grid">
          <div>
            <div class="eyebrow">Invoice Date</div>
            <div class="value">${escapeHtml(formatDate(invoice.invoiceDate))}</div>
          </div>
          <div>
            <div class="eyebrow">Due Date</div>
            <div class="value">${escapeHtml(formatDate(invoice.dueDate))}</div>
          </div>
          <div>
            <div class="eyebrow">${escapeHtml(invoice.amountDueLabel || "Amount Due")}</div>
            <div class="value highlight">${escapeHtml(formatCurrency(amountDue, currency))}</div>
          </div>
        </div>

        <div class="party-grid">
          <div class="party-card">
            <div class="eyebrow">From</div>
            <p class="party-name">${escapeHtml(invoice.billedBy.businessName || brandName)}</p>
            ${fromLines.map((line) => `<p class="party-line">${escapeHtml(line)}</p>`).join("")}
          </div>
          <div class="party-card">
            <div class="eyebrow">Bill To</div>
            <p class="party-name">${escapeHtml(invoice.billedTo.businessName || "Client")}</p>
            ${toLines.map((line) => `<p class="party-line">${escapeHtml(line)}</p>`).join("")}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="qty">Qty</th>
              <th class="money">Rate</th>
              <th class="money">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map((item) => `
              <tr>
                <td>
                  <div class="item-title">${escapeHtml(item.description || "Line Item")}</div>
                  ${item.details ? `<div class="item-details">${escapeHtml(item.details)}</div>` : ""}
                </td>
                <td class="center">${escapeHtml(String(item.quantity ?? 0))}</td>
                <td class="right">${escapeHtml(formatCurrency(item.rate ?? 0, currency))}</td>
                <td class="right">${escapeHtml(formatCurrency(item.amount ?? 0, currency))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div class="summary-section">
          <div class="summary-box">
            ${invoice.summaryLines.map((line) => renderSummaryLine(line, currency)).join("")}
            <div class="total-row">
              <span class="label">Total</span>
              <span class="amount">${escapeHtml(formatCurrency(invoice.total, currency))}</span>
            </div>
          </div>
        </div>

        ${
          invoice.notes
            ? `
              <div class="extra-grid">
                ${
                  invoice.notes
                    ? `
                      <div class="extra-card">
                        <h2 class="extra-title">Notes</h2>
                        <div class="extra-body">${toMultilineHtml(invoice.notes)}</div>
                      </div>
                    `
                    : ""
                }
              </div>
            `
            : ""
        }
        ${
          invoice.terms
            ? `
              <div class="payment-instructions">
                <h2 class="extra-title">Payment Instructions / Terms</h2>
                <div class="extra-body">${toMultilineHtml(invoice.terms)}</div>
              </div>
            `
            : ""
        }
      </div>
    </div>
  </body>
</html>
  `;
};

export function printInvoiceDocument(invoice: PrintableInvoiceDocument): Promise<void> {
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
      reject(error instanceof Error ? error : new Error("Could not open invoice print preview."));
    };

    iframe.onload = () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) {
        fail(new Error("Could not open invoice print preview."));
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
    iframe.srcdoc = renderInvoiceHtml(invoice);
  });
}
