import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EventItem, Vendor, EventVendorAssignment, Invoice, Payment } from '../types';

export interface CostSheetSummaryData {
  totalAgreedVendorCost: number;
  contingencyAmount: number;
  logisticsAllowance: number;
  totalInternalCost: number;
  marginPercent: number;
  marginAmount: number;
  discountAmount: number;
  sellingBeforeTax: number;
  gstTax: number;
  grandTotalCustomerPrice: number;
}

export interface GenerateEventSummaryPdfParams {
  event: EventItem;
  vendors: Vendor[];
  assignments: EventVendorAssignment[];
  costSheet: CostSheetSummaryData;
  invoices?: Invoice[];
  payments?: Payment[];
  exportedBy?: string;
}

export function generateEventSummaryPdf({
  event,
  vendors,
  assignments,
  costSheet,
  invoices = [],
  payments = [],
  exportedBy = 'Operations Manager',
}: GenerateEventSummaryPdfParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const formatCurrency = (val: number) => {
    return 'Rs. ' + Math.round(val || 0).toLocaleString('en-IN');
  };

  // --- BRAND HEADER ---
  // Top Accent Bar
  doc.setFillColor(180, 83, 9); // Amber-700
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('MANGALPARV EVENT OPERATING SYSTEM', margin, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('End-to-End Luxury Celebrations & Event Management | Costing & Vendor Ledger', margin, 22);

  // Document Badge on Right
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth - margin - 58, 9, 58, 15, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('EXECUTIVE EVENT SUMMARY', pageWidth - margin - 54, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const nowStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Exported: ${nowStr}`, pageWidth - margin - 54, 19.5);

  // Horizontal Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 26, pageWidth - margin, 26);

  // --- EVENT & CLIENT METADATA BLOCK ---
  let startY = 32;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, startY, contentWidth, 31, 2, 2, 'FD');

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(event.title, margin + 4, startY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text(`Category / Type:`, margin + 4, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(event.eventType || 'Celebration', margin + 30, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Event Dates:`, margin + 4, startY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${event.eventDateStart} to ${event.eventDateEnd}`, margin + 30, startY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Venue / Location:`, margin + 4, startY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const venueTruncated = event.venueAddress.length > 40 ? event.venueAddress.substring(0, 38) + '...' : event.venueAddress;
  doc.text(venueTruncated, margin + 30, startY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Guest Count:`, margin + 4, startY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${event.guestCount || 0} Pax`, margin + 30, startY + 27);

  // Right Column
  const rightColX = margin + contentWidth / 2 + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Client Name:`, rightColX, startY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(event.customerName, rightColX + 28, startY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Pipeline Stage:`, rightColX, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(event.status, rightColX + 28, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Target Budget:`, rightColX, startY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatCurrency(event.budgetMin)} - ${formatCurrency(event.budgetMax)}`, rightColX + 28, startY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Event ID:`, rightColX, startY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(event.id, rightColX + 28, startY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated By:`, rightColX, startY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(exportedBy, rightColX + 28, startY + 27);

  startY += 37;

  // --- SECTION 1: COST SHEET & COMMERCIAL PRICING ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DYNAMIC COST SHEET & COMMERCIAL PRICING STRUCTURE', margin, startY);

  const costTableRows = [
    [
      'A. Direct Vendor Service Contracts',
      formatCurrency(costSheet.totalAgreedVendorCost),
      'Base commitment for assigned event services',
    ],
    [
      'B. Operational Logistics & Travel Allowance',
      formatCurrency(costSheet.logisticsAllowance),
      'Transportation, site labor & equipment logistics',
    ],
    [
      'C. Contingency Buffer',
      formatCurrency(costSheet.contingencyAmount),
      'Unforeseen buffer for surge and adjustments',
    ],
    [
      'TOTAL INTERNAL OPERATING COST (A + B + C)',
      formatCurrency(costSheet.totalInternalCost),
      'Baseline cost to Mangalparv',
    ],
    [
      `D. Company Gross Margin (${costSheet.marginPercent}%)`,
      '+ ' + formatCurrency(costSheet.marginAmount),
      `Management fee & overheads (${costSheet.marginPercent}%)`,
    ],
    [
      'E. Client Promotional / Negotiation Discount',
      costSheet.discountAmount > 0 ? '- ' + formatCurrency(costSheet.discountAmount) : 'Rs. 0',
      'Special price incentive applied',
    ],
    [
      'NET SELLING PRICE (Before Tax)',
      formatCurrency(costSheet.sellingBeforeTax),
      'Taxable commercial quotation',
    ],
    [
      'F. Goods & Services Tax (GST @ 18%)',
      '+ ' + formatCurrency(costSheet.gstTax),
      'Mandatory statutory tax compliance',
    ],
    [
      'GRAND TOTAL CUSTOMER PRICE (Incl. GST)',
      formatCurrency(costSheet.grandTotalCustomerPrice),
      'Final agreed package quotation',
    ],
  ];

  autoTable(doc, {
    startY: startY + 2,
    head: [['Component & Description', 'Amount (INR)', 'Remarks / Allocation']],
    body: costTableRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 85, fontStyle: 'normal' },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 'auto', textColor: [100, 116, 139] },
    },
    didParseCell: (data) => {
      // Highlight subtotals and grand totals
      const rowIndex = data.row.index;
      if (rowIndex === 3 || rowIndex === 6) {
        // Total internal cost & Net Selling Price
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      } else if (rowIndex === 8) {
        // Grand Total Customer Price
        data.cell.styles.fillColor = [254, 243, 199]; // Amber-100
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [146, 64, 14]; // Amber-800
        data.cell.styles.fontSize = 8.5;
      }
    },
  });

  // Get position after cost table
  const afterCostPos = (doc as any).lastAutoTable?.finalY || 140;
  startY = afterCostPos + 8;

  // Check if we need page break for vendor assignments
  if (startY > pageHeight - 65) {
    doc.addPage();
    startY = 18;
  }

  // --- SECTION 2: VENDOR ASSIGNMENTS & CONTRACTS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`2. VENDOR ASSIGNMENTS & SERVICE ALLOCATIONS (${assignments.length})`, margin, startY);

  if (assignments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('No vendor contracts have been assigned to this event yet.', margin, startY + 6);
    startY += 12;
  } else {
    const vendorRows = assignments.map((assignment, index) => {
      const vendorDetail = vendors.find((v) => v.id === assignment.vendorId);
      const contactStr = vendorDetail
        ? `${vendorDetail.contactName || ''} (${vendorDetail.mobile || 'N/A'})\n${vendorDetail.serviceArea || ''}`
        : 'Contact N/A';

      return [
        String(index + 1),
        assignment.category,
        assignment.vendorName,
        contactStr,
        assignment.status,
        formatCurrency(assignment.agreedCost),
        formatCurrency(assignment.customerPrice || assignment.agreedCost),
      ];
    });

    // Add total row
    vendorRows.push([
      '',
      'TOTAL COMMITTED',
      `${assignments.length} Vendors`,
      '',
      '',
      formatCurrency(costSheet.totalAgreedVendorCost),
      formatCurrency(assignments.reduce((s, a) => s + (a.customerPrice || a.agreedCost || 0), 0)),
    ]);

    autoTable(doc, {
      startY: startY + 2,
      head: [
        [
          '#',
          'Service Category',
          'Assigned Vendor',
          'Contact & Area',
          'Status',
          'Agreed Cost',
          'Customer Quoted',
        ],
      ],
      body: vendorRows,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [180, 83, 9], // Amber-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 38, fontStyle: 'bold', textColor: [15, 23, 42] },
        3: { cellWidth: 38 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
      },
      didParseCell: (data) => {
        // Highlight total row
        if (data.row.index === vendorRows.length - 1) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
        }
      },
    });

    const afterVendorPos = (doc as any).lastAutoTable?.finalY || startY + 40;
    startY = afterVendorPos + 8;
  }

  // --- SECTION 3: INVOICES & PAYMENTS SNAPSHOT (IF PRESENT) ---
  if (invoices.length > 0 || payments.length > 0) {
    if (startY > pageHeight - 55) {
      doc.addPage();
      startY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('3. COMMERCIAL BILLING & COLLECTIONS SNAPSHOT', margin, startY);

    const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const customerPayments = payments.filter((p) => p.payerType === 'Customer' && p.status === 'Success');
    const totalCollected = customerPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const balanceDue = Math.max(0, totalInvoiced - totalCollected);

    autoTable(doc, {
      startY: startY + 2,
      head: [['Metric', 'Amount (INR)', 'Status & Details']],
      body: [
        ['Total Invoiced to Client', formatCurrency(totalInvoiced), `${invoices.length} invoices generated`],
        ['Total Payments Received', formatCurrency(totalCollected), `${customerPayments.length} verified transactions`],
        ['Outstanding Balance Receivable', formatCurrency(balanceDue), balanceDue === 0 ? 'All Invoices Cleared' : 'Pending Client Settlement'],
      ],
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto', textColor: [100, 116, 139] },
      },
    });

    const afterFinancePos = (doc as any).lastAutoTable?.finalY || startY + 30;
    startY = afterFinancePos + 8;
  }

  // Check if sign-off box fits on current page, else add page
  if (startY > pageHeight - 38) {
    doc.addPage();
    startY = 20;
  }

  // --- SIGN-OFF & AUTH BLOCK ---
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, startY, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INTERNAL APPROVAL & AUDIT VERIFICATION', margin + 4, startY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared by: ' + exportedBy, margin + 4, startY + 11);
  doc.text('Operational Status: ' + event.status, margin + 4, startY + 16);

  doc.text('Authorized Signature (Mangalparv Events): ___________________________', margin + contentWidth / 2 - 10, startY + 14);

  // --- FOOTER & PAGE NUMBERING ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Footer divider
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.text(
      'Mangalparv Event Operating System • Confidential Operational Summary • Strictly for authorized stakeholders',
      margin,
      pageHeight - 5
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin - 15,
      pageHeight - 5
    );
  }

  // Generate safe filename and trigger browser download
  const sanitizedTitle = event.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
  const dateStamp = new Date().toISOString().split('T')[0];
  const filename = `${sanitizedTitle}_Cost_and_Vendor_Summary_${dateStamp}.pdf`;

  doc.save(filename);
}
