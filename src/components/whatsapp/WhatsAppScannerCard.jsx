import React, { useState, useEffect, useRef, useCallback } from 'react';
import { whatsappApi } from '../../services/api';
import { cleanPhoneInput } from '../../utils/formatters';

export default function WhatsAppScannerCard({ isStandalone = false, compact = false }) {
  const [status, setStatus] = useState('SCAN_QR'); // 'DISCONNECTED' | 'CONNECTING' | 'SCAN_QR' | 'CONNECTED'
  const [qrCode, setQrCode] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMsgSent, setTestMsgSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pollTimerRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await whatsappApi.getStatus();
      if (res) {
        setStatus(res.status);
        if (res.qrCode) setQrCode(res.qrCode);
        if (res.user) setUser(res.user);
        setErrorMsg('');
      }
    } catch (err) {
      console.warn('WhatsApp status poll error:', err.message);
    }
  }, []);

  const handleConnect = async (force = false) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await whatsappApi.connect(force);
      if (res) {
        setStatus(res.status);
        if (res.qrCode) setQrCode(res.qrCode);
        if (res.user) setUser(res.user);
      }
    } catch (err) {
      console.warn('Failed to connect WhatsApp:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    setLoading(true);
    try {
      await whatsappApi.logout();
      setStatus('SCAN_QR');
      setQrCode(null);
      setUser(null);
    } catch (err) {
      alert('Logout error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openNewTabScanner = () => {
    window.open('/?page=whatsapp-scan', '_blank');
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone) return;
    setLoading(true);
    setTestMsgSent(false);
    try {
      await whatsappApi.sendText(
        testPhone,
        `✅ *Test Message from Invoice Manager*\n\nWhatsApp API connection is working perfectly!`
      );
      setTestMsgSent(true);
      setTimeout(() => setTestMsgSent(false), 4000);
    } catch (err) {
      alert('Error sending test message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleConnect(false);
    fetchStatus();

    pollTimerRef.current = setInterval(() => {
      fetchStatus();
    }, 1200);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchStatus]);

  const isConnected = status === 'CONNECTED';

  return (
    <div className={`wa-scanner-card ${isStandalone ? 'standalone' : ''} ${compact ? 'compact' : ''}`}>
      {/* Top Header */}
      <div className="wa-card-header">
        <div className="wa-title-group">
          <div className="wa-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <div>
            <h3>WhatsApp Automatic Delivery</h3>
            <p className="wa-subtitle">Bilkut Free — apna WhatsApp connect karo, challans auto jayenge</p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <span className="wa-status-badge connected">
              <span className="dot"></span> Connected {user?.phone ? `(${user.phone})` : ''}
            </span>
          ) : (
            <span className="wa-status-badge scan" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
              <span className="dot" style={{ background: '#f59e0b' }}></span> Scan QR Code
            </span>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="wa-card-body">
        {isConnected ? (
          <div className="wa-connected-box">
            <div className="wa-check-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h4>WhatsApp is Connected!</h4>
            <p>Phone: <strong>{user?.phone || 'Linked'}</strong></p>
            <p className="wa-connected-sub">Invoices generate hote hi direct customer ke WhatsApp par chali jayengi.</p>

            <form onSubmit={handleSendTestMessage} className="wa-test-form">
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                className="input phone11"
                placeholder="03001234567"
                value={testPhone}
                onChange={(e) => setTestPhone(cleanPhoneInput(e.target.value))}
                style={{ maxWidth: '180px', height: '36px', fontSize: '13px' }}
              />
              <button type="submit" className="btn btn-outline" style={{ height: '36px', fontSize: '13px' }} disabled={loading || !testPhone}>
                {loading ? '...' : 'Send Test'}
              </button>
            </form>
            {testMsgSent && <div className="wa-success-alert">✅ Test message sent!</div>}
          </div>
        ) : (
          <div className="wa-qr-container">
            <div className="wa-qr-frame">
              {qrCode ? (
                <img src={qrCode} alt="WhatsApp QR Code" className="wa-qr-img" />
              ) : (
                <div className="wa-qr-placeholder">
                  <div className="spinner" style={{ width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#10b981' }}></div>
                  <p style={{ fontSize: '13px', marginTop: '10px', color: '#64748b', fontWeight: '500' }}>
                    Generating QR Code...
                  </p>
                </div>
              )}
            </div>

            <div className="wa-instructions">
              <div className="wa-step-highlight">
                <strong>WhatsApp Kholein</strong> → <strong>3 Dots</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong>
              </div>
              <div className="wa-step-sub">
                QR scan karne ke baad automatic ho jayega — kuch seconds lagenge
              </div>
            </div>
          </div>
        )}

        {errorMsg && <div className="wa-error-alert">{errorMsg}</div>}
      </div>

      {/* Action Buttons Row */}
      <div className="wa-card-actions">
        {!isStandalone && (
          <>
            <button
              type="button"
              className="wa-btn-primary"
              onClick={openNewTabScanner}
              title="Connect WhatsApp in new tab"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>Connect WhatsApp (Open New Tab) ↗</span>
            </button>
            <button
              type="button"
              className="wa-btn-outline-green"
              onClick={openNewTabScanner}
              title="Open scanner in new tab"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>Open Scanner in New Tab ↗</span>
            </button>
          </>
        )}

        <button
          type="button"
          className="wa-btn-refresh"
          onClick={() => handleConnect(true)}
          disabled={loading}
          title="Refresh QR Code"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Refresh</span>
        </button>

        {isConnected && (
          <button
            type="button"
            className="wa-btn-logout"
            onClick={handleLogout}
            disabled={loading}
          >
            <span>Disconnect</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="wa-card-footer">
        <span>Click karne se naya tab khulega jahan se mobile WhatsApp se QR code scan kar sakte hain.</span>
      </div>
    </div>
  );
}
