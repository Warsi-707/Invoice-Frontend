import { money, esc } from './formatters.js';

export function generateProposalHtml(proposal = {}, business = {}, customer = {}) {
  const cur = business.currency || 'PKR';
  const items = proposal.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 1) * Number(item.price || 0)), 0);
  const totalDiscount = items.reduce((sum, item) => sum + Number(item.discount || 0), 0) || Number(proposal.discount || 0);
  const totalTaxAmount = items.reduce((sum, item) => {
    const gross = Number(item.qty || 1) * Number(item.price || 0);
    const taxBase = Math.max(0, gross - Number(item.discount || 0));
    return sum + (taxBase * Number(item.taxPct || 0)) / 100;
  }, 0) || (((subtotal - totalDiscount) * Number(proposal.taxPct || 0)) / 100);
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTaxAmount);

  const bizName = proposal.companyName || business.name || 'Commercial Proposal';
  const clientName = customer.name || proposal.clientName || 'Valued Client';
  const clientCompany = customer.company || proposal.clientCompany || '';
  const proposalNo = proposal.proposalNo || `PROP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
  const proposalDate = proposal.date || new Date().toISOString().split('T')[0];
  const validity = proposal.validity || '15 Days from issuance';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(proposal.title || 'Commercial Proposal')} - ${esc(proposalNo)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * { box-sizing: border-box; }
    html, body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .a4-page {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      background: #ffffff !important;
      border: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
    }
    .letterhead-top {
      border-bottom: 2.5px solid #0b4b8f;
      padding-bottom: 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .brand-block h1 {
      margin: 0 0 3px;
      font-size: 22px;
      font-weight: 800;
      color: #0b4b8f;
      letter-spacing: -0.5px;
    }
    .brand-block p {
      margin: 2px 0;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
    }
    .brand-tagline {
      font-size: 10.5px;
      font-weight: 600;
      color: #0284c7;
      margin-bottom: 4px !important;
    }
    .tax-badge {
      display: inline-block;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
      margin-top: 3px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title-badge {
      background: #0b4b8f;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 5px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .meta-row {
      font-size: 10.5px;
      margin: 2px 0;
      color: #475569;
    }
    .meta-row strong {
      color: #0f172a;
    }

    /* Client & Overview */
    .proposal-target {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 12px 0 14px;
      padding: 10px 14px;
      background: #f8fbff;
      border: 1px solid #dbeafe;
      border-radius: 6px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .target-box h4 {
      margin: 0 0 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0369a1;
    }
    .target-box p {
      margin: 2px 0;
      font-size: 11.5px;
      color: #334155;
    }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0b4b8f;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 14px 0 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }

    .overview-text {
      font-size: 11.5px;
      line-height: 1.5;
      color: #334155;
      margin: 0 0 12px;
      white-space: pre-line;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th {
      background: #edf4fe;
      color: #1e3a8a;
      font-size: 10.5px;
      font-weight: 750;
      text-transform: uppercase;
      padding: 7px 9px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 7px 9px;
      font-size: 11px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #fafcff;
    }
    .item-desc {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Terms */
    .terms-box {
      margin-top: 8px;
      padding: 10px 12px;
      background: #f8fafc;
      border-left: 3px solid #0b4b8f;
      border-radius: 0 4px 4px 0;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.5;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Signatures */
    .sigs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 80px;
      margin-top: 36px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig {
      text-align: center;
      border-top: 1px solid #9aa6b6;
      padding-top: 6px;
      font-size: 10px;
      color: #64748b;
    }
    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .a4-page {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      @page {
        size: A4 portrait;
        margin: 12mm 15mm;
      }
    }
  </style>
</head>
<body>
  <div class="a4-page">
    <div>
      <!-- Letterhead Top Header -->
      <div class="letterhead-top">
        <div class="brand-block">
          <h1>${esc(bizName)}</h1>
          ${proposal.tagline ? `<p class="brand-tagline">${esc(proposal.tagline)}</p>` : ''}
          ${(proposal.officeAddress || business.address) ? `<p>${esc(proposal.officeAddress || business.address)}</p>` : ''}
          ${[proposal.supportPhone || business.phone, proposal.inquiryEmail || business.email, proposal.websiteUrl].filter(Boolean).length > 0 ? `<p>${esc([proposal.supportPhone || business.phone, proposal.inquiryEmail || business.email, proposal.websiteUrl].filter(Boolean).join(' • '))}</p>` : ''}
          ${proposal.ntnTax ? `<div class="tax-badge">${esc(proposal.ntnTax)}</div>` : ''}
        </div>
        <div class="doc-meta">
          <div class="doc-title-badge">Proposal & Quotation</div>
          <div class="meta-row">Proposal #: <strong>${esc(proposalNo)}</strong></div>
          <div class="meta-row">Issue Date: <strong>${esc(proposalDate)}</strong></div>
          <div class="meta-row">Validity: <strong>${esc(validity)}</strong></div>
        </div>
      </div>

      <!-- Proposal Target Client -->
      <div class="proposal-target">
        <div class="target-box">
          <h4>Prepared For</h4>
          <p><strong>${esc(clientName)}</strong></p>
          ${clientCompany ? `<p>Organization: ${esc(clientCompany)}</p>` : ''}
          ${customer.phone ? `<p>Phone: ${esc(customer.phone)}</p>` : ''}
          ${customer.whatsapp ? `<p>WhatsApp: ${esc(customer.whatsapp)}</p>` : ''}
        </div>
        <div class="target-box">
          <h4>Proposal Subject</h4>
          <p><strong>${esc(proposal.title || 'Software Development & Billing Services')}</strong></p>
          <p>Currency: <strong>${esc(cur)}</strong></p>
          <p>Commercial Reference: <strong>${esc(proposalNo)}</strong></p>
        </div>
      </div>

      <!-- Executive Summary / Scope (Optional) -->
      ${proposal.summary ? `
        <div class="section-title">1. Project Overview & Scope of Work</div>
        <div class="overview-text">${esc(proposal.summary)}</div>
      ` : ''}

      <!-- Commercial Deliverables Table -->
      <div class="section-title">${proposal.summary ? '2.' : '1.'} Commercial Proposal &amp; Deliverables</div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Deliverable / Service</th>
            <th style="width: 55px; text-align: center;">Qty</th>
            <th style="width: 110px; text-align: right;">Unit Price</th>
            <th style="width: 90px; text-align: right;">Discount</th>
            <th style="width: 65px; text-align: center;">Tax</th>
            <th style="width: 125px; text-align: right;">Total (${esc(cur)})</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => {
            const gross = Number(item.qty || 1) * Number(item.price || 0);
            const disc = Number(item.discount || 0);
            const taxP = Number(item.taxPct || 0);
            const taxBase = Math.max(0, gross - disc);
            const lineTax = (taxBase * taxP) / 100;
            const lineTot = taxBase + lineTax;
            return `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td>
                <strong>${esc(item.name || 'Deliverable Item')}</strong>
                ${item.desc ? `<div class="item-desc">${esc(item.desc)}</div>` : ''}
              </td>
              <td style="text-align: center;">${item.qty || 1}</td>
              <td style="text-align: right;">${money(item.price || 0, cur)}</td>
              <td style="text-align: right; color: ${disc > 0 ? '#dc2626' : '#64748b'};">${disc > 0 ? `- ${money(disc, cur)}` : '—'}</td>
              <td style="text-align: center; color: ${taxP > 0 ? '#0369a1' : '#64748b'};">${taxP > 0 ? `${taxP}%` : '—'}</td>
              <td style="text-align: right; font-weight: 750;">${money(lineTot, cur)}</td>
            </tr>
          `;}).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align: right; font-weight: 750; font-size: 11px; background: #f8fafc; color: #475569;">Subtotal:</td>
            <td style="text-align: right; font-weight: 750; font-size: 11.5px; background: #f8fafc;">${money(subtotal, cur)}</td>
          </tr>
          ${totalDiscount > 0 ? `
            <tr>
              <td colspan="6" style="text-align: right; font-size: 11px; color: #dc2626; background: #f8fafc;">Total Discount:</td>
              <td style="text-align: right; font-weight: 700; font-size: 11px; color: #dc2626; background: #f8fafc;">- ${money(totalDiscount, cur)}</td>
            </tr>
          ` : ''}
          ${totalTaxAmount > 0 ? `
            <tr>
              <td colspan="6" style="text-align: right; font-size: 11px; color: #0369a1; background: #f8fafc;">Total Tax:</td>
              <td style="text-align: right; font-weight: 700; font-size: 11px; color: #0369a1; background: #f8fafc;">+ ${money(totalTaxAmount, cur)}</td>
            </tr>
          ` : ''}
          <tr style="border-top: 2px solid #0b4b8f;">
            <td colspan="6" style="text-align: right; font-weight: 800; font-size: 12px; color: #0b4b8f; background: #edf4fe; text-transform: uppercase;">Total Investment:</td>
            <td style="text-align: right; font-weight: 800; font-size: 12.5px; color: #0b4b8f; background: #edf4fe;">${money(grandTotal, cur)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- 3. Payment Milestones Table (Above Terms) -->
      ${proposal.milestones && proposal.milestones.length > 0 ? `
        <div class="section-title">${proposal.summary ? '3.' : '2.'} Payment Milestones & Billing Schedule</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th>Milestone / Deliverable</th>
              <th style="width: 65px; text-align: center;">%</th>
              <th style="width: 150px; text-align: right;">Amount (${esc(cur)})</th>
              <th style="width: 200px;">Due Condition</th>
            </tr>
          </thead>
          <tbody>
            ${proposal.milestones.map((ms, idx) => {
              const msAmt = grandTotal > 0 ? (Number(ms.pct || 0) / 100) * grandTotal : 0;
              return `
                <tr>
                  <td style="text-align: center; color: #64748b;">${idx + 1}</td>
                  <td><strong>${esc(ms.name || `Milestone ${idx + 1}`)}</strong></td>
                  <td style="text-align: center; font-weight: 700; color: #0b4b8f;">${ms.pct || 0}%</td>
                  <td style="text-align: right; font-weight: 800; color: #065f46;">${money(msAmt, cur)}</td>
                  <td style="font-size: 10.5px; color: #475569;">${esc(ms.dueCondition || '—')}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      ` : ''}

      <!-- 4. Payment Terms & Conditions (Below Milestones) -->
      ${proposal.terms ? `
        <div class="section-title">${(proposal.summary ? 2 : 1) + (proposal.milestones && proposal.milestones.length > 0 ? 2 : 1)}. Payment Terms & Conditions</div>
        <div class="terms-box">${esc(proposal.terms)}</div>
      ` : ''}
    </div>

    <!-- Signatures -->
    <div style="page-break-inside: avoid; break-inside: avoid; margin-top: 36px;">
      <div class="sigs">
        <div class="sig">
          <div>Client Signature</div>
          ${clientName ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">${esc(clientName)}</div>` : ''}
        </div>
        <div class="sig">
          <div>${esc(proposal.signatoryName || 'Authorized Signature')}</div>
          ${proposal.signatoryTitle ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">${esc(proposal.signatoryTitle)}</div>` : ''}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

import { downloadAsPdf } from './whatsappPdf.js';

export async function downloadProposalFile(proposal = {}, business = {}, customer = {}) {
  const doc = generateProposalHtml(proposal, business, customer);
  const cleanTitle = (proposal.title || 'Proposal').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${proposal.proposalNo || 'Proposal'}_${cleanTitle}.pdf`;
  await downloadAsPdf(doc, filename);
}

