import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from './invoiceUtils';

// Define Data Interface
interface InvoiceData {
  invoiceNo: string;
  date: string;
  billedBy: {
    businessName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    gstin: string;
    pan: string;
    email: string;
    phone: string;
  };
  billedTo: {
    businessName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    gstin: string;
    pan: string;
    phone: string;
    email: string;
  };
  items: Array<{
    name: string;
    hsn?: string;
    quantity: number;
    rate: number;
    amount: number;
    cgst: number;
    sgst: number;
    total: number;
    gstRate: number;
  }>;
}

export const generateInvoicePDF = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  
  // Colors
  const brandColor = "#7c3aed"; 
  const grayColor = "#6b7280";

  // --- 1. HEADER ---
  // Badge
  doc.setFillColor(255, 165, 0);
  doc.roundedRect(margin + 22, 10, 15, 6, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Unpaid", margin + 24, 14);

  // Title
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", margin, 20);

  // Company Name
  doc.setFontSize(14);
  doc.text(data.billedBy.businessName || "Your Company", pageWidth - margin - 5, 16, { align: "right" });
  
  // Details
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  
  let yPos = 35;
  const lineHeight = 5;

  doc.text("Invoice #", margin, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(data.invoiceNo, margin + 25, yPos);
  
  yPos += lineHeight;
  doc.setTextColor(grayColor);
  doc.text("Invoice Date", margin, yPos);
  doc.setTextColor(0, 0, 0);
  doc.text(data.date, margin + 25, yPos);

  // --- 2. ADDRESS BLOCKS ---
  yPos += 10;
  const boxWidth = (pageWidth - (margin * 2) - 10) / 2;
  const boxHeight = 45;

  // Backgrounds
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, "FD");
  doc.roundedRect(margin + boxWidth + 10, yPos, boxWidth, boxHeight, 2, 2, "FD");

  // Billed By
  let boxY = yPos + 8;
  doc.setFontSize(8);
  doc.setTextColor(brandColor);
  doc.text("Billed By", margin + 5, boxY);
  
  boxY += 6;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(data.billedBy.businessName || "", margin + 5, boxY);
  
  boxY += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  
  const byAddr = `${data.billedBy.address || ''}\n${data.billedBy.city || ''} ${data.billedBy.state || ''} ${data.billedBy.zip || ''}`;
  doc.text(byAddr, margin + 5, boxY);

  // Billed To
  boxY = yPos + 8;
  const rightBoxX = margin + boxWidth + 10;
  
  doc.setFontSize(8);
  doc.setTextColor(brandColor);
  doc.text("Billed To", rightBoxX + 5, boxY);
  
  boxY += 6;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(data.billedTo.businessName || "", rightBoxX + 5, boxY);
  
  boxY += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(grayColor);
  
  const toAddr = `${data.billedTo.address || ''}\n${data.billedTo.city || ''} ${data.billedTo.state || ''} ${data.billedTo.zip || ''}`;
  doc.text(toAddr, rightBoxX + 5, boxY);

  // --- 3. ITEMS TABLE ---
  yPos += boxHeight + 10;

  const tableHeaders = ["Item Name", "HSN", "QTY", "CGST", "SGST", "AMOUNT"];
  const tableData = data.items.map(item => [
    item.name,
    item.hsn || "-",
    item.quantity,
    `₹${item.cgst.toFixed(2)}`,
    `₹${item.sgst.toFixed(2)}`,
    `₹${item.amount.toFixed(2)}`
  ]);

  // Use the imported autoTable function directly (Pass 'doc' as the first argument)
  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: brandColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      valign: 'middle',
      lineColor: [230, 230, 230],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // --- 4. TOTALS ---
  // Access finalY from the doc object, handled by the plugin
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  let footerRightY = finalY;
  const rightColX = pageWidth - margin - 70;
  
  const subTotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCGST = data.items.reduce((sum, item) => sum + (item.cgst || 0), 0);
  const totalSGST = data.items.reduce((sum, item) => sum + (item.sgst || 0), 0);
  const grandTotal = data.items.reduce((sum, item) => sum + (item.total || 0), 0);

  const printTotalRow = (label: string, value: string, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(isBold ? 0 : grayColor);
    doc.setFontSize(isBold ? 11 : 9);
    doc.text(label, rightColX, footerRightY);
    doc.text(value, pageWidth - margin, footerRightY, { align: "right" });
    footerRightY += 6;
  };

  printTotalRow("Sub Total", `₹ ${subTotal.toFixed(2)}`);
  printTotalRow("CGST", `₹ ${totalCGST.toFixed(2)}`);
  printTotalRow("SGST", `₹ ${totalSGST.toFixed(2)}`);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(rightColX, footerRightY, pageWidth - margin, footerRightY);
  footerRightY += 6;
  
  printTotalRow("Total (INR)", `₹ ${grandTotal.toFixed(2)}`, true);

  // Amount in words
  footerRightY += 5;
  doc.setFontSize(8);
  doc.setTextColor(grayColor);
  doc.setFont("helvetica", "italic");
  const words = doc.splitTextToSize(`${numberToWords(grandTotal)}`, 80);
  doc.text(words, rightColX, footerRightY);

  // Save
  doc.save(`Invoice-${data.invoiceNo}.pdf`);
};