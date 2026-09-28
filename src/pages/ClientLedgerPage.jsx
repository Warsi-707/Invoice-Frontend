import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/common/StatusBadge';
import { money, today } from '../utils/formatters';
import {
  calculateClientLedger,
  generateLedgerStatementHtml,
  exportLedgerToExcel,
  printLedgerStatement
} from '../utils/ledgerExport';
import { downloadAsPdf } from '../utils/whatsappPdf';
import { downloadInvoiceFile } from '../utils/invoice';

export default function ClientLedgerPage() {
  const {
    state,
    showToast,
    getBusiness,
    getBusinessName,
    formatMoney
  } = useApp();

  // Selected customer for single ledger view (null = simple members list)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Search in member list
  const [searchTerm, setSearchTerm] = useState('');

  // Ledger Detail Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('all'); // 'all', 'this-month', 'last-month', 'this-year', 'custom'
  const [transactionType, setTransactionType] = useState('all'); // 'all', 'invoices', 'payments'
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // Handle date preset change
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'this-month') {
      const start = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
      const end = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'last-month') {
      const start = new Date(currentYear, currentMonth - 1, 1).toISOString().slice(0, 10);
      const end = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
    } else if (preset === 'this-year') {
      const start = new Date(currentYear, 0, 1).toISOString().slice(0, 10);
      const end = new Date(currentYear, 11, 31).toISOString().slice(0, 10);
      setFromDate(start);
      setToDate(end);
    }
  };

  const customersList = Array.isArray(state?.customers) ? state.customers : [];
  const invoicesList = Array.isArray(state?.invoices) ? state.invoices : [];

  // Filtered members list
  const filteredMembers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return customersList.filter((c) => {
      if (!q) return true;
      const b = getBusiness(c?.businessId);
      return (
        (c?.name && c.name.toLowerCase().includes(q)) ||
        (c?.phone && c.phone.toLowerCase().includes(q)) ||
        (c?.whatsapp && c.whatsapp.toLowerCase().includes(q)) ||
        (b?.name && b.name.toLowerCase().includes(q)) ||
        (c?.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [customersList, searchTerm, getBusiness]);

  // Selected customer data for detail view
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customersList.find((c) => String(c?.id) === String(selectedCustomerId)) || null;
  }, [selectedCustomerId, customersList]);

  const selectedBusiness = useMemo(() => {
    if (!selectedCustomer) return null;
    return getBusiness(selectedCustomer?.businessId);
  }, [selectedCustomer, getBusiness]);

  const currentLedger = useMemo(() => {
    if (!selectedCustomer) return null;
    return calculateClientLedger(selectedCustomer, selectedBusiness, invoicesList, {
      fromDate,
      toDate,
      transactionType,
      searchQuery: ledgerSearchQuery
    });
  }, [selectedCustomer, selectedBusiness, invoicesList, fromDate, toDate, transactionType, ledgerSearchQuery]);

  // Export handlers
  const handlePrint = () => {
    if (!selectedCustomer) return;
    showToast('⚡ Preparing printable statement...');
    const html = generateLedgerStatementHtml(selectedCustomer, selectedBusiness, invoicesList, {
      fromDate,
      toDate,
      transactionType
    });
    printLedgerStatement(html);
  };

  const handleDownloadPdf = async () => {
    if (!selectedCustomer) return;
    try {
      showToast('⚡ Generating Statement PDF...');
      const html = generateLedgerStatementHtml(selectedCustomer, selectedBusiness, invoicesList, {
        fromDate,
        toDate,
        transactionType
      });
      const cleanName = (selectedCustomer?.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Statement_${cleanName}_${today()}.pdf`;

      await downloadAsPdf(html, fileName);
      showToast(`✅ Statement PDF downloaded for ${selectedCustomer?.name}!`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  const handleExportExcel = () => {
    if (!selectedCustomer) return;
    try {
      exportLedgerToExcel(selectedCustomer, selectedBusiness, invoicesList, {
        fromDate,
        toDate,
        transactionType
      });
      showToast(`✅ Excel Statement exported for ${selectedCustomer?.name}!`);
    } catch (err) {
      alert('Excel export error: ' + err.message);
    }
  };

  const handleSendWhatsAppStatement = async () => {
    if (!selectedCustomer) return;
    const phone = selectedCustomer?.whatsapp || selectedCustomer?.phone;
    if (!phone) {
      alert('Customer has no WhatsApp/phone number saved.');
      return;
    }

    try {
      showToast('⚡ Opening WhatsApp with Statement...');
      const orgBrand = state?.settings?.proposalData?.companyName || state?.settings?.companyName || 'iSysware';
      const ledger = calculateClientLedger(selectedCustomer, selectedBusiness, invoicesList);

      const statusNote =
        ledger.outstandingBalance > 0
          ? `⚠️ Net Outstanding: ${formatMoney(ledger.outstandingBalance, selectedBusiness?.id)}`
          : ledger.advanceCredit > 0
          ? `💎 Advance Credit: ${formatMoney(ledger.advanceCredit, selectedBusiness?.id)}`
          : '✅ Account Up to Date (Settled)';

      const textMessage = `📊 *Account Statement: ${selectedCustomer?.name}*\n🏢 ${orgBrand}\n📌 ${statusNote}\n💰 Total Invoiced: ${formatMoney(ledger.totalInvoiced, selectedBusiness?.id)}\n💵 Total Paid: ${formatMoney(ledger.totalPaid, selectedBusiness?.id)}\n📅 Date: ${today()}`;

      const cleanPhone = String(phone).replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`;
      window.open(waUrl, '_blank');
      showToast(`✅ WhatsApp message prepared!`);
    } catch (err) {
      alert('WhatsApp error: ' + err.message);
    }
  };

  return (
    <section id="client-ledger" className="page active">
      {/* VIEW 1: SIMPLE CLEAN MEMBERS LIST */}
      {!selectedCustomerId && (
        <div className="panel">
          <div className="panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="8" y1="7" x2="16" y2="7" />
                <line x1="8" y1="11" x2="16" y2="11" />
              </svg>
              <span>Client Ledger</span>
            </div>
            <span style={{ fontSize: '11.5px', opacity: 0.9 }}>
              Select a member to open their complete financial ledger
            </span>
          </div>

          <div className="panel-body">
            {/* Simple Search Input */}
            <div className="toolbar" style={{ marginBottom: '14px' }}>
              <div className="grow">
                <label>Search Member / Client Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="ledgerSearch"
                    className="input"
                    placeholder="Type member name, phone or business to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="off"
                    style={{ fontSize: '13px', padding: '8px 12px' }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Simple Clean Members Table */}
            <div className="table-wrap" style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                    <th>Member / Client Name</th>
                    <th>Phone / WhatsApp</th>
                    <th>Business</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((c, idx) => {
                      const b = getBusiness(c?.businessId);

                      return (
                        <tr
                          key={c?.id}
                          style={{
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onClick={() => setSelectedCustomerId(c?.id)}
                          className="ledger-row-hover"
                        >
                          <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          <td>
                            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                              {c?.name}
                            </span>
                          </td>

                          <td style={{ color: '#334155', fontWeight: 550 }}>
                            {c?.phone || c?.whatsapp || '-'}
                          </td>

                          <td style={{ color: '#64748b' }}>
                            {b?.name || '-'}
                          </td>

                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn sm"
                              style={{
                                background: '#0b4b8f',
                                color: '#fff',
                                borderColor: '#0b4b8f',
                                padding: '5px 12px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                              onClick={() => setSelectedCustomerId(c?.id)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                              </svg>
                              <span>Open Ledger</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty">
                        No members found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SINGLE CLIENT COMPLETE DETAILED LEDGER */}
      {selectedCustomerId && selectedCustomer && currentLedger && (
        <>
          {/* Header Navigation Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <button
              type="button"
              className="btn light"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '12.5px',
                padding: '7px 14px'
              }}
              onClick={() => setSelectedCustomerId(null)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>← Back to Members List</span>
            </button>

            {/* Quick Switch Member Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>Switch Member:</label>
              <select
                className="select"
                style={{ width: '220px', padding: '5px 10px', fontSize: '12px' }}
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                {customersList.map((cust) => (
                  <option key={cust?.id} value={cust?.id}>
                    {cust?.name} ({getBusinessName(cust?.businessId)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Member Profile Banner */}
          <div className="panel" style={{ marginBottom: '14px' }}>
            <div
              className="panel-head"
              style={{
                background: '#0b4b8f',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: 800 }}>
                  {selectedCustomer?.name}
                </h2>
                <div style={{ fontSize: '11.5px', color: '#bfdbfe', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>🏢 {selectedBusiness?.name || 'Business'}</span>
                  {selectedCustomer?.phone && <span>📞 {selectedCustomer.phone}</span>}
                  {selectedCustomer?.whatsapp && <span>💬 {selectedCustomer.whatsapp}</span>}
                  {selectedCustomer?.address && <span>📍 {selectedCustomer.address}</span>}
                </div>
              </div>

              {/* Action Buttons Group */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn light"
                  style={{
                    background: '#fff',
                    color: '#0b4b8f',
                    borderColor: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={handlePrint}
                >
                  <span>🖨️</span>
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  className="btn light"
                  style={{
                    background: '#fff',
                    color: '#0b4b8f',
                    borderColor: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={handleDownloadPdf}
                >
                  <span>📄</span>
                  <span>PDF Statement</span>
                </button>

                <button
                  type="button"
                  className="btn light"
                  style={{
                    background: '#fff',
                    color: '#0b4b8f',
                    borderColor: '#fff',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={handleExportExcel}
                >
                  <span>📊</span>
                  <span>Excel / CSV</span>
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    borderColor: '#10b981',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={handleSendWhatsAppStatement}
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar for Transactions */}
            <div className="panel-body" style={{ background: '#f8fafc', borderBottom: '1px solid var(--line)' }}>
              <div className="toolbar" style={{ marginBottom: 0, gap: '10px' }}>
                <div style={{ minWidth: '150px' }}>
                  <label>Period Preset</label>
                  <select
                    className="select"
                    value={datePreset}
                    onChange={(e) => handleDatePresetChange(e.target.value)}
                  >
                    <option value="all">All Time History</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                  </select>
                </div>

                <div className="sm">
                  <label>From Date</label>
                  <input
                    type="date"
                    className="input"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDatePreset('custom');
                    }}
                  />
                </div>

                <div className="sm">
                  <label>To Date</label>
                  <input
                    type="date"
                    className="input"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDatePreset('custom');
                    }}
                  />
                </div>

                <div className="sm">
                  <label>Transaction Type</label>
                  <select
                    className="select"
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                  >
                    <option value="all">All Transactions</option>
                    <option value="invoices">Invoices Only (Debits)</option>
                    <option value="payments">Payments Only (Credits)</option>
                  </select>
                </div>

                <div className="grow">
                  <label>Search in Ledger</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search ref #, description, particulars..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Member Financial Summary Cards */}
          <div className="cards" style={{ marginBottom: '18px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="stat" style={{ borderLeft: '4px solid #1d4ed8' }}>
              <div className="label">Total Invoiced</div>
              <div className="value" style={{ color: '#1d4ed8' }}>
                {formatMoney(currentLedger.totalInvoiced, selectedCustomer?.businessId)}
              </div>
              <div className="hint">All Billed Invoices</div>
            </div>

            <div className="stat" style={{ borderLeft: '4px solid #16a34a' }}>
              <div className="label">Total Paid / Received</div>
              <div className="value" style={{ color: '#16a34a' }}>
                {formatMoney(currentLedger.totalPaid, selectedCustomer?.businessId)}
              </div>
              <div className="hint">All Payments Received</div>
            </div>

            <div
              className="stat"
              style={{
                borderLeft: `4px solid ${currentLedger.outstandingBalance > 0 ? '#dc2626' : '#16a34a'}`
              }}
            >
              <div className="label">Outstanding Balance</div>
              <div
                className="value"
                style={{
                  color: currentLedger.outstandingBalance > 0 ? '#dc2626' : '#16a34a'
                }}
              >
                {formatMoney(currentLedger.outstandingBalance, selectedCustomer?.businessId)}
              </div>
              <div className="hint">
                {currentLedger.outstandingBalance > 0 ? 'Remaining Amount Due' : 'Account Settled'}
              </div>
            </div>

            <div className="stat" style={{ borderLeft: '4px solid #7e22ce' }}>
              <div className="label">Advance / Credit</div>
              <div className="value" style={{ color: '#7e22ce' }}>
                {formatMoney(currentLedger.advanceCredit, selectedCustomer?.businessId)}
              </div>
              <div className="hint">Excess / Prepaid Balance</div>
            </div>

            <div className="stat" style={{ borderLeft: '4px solid #0b4b8f' }}>
              <div className="label">Invoices / Records</div>
              <div className="value" style={{ color: '#0b4b8f' }}>
                {currentLedger.invoicesCount || 0} Invoices
              </div>
              <div className="hint">{currentLedger.totalTransactionsCount || 0} Total Transactions</div>
            </div>
          </div>

          {/* Running Transactions Ledger Table */}
          <div className="table-wrap" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '150px' }}>Voucher / Ref #</th>
                  <th style={{ width: '150px' }}>Transaction Type</th>
                  <th>Description / Particulars</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Debit (+)</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Credit (-)</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Running Balance</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Status</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row if fromDate is filtered */}
                {fromDate && (
                  <tr style={{ background: '#fef9c3', fontWeight: 700, color: '#854d0e' }}>
                    <td>{fromDate}</td>
                    <td><strong>B/F</strong></td>
                    <td>
                      <span style={{ background: '#fef08a', padding: '2px 7px', borderRadius: '4px', fontSize: '11px' }}>
                        Opening Balance
                      </span>
                    </td>
                    <td>Balance brought forward prior to {fromDate}</td>
                    <td style={{ textAlign: 'right' }}>
                      {currentLedger.openingBalance > 0
                        ? formatMoney(currentLedger.openingBalance, selectedCustomer?.businessId)
                        : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {currentLedger.openingBalance < 0
                        ? formatMoney(Math.abs(currentLedger.openingBalance), selectedCustomer?.businessId)
                        : '-'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 850,
                        color: currentLedger.openingBalance > 0 ? '#b91c1c' : '#16a34a'
                      }}
                    >
                      {formatMoney(currentLedger.openingBalance, selectedCustomer?.businessId)}
                    </td>
                    <td style={{ textAlign: 'center' }}>-</td>
                    <td style={{ textAlign: 'center' }}>-</td>
                  </tr>
                )}

                {currentLedger.ledgerRows && currentLedger.ledgerRows.length > 0 ? (
                  currentLedger.ledgerRows.map((r) => {
                    const isPay = r.type === 'payment';
                    const isPos = r.runningBalance > 0;
                    const isNeg = r.runningBalance < 0;

                    return (
                      <tr
                        key={r.id}
                        style={{
                          background: isPay ? '#f0fdf4' : '#ffffff'
                        }}
                      >
                        <td>
                          <span style={{ fontWeight: 650, color: '#334155', whiteSpace: 'nowrap' }}>
                            {r.date}
                          </span>
                        </td>

                        <td>
                          <strong style={{ color: '#0b4b8f' }}>{r.ref}</strong>
                        </td>

                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isPay ? '#dcfce7' : '#dbeafe',
                              color: isPay ? '#166534' : '#1e40af'
                            }}
                          >
                            {isPay ? '💵' : '📄'} {r.typeLabel}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.description}</div>
                          {r.monthYear !== '-' && (
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              Period: {r.monthYear} {r.method !== '-' ? `• Method: ${r.method}` : ''}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: r.debit > 0 ? 750 : 'normal',
                            color: r.debit > 0 ? '#1e293b' : '#94a3b8'
                          }}
                        >
                          {r.debit > 0 ? formatMoney(r.debit, selectedCustomer?.businessId) : '-'}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: r.credit > 0 ? 800 : 'normal',
                            color: r.credit > 0 ? '#16a34a' : '#94a3b8'
                          }}
                        >
                          {r.credit > 0 ? formatMoney(r.credit, selectedCustomer?.businessId) : '-'}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            fontSize: '13px',
                            color: isPos ? '#dc2626' : isNeg ? '#7e22ce' : '#16a34a'
                          }}
                        >
                          {formatMoney(r.runningBalance, selectedCustomer?.businessId)}
                        </td>

                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={r.status} variant="solid" />
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {r.rawInvoice && (
                            <button
                              type="button"
                              className="btn xs light"
                              style={{ padding: '2px 6px', fontSize: '11px' }}
                              title="Download Invoice PDF"
                              onClick={() => downloadInvoiceFile(r.rawInvoice, selectedBusiness, selectedCustomer)}
                            >
                              <span>📄</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="empty">
                      No ledger transactions found matching the selected period and filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td colSpan="4" style={{ textAlign: 'right', fontSize: '13px' }}>
                    Period Totals & Net Balance:
                  </td>
                  <td style={{ textAlign: 'right', color: '#1d4ed8', fontSize: '13px' }}>
                    {formatMoney(currentLedger.totalInvoiced, selectedCustomer?.businessId)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontSize: '13px' }}>
                    {formatMoney(currentLedger.totalPaid, selectedCustomer?.businessId)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontSize: '13.5px',
                      color: currentLedger.closingBalance > 0 ? '#dc2626' : '#16a34a'
                    }}
                  >
                    {formatMoney(currentLedger.closingBalance, selectedCustomer?.businessId)}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
