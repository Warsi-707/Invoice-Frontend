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
                <label style={{ color: '#0f172a', fontWeight: 700 }}>Search Member / Client Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="ledgerSearch"
                    className="input"
                    placeholder="Type member name, phone or business to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="off"
                    style={{ fontSize: '13px', padding: '9px 12px', color: '#0f172a', fontWeight: 600 }}
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
                    <th style={{ width: '140px', textAlign: 'center' }}>Ledger</th>
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
                          <td style={{ textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>
                            {idx + 1}
                          </td>

                          <td>
                            <strong style={{ color: '#0f172a', fontSize: '13.5px', fontWeight: 750 }}>
                              {c?.name}
                            </strong>
                          </td>

                          <td style={{ color: '#0f172a', fontWeight: 600 }}>
                            {c?.phone || c?.whatsapp || '-'}
                          </td>

                          <td style={{ color: '#1e293b', fontWeight: 600 }}>
                            {b?.name || '-'}
                          </td>

                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn sm primary"
                              style={{
                                background: '#0b4b8f',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                borderRadius: '6px',
                                boxShadow: '0 1px 3px rgba(11, 75, 143, 0.3)'
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
          VIEW 2: DECENT VIP MEMBER COMPLETE LEDGER
         ------------------------------------------------------------- */}
      {selectedCustomerId && selectedCustomer && currentLedger && (
        <>
          {/* Top Panel: Header, Member Info & Export Actions */}
          <div className="panel" style={{ marginBottom: '14px' }}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    border: '1px solid #ffffff',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 750,
                    borderRadius: '6px'
                  }}
                  onClick={() => setSelectedCustomerId(null)}
                >
                  ← Back to List
                </button>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  {selectedCustomer?.name}
                </span>
                <span style={{ fontSize: '12.5px', color: '#dbeafe', fontWeight: 600 }}>
                  ({selectedBusiness?.name || 'Business'} {selectedCustomer?.phone ? `• ${selectedCustomer.phone}` : ''})
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    border: 'none',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px'
                  }}
                  onClick={handlePrint}
                >
                  🖨️ Print
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    border: 'none',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px'
                  }}
                  onClick={handleDownloadPdf}
                >
                  📄 PDF Statement
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: '#ffffff',
                    color: '#0b4b8f',
                    border: 'none',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px'
                  }}
                  onClick={handleExportExcel}
                >
                  📊 Excel / CSV
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 750,
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(16, 185, 129, 0.4)'
                  }}
                  onClick={handleSendWhatsAppStatement}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="panel-body">
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <div style={{ width: '160px' }}>
                  <label style={{ color: '#0f172a', fontWeight: 700 }}>Period Preset</label>
                  <select
                    className="select"
                    value={datePreset}
                    onChange={(e) => handleDatePresetChange(e.target.value)}
                    style={{ color: '#0f172a', fontWeight: 600 }}
                  >
                    <option value="all">All Time</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                  </select>
                </div>

                <div className="sm">
                  <label style={{ color: '#0f172a', fontWeight: 700 }}>From Date</label>
                  <input
                    type="date"
                    className="input"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    style={{ color: '#0f172a', fontWeight: 600 }}
                  />
                </div>

                <div className="sm">
                  <label style={{ color: '#0f172a', fontWeight: 700 }}>To Date</label>
                  <input
                    type="date"
                    className="input"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    style={{ color: '#0f172a', fontWeight: 600 }}
                  />
                </div>

                <div className="grow">
                  <label style={{ color: '#0f172a', fontWeight: 700 }}>Search in Ledger</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search voucher, description or item..."
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    style={{ color: '#0f172a', fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Standard Cohesive KPI Summary Cards */}
          <div className="cards" style={{ marginBottom: '14px' }}>
            <div className="stat">
              <div className="label" style={{ color: '#475569', fontWeight: 750 }}>Total Invoiced</div>
              <div className="value" style={{ color: '#0b4b8f', fontWeight: 800 }}>
                {formatMoney(currentLedger.totalInvoiced, selectedCustomer?.businessId)}
              </div>
              <div className="hint" style={{ color: '#64748b' }}>Billed charges</div>
            </div>

            <div className="stat">
              <div className="label" style={{ color: '#475569', fontWeight: 750 }}>Total Paid</div>
              <div className="value" style={{ color: '#16a34a', fontWeight: 800 }}>
                {formatMoney(currentLedger.totalPaid, selectedCustomer?.businessId)}
              </div>
              <div className="hint" style={{ color: '#64748b' }}>Payments received</div>
            </div>

            <div className="stat">
              <div className="label" style={{ color: '#475569', fontWeight: 750 }}>Outstanding Balance</div>
              <div
                className="value"
                style={{
                  color: currentLedger.outstandingBalance > 0 ? '#dc2626' : '#16a34a',
                  fontWeight: 850
                }}
              >
                {formatMoney(currentLedger.outstandingBalance, selectedCustomer?.businessId)}
              </div>
              <div className="hint" style={{ color: '#64748b' }}>
                {currentLedger.outstandingBalance > 0 ? 'Remaining dues' : 'Settled'}
              </div>
            </div>

            <div className="stat">
              <div className="label" style={{ color: '#475569', fontWeight: 750 }}>Advance / Credit</div>
              <div className="value" style={{ color: '#7e22ce', fontWeight: 800 }}>
                {formatMoney(currentLedger.advanceCredit, selectedCustomer?.businessId)}
              </div>
              <div className="hint" style={{ color: '#64748b' }}>Prepaid balance</div>
            </div>

            <div className="stat">
              <div className="label" style={{ color: '#475569', fontWeight: 750 }}>Invoices</div>
              <div className="value" style={{ color: '#0f172a', fontWeight: 800 }}>
                {currentLedger.invoicesCount || 0}
              </div>
              <div className="hint" style={{ color: '#64748b' }}>{currentLedger.totalTransactionsCount || 0} transactions</div>
            </div>
          </div>

          {/* Clean Transactions Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '130px' }}>Invoice / Ref #</th>
                  <th style={{ width: '140px' }}>Type</th>
                  <th>Description / Particulars</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Debit (+)</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Credit (-)</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Running Balance</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row if fromDate is filtered */}
                {fromDate && (
                  <tr style={{ background: '#fefce8', fontWeight: 700, color: '#854d0e' }}>
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
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 850,
                        color: currentLedger.openingBalance > 0 ? '#dc2626' : '#16a34a'
                      }}
                    >
                      {formatMoney(currentLedger.openingBalance, selectedCustomer?.businessId)}
                    </td>
                    <td style={{ textAlign: 'center' }}>-</td>
                  </tr>
                )}

                {currentLedger.ledgerRows && currentLedger.ledgerRows.length > 0 ? (
                  currentLedger.ledgerRows.map((r) => {
                    const isPay = r.type === 'payment';
                    const isPos = r.runningBalance > 0;
                    const isNeg = r.runningBalance < 0;

                    return (
                      <tr key={r.id}>
                        <td style={{ color: '#0f172a', fontWeight: 650, whiteSpace: 'nowrap' }}>
                          {r.date}
                        </td>

                        <td>
                          <strong style={{ color: '#0b4b8f', fontWeight: 800 }}>{r.ref}</strong>
                        </td>

                        <td>
                          <strong style={{ color: isPay ? '#16a34a' : '#0b4b8f' }}>
                            {r.typeLabel}
                          </strong>
                        </td>

                        <td>
                          <div style={{ color: '#0f172a', fontWeight: 650 }}>{r.description}</div>
                          {r.monthYear !== '-' && (
                            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                              {r.monthYear} {r.method !== '-' ? `• ${r.method}` : ''}
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 750,
                            color: r.debit > 0 ? '#0f172a' : '#64748b'
                          }}
                        >
                          {r.debit > 0 ? formatMoney(r.debit, selectedCustomer?.businessId) : '-'}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 800,
                            color: r.credit > 0 ? '#16a34a' : '#64748b'
                          }}
                        >
                          {r.credit > 0 ? formatMoney(r.credit, selectedCustomer?.businessId) : '-'}
                        </td>

                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 850,
                            fontSize: '13px',
                            color: isPos ? '#dc2626' : isNeg ? '#7e22ce' : '#16a34a'
                          }}
                        >
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
                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                  <td colSpan="4" style={{ textAlign: 'right', color: '#0f172a' }}>
                    Period Totals & Net Balance:
                  </td>
                  <td style={{ textAlign: 'right', color: '#0b4b8f' }}>
                    {formatMoney(currentLedger.totalInvoiced, selectedCustomer?.businessId)}
                  </td>
                  <td style={{ textAlign: 'right', color: '#16a34a' }}>
                    {formatMoney(currentLedger.totalPaid, selectedCustomer?.businessId)}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: currentLedger.closingBalance > 0 ? '#dc2626' : '#16a34a'
                    }}
                  >
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
