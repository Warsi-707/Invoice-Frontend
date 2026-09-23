import React, { useState } from 'react';
import WhatsAppScannerCard from '../components/whatsapp/WhatsAppScannerCard';
import Button from '../components/common/Button';
import { whatsappApi } from '../services/api';
import { cleanPhoneInput } from '../utils/formatters';
import { useApp } from '../context/AppContext';

export default function WhatsAppPage() {
  const { showToast } = useApp();
  const [recipientText, setRecipientText] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(null);

  const getRecipients = () => [...new Set(
    recipientText
      .split(/[\s,;]+/)
      .map((phone) => cleanPhoneInput(phone))
      .filter((phone) => phone.length >= 10)
  )];

  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  const handleBulkSend = async (event) => {
    event.preventDefault();
    const recipients = getRecipients();
    const message = bulkMessage.trim();

    if (!recipients.length) {
      alert('Please enter at least one valid phone number.');
      return;
    }
    if (!message) {
      alert('Please enter a message.');
      return;
    }

    setIsSending(true);
    setProgress({ sent: 0, total: recipients.length, failed: 0 });
    let failed = 0;

    for (let index = 0; index < recipients.length; index += 1) {
      try {
        await whatsappApi.sendText(recipients[index], message);
      } catch (error) {
        failed += 1;
        console.error(`WhatsApp bulk send failed for ${recipients[index]}:`, error);
      }

      setProgress({ sent: index + 1, total: recipients.length, failed });
      if (index < recipients.length - 1) await wait(1200);
    }

    setIsSending(false);
    showToast(`Bulk WhatsApp complete: ${recipients.length - failed} sent, ${failed} failed.`);
  };

  return (
    <section id="whatsapp" className="page active">
      <div className="wa-page-layout">
        <div className="wa-main-col">
          <WhatsAppScannerCard isStandalone={false} />

          <div className="settings-card" style={{ marginTop: '16px' }}>
            <h4>📣 Bulk WhatsApp Message</h4>
            <p style={{ margin: '-6px 0 12px', color: '#64748b', fontSize: '11px' }}>
              Send one message to multiple numbers from your scanned WhatsApp account.
            </p>
            <form onSubmit={handleBulkSend}>
              <label>Recipient numbers</label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="03001234567, 03111234567 or one number per line"
                value={recipientText}
                onChange={(event) => setRecipientText(event.target.value)}
                disabled={isSending}
              />
              <label style={{ marginTop: '10px' }}>Message</label>
              <textarea
                className="textarea"
                rows={5}
                placeholder="Write the message you want to send..."
                value={bulkMessage}
                onChange={(event) => setBulkMessage(event.target.value)}
                disabled={isSending}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <Button variant="primary" type="submit" disabled={isSending}>
                  {isSending ? 'Sending...' : 'Send to All Numbers'}
                </Button>
                {progress && (
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {progress.sent}/{progress.total} processed{progress.failed ? ` • ${progress.failed} failed` : ''}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="wa-side-col">
          <div className="settings-card">
            <h4>⚡ WhatsApp Automation Features</h4>
            <ul className="wa-features-list">
              <li>
                <span className="wa-feat-icon">🧾</span>
                <div>
                  <strong>Instant Bill & Challan Delivery</strong>
                  <p>Invoices are automatically formatted with emojis, items table, balance due & contact info.</p>
                </div>
              </li>
              <li>
                <span className="wa-feat-icon">🆓</span>
                <div>
                  <strong>100% Free WhatsApp Web API</strong>
                  <p>Direct device pairing using Baileys socket without third-party monthly subscriptions.</p>
                </div>
              </li>
              <li>
                <span className="wa-feat-icon">💾</span>
                <div>
                  <strong>Session Persistence</strong>
                  <p>Once paired, the device remains linked even after restarting the server or browser.</p>
                </div>
              </li>
              <li>
                <span className="wa-feat-icon">💬</span>
                <div>
                  <strong>1-Click Send Everywhere</strong>
                  <p>Send bills directly from Invoice Generator Preview or the Invoice Collections table.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="settings-card" style={{ marginTop: '16px' }}>
            <h4>📱 Quick Linking Instructions</h4>
            <ol className="wa-instructions-list">
              <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
              <li>Tap <strong>Menu (3 dots)</strong> or <strong>Settings</strong>.</li>
              <li>Select <strong>Linked Devices</strong> → Tap <strong>Link a Device</strong>.</li>
              <li>Point your phone camera at the QR code on the left to scan.</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
