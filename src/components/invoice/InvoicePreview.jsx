import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import { money } from '../../utils/formatters';
import { generateInvoiceHtml, getPreviousInvoiceMonth } from '../../utils/invoice';
import { sendPdfToWhatsApp, downloadAsPdf, downloadAndSendWhatsApp } from '../../utils/whatsappPdf';
import { useApp } from '../../context/AppContext';

export default function InvoicePreview({
  isOpen,
  onClose,
  invoice,
  business = {},
  customer = {}
}) {
  const { showToast } = useApp();
  const [isSendingWa, setIsSendingWa] = useState(false);

  if (!invoice) return null;

  const cur = business.currency || 'PKR';
  const items = invoice.items || [];
  const prevDuesVal = Number(invoice.previousDues || (Number(invoice.total || 0) > Number(invoice.subtotal || 0) ? Number(invoice.total) - Number(invoice.subtotal) : 0));
  const prevMonthLabel = invoice.previousDuesMonths || getPreviousInvoiceMonth(invoice.month, invoice.year);

  const handleDownload = async () => {
    showToast('⚡ Processing PDF...');
    const html = generateInvoiceHtml(invoice, business, customer);
    const fileName = `${invoice.invoiceNo || 'invoice'}.pdf`;
    const phone = customer.whatsapp || customer.phone;
    const caption = `📄 *Invoice ${invoice.invoiceNo}*\n🏢 ${business.name || ''}\n👤 ${customer.name || 'Client'}\n💰 Total: ${money(invoice.total, business.currency || 'PKR')}`;

    await downloadAndSendWhatsApp({
      htmlContent: html,
      fileName,
      phone,
      caption,
      onWhatsAppSuccess: () => showToast(`✅ Invoice PDF sent to ${customer.name || 'Client'} via WhatsApp!`)
    });
    showToast('✅ Invoice PDF downloaded!');
  };

  const handleSendWhatsApp = async () => {
    setIsSendingWa(true);
    try {
      const phone = customer.whatsapp || customer.phone;
      if (!phone) { alert('No WhatsApp/phone number for this client.'); return; }
      showToast('⏳ Sending PDF to WhatsApp...');
      const html = generateInvoiceHtml(invoice, business, customer);
      const fileName = `${invoice.invoiceNo || 'Invoice'}_${customer.name || 'Client'}.pdf`;
      const caption = `📄 *Invoice ${invoice.invoiceNo}*\n🏢 ${business.name || ''}\n👤 ${customer.name || 'Client'}\n💰 Total: ${money(invoice.total, business.currency || 'PKR')}`;
      await sendPdfToWhatsApp({ phone, htmlContent: html, fileName, caption });
      showToast(`✅ Invoice PDF sent to ${customer.name || 'Client'} via WhatsApp!`);
    } catch (err) {
      alert('WhatsApp error: ' + (err.message || 'Please link WhatsApp in Settings first.'));
    } finally {
      setIsSendingWa(false);
    }
  };

  const headerExtra = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Button
        variant="green"
        size="xs"
        onClick={handleSendWhatsApp}
        disabled={isSendingWa}
        style={{ background: '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <span>💬</span>
        <span>{isSendingWa ? 'Sending...' : 'Send WhatsApp'}</span>
      </Button>
      <Button variant="light" size="xs" onClick={handleDownload}>
        ⬇ Download PDF
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Preview"
      headerExtra={headerExtra}
      maxWidth="750px"
      id="invoiceModalRoot"
    >
      <div className="invoice">
        <div className="inv-head">
          <div className="inv-brand">
            <div className="inv-logo">
              {business.logo ? <img src={business.logo} alt="Logo" /> : 'LOGO'}
            </div>
            <div>
              <h2>{business.name || 'Your Business'}</h2>
              <p>{business.address || ''}</p>
              <p>{[business.phone, business.email].filter(Boolean).join(' • ')}</p>
              {business.tax && <p>{business.tax}</p>}
            </div>
          </div>
          <div className="inv-meta">
            <h1>INVOICE</h1>
            <div>
              <strong>{invoice.invoiceNo}</strong>
            </div>
            <div>
              Month: {invoice.month} {invoice.year}
            </div>
            <div>Invoice Date: {invoice.date}</div>
            <div>Due Date: {invoice.due}</div>
          </div>
        </div>

        <div className="inv-info">
          <div>
            <h4>Bill To</h4>
            <p>
              <strong>{customer.name || 'Client'}</strong>
            </p>
            {customer.phone && <p>Phone: {customer.phone}</p>}
            {customer.whatsapp && customer.whatsapp !== customer.phone && (
              <p>WhatsApp: {customer.whatsapp}</p>
            )}
            {business.address && <p>{business.address}</p>}
          </div>
          <div>
            <h4>Payment Status</h4>
            <p>
              Status: <strong>{invoice.status || 'Unpaid'}</strong>
            </p>
            <p>
              Paid: <strong>{money(invoice.paid, cur)}</strong>
            </p>
            <p>
              Balance: <strong>{money(invoice.balance, cur)}</strong>
            </p>
          </div>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x, idx) => (
              <tr key={x.itemId || idx}>
                <td>{x.name}</td>
                <td style={{ textAlign: 'center' }}>{x.qty}</td>
                <td style={{ textAlign: 'right' }}>{money(x.price, cur)}</td>
                <td style={{ textAlign: 'right' }}>{money(x.amount, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-total">
          <div>
            <span>Current Subtotal</span>
            <strong>{money(invoice.subtotal, cur)}</strong>
          </div>
          {prevDuesVal > 0 && (
            <div>
              <span style={{ color: '#d97706', fontWeight: '600' }}>
                Previous Balance / Arrears {prevMonthLabel ? `(${prevMonthLabel})` : ''}
              </span>
              <strong style={{ color: '#d97706' }}>+ {money(prevDuesVal, cur)}</strong>
            </div>
          )}
          {Boolean(invoice.additional) && (
            <div>
              <span>Additional</span>
              <strong>{money(invoice.additional, cur)}</strong>
            </div>
          )}
          {Boolean(invoice.discount) && (
            <div>
              <span>Discount</span>
              <strong>- {money(invoice.discount, cur)}</strong>
            </div>
          )}
          {Boolean(invoice.taxPct) && (
            <div>
              <span>Tax ({invoice.taxPct}%)</span>
              <strong>{money(invoice.taxAmount, cur)}</strong>
            </div>
          )}
          <div>
            <span>Grand Total</span>
            <strong>{money(invoice.total, cur)}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{money(invoice.paid, cur)}</strong>
          </div>
          <div className="grand">
            <span>Balance Due</span>
            <span>{money(invoice.balance, cur)}</span>
          </div>
        </div>

        {Boolean(invoice.notes) && (
          <div style={{ marginTop: '20px', fontSize: '11px', color: '#475569' }}>
            <strong>Notes:</strong>
            <br />
            {invoice.notes}
          </div>
        )}

        <div className="sigs">
          <div className="sig">Client Signature</div>
          <div className="sig">Authorized Signature</div>
        </div>
      </div>
    </Modal>
  );
}
