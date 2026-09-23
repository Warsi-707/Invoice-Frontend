import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import WhatsAppScannerCard from '../components/whatsapp/WhatsAppScannerCard';
import ProposalPreviewModal from '../components/proposal/ProposalPreviewModal';
import { downloadProposalFile } from '../utils/proposal';
import { money, today, cleanPhoneInput } from '../utils/formatters';

const PRESET_TERMS = {
  preset1: `1. Validity: This commercial quotation is valid for 14 calendar days from the date of issuance.
2. Payment Terms: 40% advance milestone on contract signing, 30% on beta milestone preview, and 30% upon final delivery & handover.
3. Taxes: Quoted prices are in Pakistani Rupees (PKR) and exclusive of applicable provincial sales tax (GST/PST) unless explicitly itemized.
4. Support & Warranty: 3 months of complimentary technical bug-fixing and cloud maintenance support is included post-launch.
5. Intellectual Property: Complete source code ownership and database rights will be transferred upon settlement of final invoice.`,

  preset2: `1. Validity: This proposal is valid for 30 calendar days from the date of issuance.
2. Payment Terms: 100% Monthly retainer billed in advance at the start of each service cycle.
3. SLA Commitments: 99.9% Cloud Uptime, 2-Hour critical response time, and 24/7 automated monitoring.
4. Scope: Covers continuous feature updates, security patches, daily automated backups, and server maintenance.
5. Termination: Either party may terminate the SLA by providing 30 days written notice.`,

  preset3: `1. Validity: Quoted hardware and license rates are valid for 7 calendar days due to market currency fluctuations.
2. Payment Terms: 100% advance payment required against official Purchase Order (PO).
3. Delivery: Delivery lead time is 3-5 working days from payment confirmation.
4. Warranty: Standard 1-Year official manufacturer warranty against defects.
5. Returns: Opened software license keys and activated hardware units are non-refundable.`
};

export default function SettingsPage() {
  const {
    state,
    updateSettings,
    backupData,
    restoreData,
    clearAllData,
    showToast,
    getBusiness,
    getCustomer,
    settingsTab,
    setSettingsTab
  } = useApp();

  const fileInputRef = useRef(null);
  const activeTab = settingsTab || 'org'; // 'org' | 'proposal' | 'invoice'

  // Organization Identity & Corporate Details
  const savedProp = state.settings?.proposalData || {};
  const [companyName, setCompanyName] = useState(savedProp.companyName || '');
  const [tagline, setTagline] = useState(savedProp.tagline || '');
  const [officeAddress, setOfficeAddress] = useState(savedProp.officeAddress || '');
  const [ntnTax, setNtnTax] = useState(savedProp.ntnTax || '');
  const [supportPhone, setSupportPhone] = useState(savedProp.supportPhone || '');
  const [inquiryEmail, setInquiryEmail] = useState(savedProp.inquiryEmail || '');
  const [websiteUrl, setWebsiteUrl] = useState(savedProp.websiteUrl || '');

  // Admin & Security Credentials
  const [adminUser, setAdminUser] = useState(state.settings?.admin || 'Administrator');
  const [adminPass, setAdminPass] = useState(state.settings?.password || 'admin123');

  // Proposal & Letterhead State
  const [signatoryName, setSignatoryName] = useState(savedProp.signatoryName || '');
  const [signatoryTitle, setSignatoryTitle] = useState(savedProp.signatoryTitle || '');
  const [validityDays, setValidityDays] = useState(savedProp.validityDays || 14);
  const [propTerms, setPropTerms] = useState(savedProp.terms || '');
  const [showA4Preview, setShowA4Preview] = useState(true);

  // Invoice Settings State
  const [currency, setCurrency] = useState(state.settings?.currency || 'PKR');
  const [dueDays, setDueDays] = useState(state.settings?.dueDays ?? 0);
  const [footerNote, setFooterNote] = useState(state.settings?.footerNote || 'Thank you for your business.');
  const [bankName, setBankName] = useState(savedProp.bankName || '');
  const [accountTitle, setAccountTitle] = useState(savedProp.accountTitle || '');
  const [accountIban, setAccountIban] = useState(savedProp.accountIban || '');
  const [invoicePrefix, setInvoicePrefix] = useState(savedProp.invoicePrefix || 'INV-');

  // Proposal Preview Dynamic Items State
  const [propTitle, setPropTitle] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [customClientCompany, setCustomClientCompany] = useState('');
  const [propDate, setPropDate] = useState(today());
  const [propDiscount, setPropDiscount] = useState(0);
  const [propTaxPct, setPropTaxPct] = useState(0);

  const [propItems, setPropItems] = useState([
    { id: 'item-1', name: '', desc: '', type: 'Service', qty: 1, price: '' }
  ]);

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    setAdminUser(state.settings?.admin || 'Administrator');
    setAdminPass(state.settings?.password || 'admin123');
    setCurrency(state.settings?.currency || 'PKR');
    setDueDays(state.settings?.dueDays ?? 0);
    setFooterNote(state.settings?.footerNote || 'Thank you for your business.');

    const p = state.settings?.proposalData;
    if (p) {
      if (p.companyName !== undefined) setCompanyName(p.companyName);
      if (p.tagline !== undefined) setTagline(p.tagline);
      if (p.officeAddress !== undefined) setOfficeAddress(p.officeAddress);
      if (p.ntnTax !== undefined) setNtnTax(p.ntnTax);
      if (p.supportPhone !== undefined) setSupportPhone(p.supportPhone);
      if (p.inquiryEmail !== undefined) setInquiryEmail(p.inquiryEmail);
      if (p.websiteUrl !== undefined) setWebsiteUrl(p.websiteUrl);
      if (p.signatoryName !== undefined) setSignatoryName(p.signatoryName);
      if (p.signatoryTitle !== undefined) setSignatoryTitle(p.signatoryTitle);
      if (p.validityDays !== undefined) setValidityDays(p.validityDays);
      if (p.terms !== undefined) setPropTerms(p.terms);
      if (p.bankName !== undefined) setBankName(p.bankName);
      if (p.accountTitle !== undefined) setAccountTitle(p.accountTitle);
      if (p.accountIban !== undefined) setAccountIban(p.accountIban);
      if (p.invoicePrefix !== undefined) setInvoicePrefix(p.invoicePrefix);
    }
  }, [state.settings]);

  // Master Save Function
  const handleSaveAllSettings = (e) => {
    e?.preventDefault();

    const proposalDataPayload = {
      companyName: companyName.trim(),
      tagline: tagline.trim(),
      officeAddress: officeAddress.trim(),
      ntnTax: ntnTax.trim(),
      supportPhone: supportPhone.trim(),
      inquiryEmail: inquiryEmail.trim(),
      websiteUrl: websiteUrl.trim(),
      signatoryName: signatoryName.trim(),
      signatoryTitle: signatoryTitle.trim(),
      validityDays: Number(validityDays || 14),
      terms: propTerms,
      bankName: bankName.trim(),
      accountTitle: accountTitle.trim(),
      accountIban: accountIban.trim(),
      invoicePrefix: invoicePrefix.trim() || 'INV-'
    };

    updateSettings({
      admin: adminUser.trim() || 'Administrator',
      password: adminPass.trim() || 'admin123',
      currency,
      dueDays: Math.max(0, Number(dueDays || 0)),
      footerNote: footerNote.trim(),
      proposalData: proposalDataPayload
    });

    showToast('✅ Settings saved successfully.');
  };

  // Calculate Proposal Totals for Preview
  const propSubtotal = propItems.reduce((acc, it) => acc + (Number(it.qty || 1) * Number(it.price || 0)), 0);
  const propTaxAmount = ((propSubtotal - Number(propDiscount || 0)) * Number(propTaxPct || 0)) / 100;
  const propGrandTotal = Math.max(0, propSubtotal - Number(propDiscount || 0) + propTaxAmount);

  // Selected Client
  const selectedCust = getCustomer(selectedCustomerId) || {};
  const currentClientName = selectedCust.name || customClientName || 'Al-Falah Textiles Ltd';
  const currentClientCompany = selectedCust.businessId ? (getBusiness(selectedCust.businessId)?.name || customClientCompany) : customClientCompany;

  // Assembled Proposal Object
  const currentProposalObject = {
    title: propTitle.trim() || 'Enterprise Commercial Proposal',
    proposalNo: `PROP-${new Date().getFullYear()}-0042`,
    date: propDate,
    validity: `${validityDays} Days`,
    validityDays: Number(validityDays || 14),
    summary: 'Commercial proposal for enterprise software deployment and automated billing solutions.',
    items: propItems,
    subtotal: propSubtotal,
    discount: Number(propDiscount || 0),
    taxPct: Number(propTaxPct || 0),
    taxAmount: propTaxAmount,
    total: propGrandTotal,
    terms: propTerms,
    companyName: companyName.trim(),
    tagline: tagline.trim(),
    officeAddress: officeAddress.trim(),
    ntnTax: ntnTax.trim(),
    supportPhone: supportPhone.trim(),
    inquiryEmail: inquiryEmail.trim(),
    websiteUrl: websiteUrl.trim(),
    signatoryName: signatoryName.trim(),
    signatoryTitle: signatoryTitle.trim(),
    clientName: currentClientName,
    clientCompany: currentClientCompany
  };

  const handlePreviewProposal = () => {
    setIsPreviewOpen(true);
  };

  const handleDownloadProposal = async () => {
    try {
      showToast('⏳ Generating PDF...');
      await downloadProposalFile(currentProposalObject, { currency }, selectedCust);
      showToast('✅ Proposal PDF downloaded.');
    } catch (err) {
      showToast('❌ Failed to download PDF: ' + err.message);
    }
  };

  // Restore handler
  const handleRestoreFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        restoreData(parsed);
      } catch (err) {
        alert('Invalid JSON file.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Stats
  const businessCount = state.businesses.length;
  const customerCount = state.customers.length;
  const invoiceCount = state.invoices.length;
  const paymentCount = state.invoices.reduce((acc, inv) => acc + (inv.payments?.length || 0), 0);
  const reversalCount = (state.reversals || []).length;

  return (
    <section id="settings" className="page active">
      {/* Header */}
      <div className="settings-header-top">
        <div className="settings-header-title">
          <h2>
            {activeTab === 'org' && <span>🏛️ Organization Identity &amp; Corporate Profile</span>}
            {activeTab === 'proposal' && <span>📜 Proposal Letterhead &amp; Document Settings</span>}
            {activeTab === 'invoice' && <span>🧾 Invoice Settings &amp; Billing Defaults</span>}
            <span className="modular-badge">
              {activeTab === 'org' ? 'Module 01' : activeTab === 'proposal' ? 'Module 02' : 'Module 03'}
            </span>
          </h2>
          <p>
            {activeTab === 'org' && 'Configure company/agency official profile, contact credentials, admin access and cloud database.'}
            {activeTab === 'proposal' && 'Configure proposal letterhead template, authorized signatory stamp, and contract clauses.'}
            {activeTab === 'invoice' && 'Configure default invoice currency, payment due days, invoice footer notes and receiving bank details.'}
          </p>
        </div>
      </div>


      {/* =========================================================================
          MODULE 01: Organization Identity & Corporate Profile
         ========================================================================= */}
      {activeTab === 'org' && (
        <div className="settings-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0b4b8f', fontWeight: '800' }}>
                🏛️ Official Organization Identity &amp; Tax Profile
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                This official business name, address, tax credentials and contact numbers represent your company across all system documents.
              </p>
            </div>
            <Button variant="primary" size="xs" onClick={handleSaveAllSettings}>
              💾 Save Identity
            </Button>
          </div>

          <form onSubmit={handleSaveAllSettings} className="settings-form-grid enter-flow" autoComplete="off">
            <div>
              <label>Company / Organization Name <span className="req">*</span></label>
              <input
                className="input"
                placeholder="e.g. iSysware Software Solution"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label>Tagline / Subtitle</label>
              <input
                className="input"
                placeholder="e.g. software development"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>

            <div className="full">
              <label>Official Registered Office Address</label>
              <input
                className="input"
                placeholder="e.g. Karachi"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
              />
            </div>

            <div>
              <label>NTN / Tax Registration / STRN</label>
              <input
                className="input"
                placeholder="e.g. NTN:646383"
                value={ntnTax}
                onChange={(e) => setNtnTax(e.target.value)}
              />
            </div>

            <div>
              <label>Official Support / Inquiry Phone</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                className="input phone11"
                placeholder="03137784989"
                value={supportPhone}
                onChange={(e) => setSupportPhone(cleanPhoneInput(e.target.value))}
              />
            </div>

            <div>
              <label>Official Inquiries Email</label>
              <input
                className="input"
                type="email"
                placeholder="e.g. info@yourcompany.com"
                value={inquiryEmail}
                onChange={(e) => setInquiryEmail(e.target.value)}
              />
            </div>

            <div>
              <label>Official Website URL</label>
              <input
                className="input"
                placeholder="e.g. https://software.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
            </div>

            <div className="full settings-save" style={{ marginTop: '8px' }}>
              <Button variant="primary" type="submit">
                💾 Save Organization Identity
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 02: Proposal Letterhead & PDF Builder
         ========================================================================= */}
      {activeTab === 'proposal' && (
        <div>
          {/* Section 1: Signatory & Validity */}
          <div className="proposal-builder-card">
            <div className="prop-card-header">
              <div>
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0b4b8f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>Authorized Signatory &amp; Proposal Validity</span>
                </h3>
                <p>Configure official signatory stamp and validity period for commercial proposals.</p>
              </div>
              <div className="prop-btn-group">
                <Button variant="light" size="xs" onClick={() => setShowA4Preview(!showA4Preview)}>
                  👁️ {showA4Preview ? 'Hide A4 Preview' : 'Show A4 Preview'}
                </Button>
                <Button variant="primary" size="xs" onClick={handleSaveAllSettings}>
                  💾 Save Proposal Settings
                </Button>
              </div>
            </div>

            <div className="prop-sub-heading">
              <span>✍️ AUTHORIZED SIGNATORY &amp; STAMP</span>
            </div>

            <div className="prop-form-grid">
              <div>
                <label>Signatory Full Name</label>
                <input
                  className="input"
                  placeholder="e.g. Muhammad Ali"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                />
              </div>

              <div>
                <label>Official Designation / Title</label>
                <input
                  className="input"
                  placeholder="e.g. Chief Executive Officer / Managing Director"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                />
              </div>

              <div>
                <label>Default Proposal Validity (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="input"
                  placeholder="14"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value || 14)))}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Standard Proposal Terms & Conditions */}
          <div className="proposal-builder-card">
            <div className="prop-card-header">
              <div>
                <h3>
                  <span>STANDARD PROPOSAL TERMS &amp; CONDITIONS</span>
                </h3>
                <p>Configure legal contract clauses and payment milestones presets for client proposals.</p>
              </div>
              <div className="preset-btn-group">
                <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>Quick Template:</span>
                <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset1)}>
                  Preset 1 (Milestones)
                </button>
                <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset2)}>
                  Preset 2 (Retainer)
                </button>
                <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset3)}>
                  Preset 3 (Hardware)
                </button>
              </div>
            </div>

            <div className="prop-form-grid">
              <div className="span-2" style={{ gridColumn: 'span 3' }}>
                <label>Standard Commercial Terms &amp; Conditions (Clauses)</label>
                <textarea
                  className="textarea"
                  rows={5}
                  value={propTerms}
                  onChange={(e) => setPropTerms(e.target.value)}
                  placeholder="Enter custom commercial terms & conditions..."
                  style={{ fontSize: '11.5px', lineHeight: '1.5' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Interactive A4 Proposal Sheet Preview */}
          {showA4Preview && (
            <div className="proposal-builder-card">
              <div className="prop-card-header">
                <div>
                  <h3>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polygon points="12 8 8 12 12 16 12 8"></polygon>
                    </svg>
                    <span>Interactive A4 Proposal Sheet Preview</span>
                  </h3>
                  <p>Shows exact layout generated for clients using Organization Identity branding.</p>
                </div>
                <div className="prop-btn-group">
                  <Button variant="light" size="xs" onClick={handleDownloadProposal}>
                    📄 Download HTML / PDF
                  </Button>
                  <Button variant="primary" size="xs" onClick={handlePreviewProposal}>
                    👁️ Fullscreen Preview
                  </Button>
                </div>
              </div>

              {/* Live Embedded A4 Paper Canvas */}
              <div className="embedded-a4-wrapper">
                <div className="embedded-a4-sheet">
                  <div>
                    {/* A4 Sheet Top Header */}
                    <div className="a4-sheet-top">
                      <div className="a4-sheet-brand">
                        <h2>{companyName || 'Company / Agency Name'}</h2>
                        {tagline && <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: '600', marginBottom: '3px' }}>{tagline}</div>}
                        <p>{officeAddress || 'Registered Office Address'}</p>
                        {ntnTax ? <div className="tax-line">{ntnTax}</div> : <div className="tax-line" style={{ opacity: 0.6 }}>NTN: XXXXXXX-X | STRN: XXXXXXXXXXXXX</div>}
                      </div>
                      <div className="a4-sheet-badge-wrap">
                        <div className="a4-commercial-badge">Commercial Proposal</div>
                        <div className="a4-ref-line">Ref: PROP-2026-0042</div>
                        <div className="a4-valid-line">Valid {validityDays} Days</div>
                      </div>
                    </div>

                    {/* A4 Prepared For / Date Card */}
                    <div className="a4-info-grid">
                      <div className="a4-info-col">
                        <h5>PREPARED FOR:</h5>
                        <p><strong>{currentClientName || 'Client / Business Name'}</strong></p>
                        <p style={{ color: '#475569' }}>{currentClientCompany || 'Client Representative / Designation'}</p>
                      </div>
                      <div className="a4-info-col right">
                        <h5>DATE &amp; CURRENCY:</h5>
                        <p><strong>{propDate}</strong></p>
                        <p style={{ color: '#0369a1' }}>{currency} (Pakistani Rupee)</p>
                      </div>
                    </div>

                    {/* A4 Deliverables Table */}
                    <table className="a4-scope-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60%' }}>Scope Deliverable</th>
                          <th style={{ width: '20%' }}>Type</th>
                          <th style={{ width: '20%', textAlign: 'right' }}>Investment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propItems.length > 0 && propItems.some(it => it.name && it.name.trim()) ? (
                          propItems.filter(it => it.name && it.name.trim()).map((it, idx) => (
                            <tr key={it.id || idx}>
                              <td>
                                <strong>{it.name}</strong>
                                {it.desc && <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>{it.desc}</div>}
                              </td>
                              <td>{it.type || 'Service'}</td>
                              <td style={{ textAlign: 'right', fontWeight: '750' }}>
                                {money((it.qty || 1) * (it.price || 0), currency)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '14px', fontSize: '11px' }}>
                              No deliverables added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* A4 Bottom Terms & Signatory */}
                  <div>
                    <div className="a4-terms-summary">
                      <strong>Terms Summary:</strong> {propTerms ? (propTerms.length > 240 ? propTerms.slice(0, 240) + '...' : propTerms) : 'Commercial terms & conditions will appear here.'}
                    </div>

                    <div className="a4-footer-row">
                      <div>
                        {[inquiryEmail, supportPhone].filter(Boolean).join(' • ') || 'Contact Details'}
                      </div>
                      <div className="a4-signatory-col">
                        <div className="a4-signatory-name">{signatoryName || 'Authorized Signatory'}</div>
                        <div className="a4-signatory-title">{signatoryTitle || 'Management Representative'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="prop-actions-bar" style={{ marginTop: '16px' }}>
                <div className="prop-btn-group">
                  <Button variant="primary" onClick={handlePreviewProposal}>
                    👁️ Fullscreen A4 Preview
                  </Button>
                  <Button variant="light" onClick={handleDownloadProposal}>
                    📄 Download A4 Proposal
                  </Button>
                  <Button
                    variant="green"
                    onClick={handlePreviewProposal}
                    style={{ background: '#10b981', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>💬</span>
                    <span>Send via WhatsApp</span>
                  </Button>
                </div>
                <div>
                  <Button variant="primary" onClick={handleSaveAllSettings}>
                    💾 Save Proposal Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 03: Invoice Settings & System Defaults
         ========================================================================= */}
      {activeTab === 'invoice' && (
        <div className="settings-layout">
          {/* Left Column: System & Session Details + Bank Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="settings-card">
              <h4>⚙️ System &amp; Session Details</h4>

              <form onSubmit={handleSaveAllSettings} className="settings-form-grid enter-flow" autoComplete="off">
                <div className="full">
                  <label>Application Name</label>
                  <input
                    className="input"
                    value="Invoice Manager"
                    readOnly
                    disabled
                    style={{ background: '#f8fafc', color: '#64748b' }}
                  />
                </div>

                <div>
                  <label>Default Currency</label>
                  <select
                    id="sCur"
                    className="select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="PKR">PKR (Pakistani Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>

                <div>
                  <label>Default Due Days</label>
                  <input
                    id="sDueDays"
                    className="input"
                    type="number"
                    min="0"
                    max="365"
                    placeholder="0"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                    autoComplete="off"
                  />
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                    0 = Due on receipt / same day.
                  </div>
                </div>

                <div>
                  <label>
                    Admin Username <span className="req">*</span>
                  </label>
                  <input
                    id="sAdmin"
                    className="input"
                    placeholder="Administrator"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label>
                    Admin Login Password <span className="req">*</span>
                  </label>
                  <input
                    id="sPass"
                    className="input"
                    type="text"
                    placeholder="admin123"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="full">
                  <label>Invoice Numbering Prefix</label>
                  <input
                    className="input"
                    placeholder="e.g. INV-"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                  />
                </div>

                <div className="full">
                  <label>Invoice Footer Note</label>
                  <textarea
                    id="sFooterNote"
                    className="textarea"
                    rows={3}
                    placeholder="Thank you for your business."
                    value={footerNote}
                    onChange={(e) => setFooterNote(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="full settings-save">
                  <Button variant="primary" type="submit">
                    💾 Save Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* Bank Details */}
            <div className="settings-card">
              <h4>🏦 Bank &amp; Payment Details (For Invoices)</h4>
              <div className="settings-data-note">
                These bank account credentials appear on customer invoice receipts &amp; payment reminders.
              </div>

              <form onSubmit={handleSaveAllSettings} className="settings-form-grid enter-flow" autoComplete="off">
                <div className="full">
                  <label>Bank Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Meezan Bank / HBL / Bank Alfalah"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>

                <div className="full">
                  <label>Account Title</label>
                  <input
                    className="input"
                    placeholder="e.g. iSysware Software Solution"
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                  />
                </div>

                <div className="full">
                  <label>Account Number / IBAN</label>
                  <input
                    className="input"
                    placeholder="e.g. PK36MEZN00012345678901"
                    value={accountIban}
                    onChange={(e) => setAccountIban(e.target.value)}
                  />
                </div>

                <div className="full settings-save">
                  <Button variant="primary" type="submit">
                    💾 Save Bank Details
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: WhatsApp QR + Data & Backup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* WhatsApp Automatic Delivery */}
            <WhatsAppScannerCard isStandalone={false} />

            {/* Neon PostgreSQL Cloud Database & Backup Card */}
            <div className="settings-card">
              <h4>☁️ Data &amp; Backup</h4>

              <div className="settings-data-note">
                PostgreSQL &amp; Neon DB database records summary.
              </div>

              <div className="data-summary">
                <div className="data-stat">
                  <span>Businesses</span>
                  <strong>{businessCount}</strong>
                </div>
                <div className="data-stat">
                  <span>Clients</span>
                  <strong>{customerCount}</strong>
                </div>
                <div className="data-stat">
                  <span>Invoices</span>
                  <strong>{invoiceCount}</strong>
                </div>
                <div className="data-stat">
                  <span>Payment Entries</span>
                  <strong>{paymentCount}</strong>
                </div>
                <div className="data-stat">
                  <span>Reversal Records</span>
                  <strong>{reversalCount}</strong>
                </div>
              </div>

              <div className="settings-data-actions" style={{ marginTop: '16px' }}>
                <Button variant="light" onClick={backupData}>
                  ⬇️ Backup Data
                </Button>
                <Button variant="light" onClick={() => fileInputRef.current?.click()}>
                  ⬆️ Restore Data
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden-file"
                  onChange={handleRestoreFileChange}
                />
              </div>

              <div className="data-danger" style={{ marginTop: '18px' }}>
                <Button variant="danger" onClick={clearAllData}>
                  ⚠️ Clear All Data (Reset)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live A4 Proposal Preview Modal */}
      <ProposalPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        proposal={currentProposalObject}
        business={{ currency }}
        customer={selectedCust}
      />
    </section>
  );
}
