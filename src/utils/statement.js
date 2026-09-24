import { money, esc, today, MONTHS } from './formatters.js';
import { downloadAsPdf, sendPdfToWhatsApp, downloadAndSendWhatsApp } from './whatsappPdf.js';

/**
 * Generate a complete, elegant Client Account Statement HTML document.
 */
export function generateStatementHtml(customer = {}, business = {}, invoices = []) {
  const p = business.proposalData || {};
  const cur = business.currency || 'PKR';
  const custInvoices = invoices
    .filter((i) => String(i.customerId) === String(customer.id))
    .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));

  const totalInvoiced = custInvoices.reduce((sum, i) => sum + Number(i.subtotal || i.total || 0), 0);
  const totalPaid = custInvoices.reduce((sum, i) => sum + Number(i.paid || 0), 0);
  const totalOutstanding = custInvoices.reduce((sum, i) => sum + Math.max(0, Number(i.subtotal || 0) - Number(i.paid || 0)), 0);

  const orgName = p.companyName || 'iSysware Software Solution';
  const orgAddress = p.officeAddress || business.address || '';
  const orgContact = [p.supportPhone || business.phone, p.inquiryEmail || business.email, p.websiteUrl].filter(Boolean).join(' • ');

  // Build sequential ledger transactions
  let runningBalance = 0;
  const ledgerRows = [];

  custInvoices.forEach((inv) => {
    // 1. Invoice Debit
    const invDebit = Number(inv.subtotal || inv.total || 0);
    runningBalance += invDebit;
    ledgerRows.push({
      date: inv.date || '-',
      type: 'Invoice Generated',
      ref: inv.invoiceNo,
      description: `Monthly Fee (${inv.month} ${inv.year})`,
      debit: invDebit,
      credit: 0,
      balance: runningBalance,
      status: inv.status
    });

    // 2. Payments Credit
    if (inv.payments && inv.payments.length > 0) {
      inv.payments.forEach((p) => {
        const pAmt = Number(p.amount || 0);
        runningBalance -= pAmt;
        ledgerRows.push({
          date: p.date || '-',
          type: 'Payment Received',
          ref: `REC-${inv.invoiceNo}`,
          description: `${p.method || 'Cash'} Payment (${p.time || ''})`,
          debit: 0,
          credit: pAmt,
          balance: runningBalance,
          status: 'Paid'
        });
      });
    }
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Statement - ${esc(customer.name || 'Client')}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fb; padding: 24px; color: #172033; margin: 0; }
    .statement { max-width: 780px; margin: 0 auto; padding: 32px 36px; background: #fff; border: 1px solid #dfe6ef; border-radius: 12px; position: relative; }
    .st-head { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 20px; border-bottom: 2px solid #0f2744; }
    .st-brand { display: flex; gap: 14px; }
    .st-logo { width: 62px; height: 62px; border: 1px solid #d6deea; border-radius: 8px; display: grid; place-items: center; overflow: hidden; font-weight: 800; color: #64748b; background: #fafbfd; }
    .st-logo img { width: 100%; height: 100%; object-fit: contain; }
    .st-brand h2 { margin: 0 0 4px; font-size: 22px; color: #0f2744; }
    .st-brand p { margin: 2px 0; color: #64748b; font-size: 11.5px; }
    .st-meta { text-align: right; }
    .st-meta h1 { margin: 0 0 6px; font-size: 24px; color: #0b4b8f; letter-spacing: 0.5px; }
    .st-meta div { font-size: 11.5px; margin: 3px 0; color: #475569; }
    
    .st-client-box { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin: 22px 0; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .st-client-box h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
    .st-client-box p { margin: 3px 0; font-size: 12.5px; color: #1e293b; }

    .st-summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
    .st-card { padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
    .st-card.billed { background: #eff6ff; border-color: #bfdbfe; }
    .st-card.paid { background: #f0fdf4; border-color: #bbf7d0; }
    .st-card.due { background: #fef2f2; border-color: #fecaca; }
    .st-card-label { font-size: 10.5px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .st-card-val { font-size: 16px; font-weight: 800; }
    .st-card.billed .st-card-val { color: #1d4ed8; }
    .st-card.paid .st-card-val { color: #15803d; }
    .st-card.due .st-card-val { color: #b91c1c; }

    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    .st-table th, .st-table td { font-size: 11px; padding: 9px 10px; border: 1px solid #e2e8f0; text-align: left; }
    .st-table th { background: #0f2744; color: #fff; font-weight: 700; font-size: 11px; }
    .st-table tr:nth-child(even) td { background: #f8fafc; }
    .st-table tr.pay td { background: #f0fdf4; }

    .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; margin-top: 50px; }
    .sig { text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 10.5px; color: #64748b; }

    @media print {
      body { background: #fff; padding: 0; }
      .statement { border: none; border-radius: 0; max-width: 100%; box-shadow: none; padding: 10px; }
      @page { size: A4; margin: 10mm 12mm; }
    }
  </style>
</head>
<body>
  <div class="statement">
    <div class="st-head">
      <div class="st-brand">
        <div class="st-logo">${business.logo ? `<img src="${business.logo}" alt="Logo">` : 'LOGO'}</div>
        <div>
          <h2>${esc(orgName)}</h2>
          ${orgAddress ? `<p>${esc(orgAddress)}</p>` : ''}
          ${orgContact ? `<p>${esc(orgContact)}</p>` : ''}
          ${p.ntnTax ? `<p>NTN/Tax: ${esc(p.ntnTax)}</p>` : ''}
        </div>
      </div>
      <div class="st-meta">
        <h1>ACCOUNT STATEMENT</h1>
        <div>Statement Date: <strong>${today()}</strong></div>
        <div>Total Transactions: <strong>${ledgerRows.length}</strong></div>
      </div>
    </div>

    <div class="st-client-box">
      <div>
        <h4>Statement For:</h4>
        <p><strong>${esc(customer.name || 'Client')}</strong></p>
        ${(customer.company || business.name) ? `<p>Organization: ${esc(customer.company || business.name)}</p>` : ''}
        ${customer.phone ? `<p>Phone: ${esc(customer.phone)}</p>` : ''}
        ${customer.whatsapp && customer.whatsapp !== customer.phone ? `<p>WhatsApp: ${esc(customer.whatsapp)}</p>` : ''}
      </div>
      <div>
        <h4>Account Overview:</h4>
        <p>Total Invoices: <strong>${custInvoices.length}</strong></p>
        <p>Account Status: <strong>${totalOutstanding <= 0 ? '✅ Up to Date' : '⚠️ Outstanding Dues'}</strong></p>
      </div>
    </div>

    <div class="st-summary-cards">
      <div class="st-card billed">
        <div class="st-card-label">Total Invoiced</div>
        <div class="st-card-val">${money(totalInvoiced, cur)}</div>
      </div>
      <div class="st-card paid">
        <div class="st-card-label">Total Paid</div>
        <div class="st-card-val">${money(totalPaid, cur)}</div>
      </div>
      <div class="st-card due">
        <div class="st-card-label">Current Balance Due</div>
        <div class="st-card-val">${money(totalOutstanding, cur)}</div>
      </div>
    </div>

    <table class="st-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Reference #</th>
          <th>Description</th>
          <th style="text-align:right">Invoiced (+)</th>
          <th style="text-align:right">Paid (-)</th>
          <th style="text-align:right">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${ledgerRows.length > 0 ? ledgerRows.map((r) => `
          <tr class="${r.credit > 0 ? 'pay' : ''}">
            <td>${esc(r.date)}</td>
            <td><strong>${esc(r.ref)}</strong></td>
            <td>${esc(r.description)}</td>
            <td style="text-align:right">${r.debit > 0 ? money(r.debit, cur) : '-'}</td>
            <td style="text-align:right; color:#16a34a; font-weight:${r.credit > 0 ? '700' : 'normal'}">${r.credit > 0 ? money(r.credit, cur) : '-'}</td>
            <td style="text-align:right; font-weight:700; color:${r.balance > 0 ? '#b91c1c' : '#16a34a'}">${money(r.balance, cur)}</td>
          </tr>
        `).join('') : `
          <tr>
            <td colSpan="6" style="text-align:center; padding:18px; color:#64748b;">No account transactions recorded for this client.</td>
          </tr>
        `}
      </tbody>
    </table>

    <div class="sigs">
      <div class="sig">Client Signature / Stamp</div>
      <div class="sig">Authorized Signature</div>
    </div>
  </div>
</body>
</html>`;
}
