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

export default function ClientLedgerPage() {
  const {
    state,
    showToast,
    getBusiness,
    getBusinessName,
    formatMoney
  } = useApp();

  // Selected customer for single ledger view (null = members list)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Search in member list
  const [searchTerm, setSearchTerm] = useState('');

  // Ledger Detail Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [datePreset, setDatePreset] = useState('all');
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
      transactionType: 'all',
      searchQuery: ledgerSearchQuery
    });
  }, [selectedCustomer, selectedBusiness, invoicesList, fromDate, toDate, ledgerSearchQuery]);

  // Export handlers
  const handlePrint = () => {
    if (!selectedCustomer) return;
    showToast('Preparing statement for print...');
    const html = generateLedgerStatementHtml(selectedCustomer, selectedBusiness, invoicesList, {
      fromDate,
      toDate
    });
    printLedgerStatement(html);
  };

  const handleDownloadPdf = async () => {
    if (!selectedCustomer) return;
    try {
      showToast('Generating PDF statement...');
      const html = generateLedgerStatementHtml(selectedCustomer, selectedBusiness, invoicesList, {
        fromDate,
        toDate
      });
      const cleanName = (selectedCustomer?.name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Statement_${cleanName}_${today()}.pdf`;

      await downloadAsPdf(html, fileName);
      showToast(`Statement PDF downloaded for ${selectedCustomer?.name}`);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
    }
  };

  const handleExportExcel = () => {
    if (!selectedCustomer) return;
    try {
      exportLedgerToExcel(selectedCustomer, selectedBusiness, invoicesList, {
        fromDate,
        toDate
      });
      showToast(`Excel statement exported for ${selectedCustomer?.name}`);
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
      const orgBrand = state?.settings?.proposalData?.companyName || state?.settings?.companyName || 'iSysware';
      const ledger = calculateClientLedger(selectedCustomer, selectedBusiness, invoicesList);

      const statusNote =
        ledger.outstandingBalance > 0
          ? `Outstanding Balance: ${formatMoney(ledger.outstandingBalance, selectedBusiness?.id)}`
          : ledger.advanceCredit > 0
          ? `Advance Credit: ${formatMoney(ledger.advanceCredit, selectedBusiness?.id)}`
          : 'Account Up to Date (Settled)';

      const textMessage = `*Account Statement: ${selectedCustomer?.name}*\n${orgBrand}\nStatus: ${statusNote}\nTotal Invoiced: ${formatMoney(ledger.totalInvoiced, selectedBusiness?.id)}\nTotal Paid: ${formatMoney(ledger.totalPaid, selectedBusiness?.id)}\nStatement Date: ${today()}`;

      const cleanPhone = String(phone).replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMessage)}`;
      window.open(waUrl, '_blank');
      showToast(`WhatsApp message opened`);
    } catch (err) {
      alert('WhatsApp error: ' + err.message);
    }
  };

  return (
    <section id="client-ledger" className="page active">
      {/* -------------------------------------------------------------
          VIEW 1: CLEAN SIMPLE MEMBERS DIRECTORY
         ------------------------------------------------------------- */}
      {!selectedCustomerId && (
        <div className="panel">
          <div className="panel-head">
            <span>Client Ledger</span>
            <span>Select a member to view their account ledger</span>
          </div>

          <div className="panel-body">
            {/* Search Toolbar */}
            <div className="toolbar" style={{ marginBottom: '14px' }}>
              <div className="grow">
                <label>Search Member / Client Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="ledgerSearch"
                    className="input"
                    placeholder="Search by member name, phone or business..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="off"
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
                        color: '#64748b',
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
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                    <th>Member Name</th>
                    <th>Phone / WhatsApp</th>
                    <th>Business</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((c, idx) => {
                      const b = getBusiness(c?.businessId);

                      return (
                        <tr
                          key={c?.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedCustomerId(c?.id)}
                        >
                          <td style={{ textAlign: 'center' }}>
                            {idx + 1}
                          </td>

                          <td>
                            <strong>{c?.name}</strong>
                          </td>

                          <td>
                            {c?.phone || c?.whatsapp || '-'}
                          </td>

                          <td>
                            {b?.name || '-'}
                          </td>

                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn sm"
                              style={{
                                padding: '4px 12px',
                                fontSize: '11.5px',
                                fontWeight: 600
                              }}
                              onClick={() => setSelectedCustomerId(c?.id)}
                            >
                              Open Ledger →
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

      {/* -------------------------------------------------------------
          VIEW 2: MEMBER COMPLETE LEDGER (DASHBOARD-MATCHED STYLING)
         ------------------------------------------------------------- */}
      {selectedCustomerId && selectedCustomer && currentLedger && (
        <>
          {/* Top Panel: Header, Member Info & Export Actions */}
          <div className="panel" style={{ marginBottom: '14px' }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn sm light"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700
                  }}
                  onClick={() => setSelectedCustomerId(null)}
                >
                  ← Back to List
                </button>
                <span>
                  {selectedCustomer?.name}
                </span>
                <span style={{ fontSize: '11.5px', opacity: 0.85, fontWeight: 500 }}>
                  ({selectedBusiness?.name || 'Business'} {selectedCustomer?.phone ? `• ${selectedCustomer.phone}` : ''})
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn sm light"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    borderColor: '#ffffff',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 650
                  }}
                  onClick={handlePrint}
                >
                  Print
                </button>
                <button
                  type="button"
                  className="btn sm light"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    borderColor: '#ffffff',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 650
                  }}
                  onClick={handleDownloadPdf}
                >
                  PDF Statement
                </button>
                <button
                  type="button"
                  className="btn sm light"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    borderColor: '#ffffff',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 650
                  }}
                  onClick={handleExportExcel}
                >
                  Excel / CSV
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: '#18a05e',
                    color: '#ffffff',
                    borderColor: '#18a05e',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 650
                  }}
                  onClick={handleSendWhatsAppStatement}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="panel-body">
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <div style={{ width: '160px' }}>
                  <label>Period Preset</label>
                  <select
                    className="select"
                    value={datePreset}
                    onChange={(e) => handleDatePresetChange(e.target.value)}
                  >
                    <option value="all">All Time</option>
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

                <div className="grow">
                  <label>Search in Ledger</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search voucher, description or item..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Exact Dashboard-Matched Clean KPI Cards */}
          <div className="cards" style={{ marginBottom: '14px' }}>
            <div className="stat">
              <div className="label">Total Invoiced</div>
              <div className="value">
                {formatMoney(currentLedger.totalInvoiced, selectedCustomer?.businessId)}
              </div>
              <div className="hint">Billed charges</div>
            </div>

            <div className="stat">
              <div className="label">Total Paid</div>
              <div className="value">
                {formatMoney(currentLedger.totalPaid, selectedCustomer?.businessId)}
              </div>
              <div className="hint">Payments received</div>
            </div>

            <div className="stat">
              <div className="label">Outstanding</div>
              <div className="value">
                {formatMoney(currentLedger.outstandingBalance, selectedCustomer?.businessId)}
              </div>
              <div className="hint">Unpaid balance</div>
            </div>

            <div className="stat">
              <div className="label">Advance / Credit</div>
              <div className="value">
                {formatMoney(currentLedger.advanceCredit, selectedCustomer?.businessId)}
              </div>
              <div className="hint">Prepaid balance</div>
            </div>

            <div className="stat">
              <div className="label">Invoices</div>
              <div className="value">
                {currentLedger.invoicesCount || 0}
              </div>
              <div className="hint">{currentLedger.totalTransactionsCount || 0} transactions</div>
            </div>
          </div>

          {/* Clean Dashboard/Reports-Matched Transactions Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice / Ref #</th>
                  <th>Type</th>
                  <th>Description / Particulars</th>
                  <th style={{ textAlign: 'right' }}>Debit (+)</th>
                  <th style={{ textAlign: 'right' }}>Credit (-)</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row if fromDate is filtered */}
                {fromDate && (
                  <tr style={{ background: '#f8fafc', fontWeight: 600 }}>
                    <td>{fromDate}</td>
                    <td><strong>B/F</strong></td>
                    <td>Opening Balance</td>
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
                    <td style={{ textAlign: 'right' }}>
                      {formatMoney(currentLedger.openingBalance, selectedCustomer?.businessId)}
                    </td>
                    <td style={{ textAlign: 'center' }}>-</td>
                  </tr>
                )}

                {currentLedger.ledgerRows && currentLedger.ledgerRows.length > 0 ? (
                  currentLedger.ledgerRows.map((r) => {
                    return (
                      <tr key={r.id}>
                        <td>{r.date}</td>
                        <td>
                          <strong>{r.ref}</strong>
                        </td>
                        <td>{r.typeLabel}</td>
                        <td>
                          <div>{r.description}</div>
                          {r.monthYear !== '-' && (
                            <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                              {r.monthYear} {r.method !== '-' ? `• ${r.method}` : ''}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {r.debit > 0 ? formatMoney(r.debit, selectedCustomer?.businessId) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {r.credit > 0 ? formatMoney(r.credit, selectedCustomer?.businessId) : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {formatMoney(r.runningBalance, selectedCustomer?.businessId)}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="empty">
                      No ledger transactions recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan="4" style={{ textAlign: 'right' }}>
                    Total:
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatMoney(currentLedger.totalInvoiced, selectedCustomer?.businessId)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatMoney(currentLedger.totalPaid, selectedCustomer?.businessId)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {formatMoney(currentLedger.closingBalance, selectedCustomer?.businessId)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
