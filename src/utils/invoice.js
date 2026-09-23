import { MONTHS, money, esc, uid } from './formatters.js';

export function nextInvoiceNo(businessId, business, invoices = []) {
  const prefix = business?.prefix || 'INV';
  const count = (invoices.filter((i) => i.businessId === businessId).length) + 1;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
}

export function calculateInvoiceTotals(items = []) {
  const validItems = items.map((item) => {
    const qty = Math.max(0, Number(item.qty || 0));
    const price = Math.max(0, Number(item.price || 0));
    const amount = qty * price;
    return {
      ...item,
      qty,
      price,
      amount
    };
  });

  const subtotal = validItems.reduce((acc, item) => acc + item.amount, 0);
  const total = subtotal;

  return {
    items: validItems,
    subtotal,
    total
  };
}

export function getNextInvoiceMonth(currentMonth, currentYear) {
  let idx = MONTHS.indexOf(currentMonth);
  let y = Number(currentYear || new Date().getFullYear());
  if (idx < 0) return { month: 'January', year: String(y) };
  idx++;
  if (idx >= 12) {
    idx = 0;
    y++;
  }
  return {
    month: MONTHS[idx],
    year: String(y)
  };
}

export function getPreviousInvoiceMonth(currentMonth, currentYear) {
  let idx = MONTHS.indexOf(currentMonth);
  let y = Number(currentYear || new Date().getFullYear());
  if (idx < 0) return '';
  idx--;
  if (idx < 0) {
    idx = 11;
    y--;
  }
  return `${MONTHS[idx]} ${y}`;
}

export function generateInvoiceHtml(invoice, business = {}, customer = {}) {
  const cur = business.currency || 'PKR';
  const items = invoice.items || [];
  const statusClass = String(invoice.status || 'unpaid').toLowerCase();
  const prevDuesVal = Number(invoice.previousDues || (Number(invoice.total || 0) > Number(invoice.subtotal || 0) ? Number(invoice.total) - Number(invoice.subtotal) : 0));
  const prevMonthLabel = invoice.previousDuesMonths || getPreviousInvoiceMonth(invoice.month, invoice.year);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(invoice.invoiceNo)}</title>
  <style>
    @page {
      margin: 0;
    }
    * { box-sizing: border-box; }
    html, body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      background: #ffffff;
      padding: 0;
      margin: 0;
      color: #172033;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice {
      max-width: 720px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 28px 16px 28px;
      background: #ffffff;
      border: none;
      position: relative;
      box-sizing: border-box;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }
    .inv-head { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 14px; border-bottom: 2px solid #1e293b; }
    .inv-brand { display: flex; gap: 12px; }
    .inv-logo { width: 54px; height: 54px; border: 1px solid #d6deea; border-radius: 6px; display: grid; place-items: center; overflow: hidden; font-weight: 800; color: #64748b; background: #fafbfd; }
    .inv-logo img { width: 100%; height: 100%; object-fit: contain; }
    .inv-brand h2 { margin: 0 0 4px; font-size: 19px; }
    .inv-brand p { margin: 2px 0; color: #64748b; font-size: 11px; }
    .inv-meta { text-align: right; }
    .inv-meta h1 { margin: 0 0 6px; font-size: 24px; color: #0b4b8f; letter-spacing: 0.5px; }
    .inv-meta div { font-size: 11px; margin: 3px 0; }
    .inv-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 18px 0; }
    .inv-info h4 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .inv-info p { margin: 3px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid; }
    .inv-table th, .inv-table td { font-size: 11px; padding: 8px 10px; border: 1px solid #dfe6ef; text-align: left; }
    .inv-table th { background: #edf3fc; font-weight: 700; color: #1e293b; }
    .inv-total { width: 320px; margin-left: auto; margin-top: 14px; page-break-inside: avoid; break-inside: avoid; }
    .inv-total div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
    .inv-total .grand { border-top: 2px solid #111827; margin-top: 5px; padding-top: 8px; font-size: 15px; font-weight: 800; }
    .badge { display: inline-block; border-radius: 999px; padding: 3px 8px; font-size: 10px; font-weight: 800; text-transform: capitalize; }
    .paid { background: #dcfce7; color: #166534; }
    .partial { background: #fef3c7; color: #92400e; }
    .unpaid { background: #fee2e2; color: #991b1b; }
    .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; margin-top: 36px; page-break-inside: avoid; break-inside: avoid; }
    .sig { text-align: center; border-top: 1px solid #9aa6b6; padding-top: 6px; font-size: 10px; color: #64748b; }
    @media print {
      html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
      .invoice { border: none !important; border-radius: 0 !important; max-width: 100% !important; box-shadow: none !important; padding: 24px 28px 16px 28px !important; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="inv-head">
      <div class="inv-brand">
        <div class="inv-logo">${business.logo ? `<img src="${business.logo}" alt="Logo">` : 'LOGO'}</div>
        <div>
          <h2>${esc(business.name || 'Your Business')}</h2>
          <p>${esc(business.address || '')}</p>
          <p>${esc([business.phone, business.email].filter(Boolean).join(' • '))}</p>
          ${business.tax ? `<p>${esc(business.tax)}</p>` : ''}
        </div>
      </div>
      <div class="inv-meta">
        <h1>INVOICE</h1>
        <div><strong>${esc(invoice.invoiceNo)}</strong></div>
        <div>Month: ${esc(invoice.month)} ${esc(invoice.year)}</div>
        <div>Invoice Date: ${esc(invoice.date)}</div>
        <div>Due Date: ${esc(invoice.due)}</div>
      </div>
    </div>
    <div class="inv-info">
      <div>
        <h4>Bill To</h4>
        <p><strong>${esc(customer.name || 'Client')}</strong></p>
        ${customer.phone ? `<p>Phone: ${esc(customer.phone)}</p>` : ''}
        ${customer.whatsapp && customer.whatsapp !== customer.phone ? `<p>WhatsApp: ${esc(customer.whatsapp)}</p>` : ''}
        ${business.address ? `<p>${esc(business.address)}</p>` : ''}
      </div>
      <div>
        <h4>Payment Status</h4>
        <p>Status: <strong>${esc(invoice.status || 'Unpaid')}</strong></p>
        <p>Paid: <strong>${money(invoice.paid, cur)}</strong></p>
        <p>Balance: <strong>${money(invoice.balance, cur)}</strong></p>
      </div>
    </div>
    <table class="inv-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((x) => `<tr>
          <td>${esc(x.name)}</td>
          <td style="text-align:center">${x.qty}</td>
          <td style="text-align:right">${money(x.price, cur)}</td>
          <td style="text-align:right">${money(x.amount, cur)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="inv-total">
      <div><span>Current Subtotal</span><strong>${money(invoice.subtotal, cur)}</strong></div>
      ${prevDuesVal > 0 ? `<div><span style="color:#d97706;font-weight:600">Previous Balance / Arrears ${prevMonthLabel ? `(${esc(prevMonthLabel)})` : ''}</span><strong style="color:#d97706">+ ${money(prevDuesVal, cur)}</strong></div>` : ''}
      ${invoice.additional ? `<div><span>Additional</span><strong>${money(invoice.additional, cur)}</strong></div>` : ''}
      ${invoice.discount ? `<div><span>Discount</span><strong>- ${money(invoice.discount, cur)}</strong></div>` : ''}
      ${invoice.taxPct ? `<div><span>Tax (${invoice.taxPct}%)</span><strong>${money(invoice.taxAmount, cur)}</strong></div>` : ''}
      <div><span>Grand Total</span><strong>${money(invoice.total, cur)}</strong></div>
      <div><span>Paid</span><strong>${money(invoice.paid, cur)}</strong></div>
      <div class="grand"><span>Balance Due</span><span>${money(invoice.balance, cur)}</span></div>
    </div>
    ${invoice.notes ? `<div style="margin-top:20px;font-size:11px;color:#475569"><strong>Notes:</strong><br>${esc(invoice.notes)}</div>` : ''}
    <div class="sigs">
      <div class="sig">Client Signature</div>
      <div class="sig">Authorized Signature</div>
    </div>
  </div>
</body>
</html>`;
}

import { downloadAsPdf } from './whatsappPdf.js';

export async function downloadInvoiceFile(invoice, business = {}, customer = {}, customName = '') {
  const doc = generateInvoiceHtml(invoice, business, customer);
  const filename = customName || `${invoice.invoiceNo || 'invoice'}.pdf`;
  await downloadAsPdf(doc, filename);
}

