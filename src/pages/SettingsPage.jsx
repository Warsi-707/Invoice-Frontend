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
  const { state, updateSettings, backupData, restoreData, clearAllData, showToast, getBusiness, getCustomer } = useApp();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('org'); // 'org' | 'proposal'
  const [showA4Preview, setShowA4Preview] = useState(true);

  // Tab 01: Organization Identity & System Details State
  const [adminUser, setAdminUser] = useState(state.settings?.admin || 'Administrator');
  const [adminPass, setAdminPass] = useState(state.settings?.password || 'admin123');
  const [currency, setCurrency] = useState(state.settings?.currency || 'PKR');
  const [dueDays, setDueDays] = useState(state.settings?.dueDays ?? 0);
  const [footerNote, setFooterNote] = useState(state.settings?.footerNote || 'Thank you for your business.');

  // Tab 02: Letterhead & Proposal Builder State (Empty by default with helpful placeholders)
  const savedProp = state.settings?.proposalData || {};
  const [companyName, setCompanyName] = useState(savedProp.companyName || '');
  const [tagline, setTagline] = useState(savedProp.tagline || '');
  const [officeAddress, setOfficeAddress] = useState(savedProp.officeAddress || '');
  const [ntnTax, setNtnTax] = useState(savedProp.ntnTax || '');
  const [supportPhone, setSupportPhone] = useState(savedProp.supportPhone || '');
  const [inquiryEmail, setInquiryEmail] = useState(savedProp.inquiryEmail || '');
  const [websiteUrl, setWebsiteUrl] = useState(savedProp.websiteUrl || '');
  const [signatoryName, setSignatoryName] = useState(savedProp.signatoryName || '');
  const [signatoryTitle, setSignatoryTitle] = useState(savedProp.signatoryTitle || '');

  // Proposal Validity & Terms State
  const [validityDays, setValidityDays] = useState(savedProp.validityDays || 14);
  const [propTerms, setPropTerms] = useState(savedProp.terms || '');

  // Proposal Generator Dynamic Form State
  const [propTitle, setPropTitle] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [customClientCompany, setCustomClientCompany] = useState('');
  const [propDate, setPropDate] = useState(today());
  const [propDiscount, setPropDiscount] = useState(0);
  const [propTaxPct, setPropTaxPct] = useState(0);

  // Proposal Line Items
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
    }
  }, [state.settings]);

  // Save Settings Function
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
      terms: propTerms
    };

    updateSettings({
      admin: adminUser.trim() || 'Administrator',
      password: adminPass.trim() || 'admin123',
      currency,
      dueDays: Math.max(0, Number(dueDays || 0)),
      footerNote: footerNote.trim(),
      proposalData: proposalDataPayload
    });
  };

  // Proposal Item Handlers
  const handleAddItem = () => {
    setPropItems([
      ...propItems,
      { id: `prop-item-${Date.now()}`, name: '', desc: '', type: 'Service', qty: 1, price: 0 }
    ]);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...propItems];
    updated[index] = { ...updated[index], [field]: value };
    setPropItems(updated);
  };

  const handleRemoveItem = (index) => {
    setPropItems(propItems.filter((_, idx) => idx !== index));
  };

  // Calculate Proposal Totals
  const propSubtotal = propItems.reduce((acc, it) => acc + (Number(it.qty || 1) * Number(it.price || 0)), 0);
  const propTaxAmount = ((propSubtotal - Number(propDiscount || 0)) * Number(propTaxPct || 0)) / 100;
  const propGrandTotal = Math.max(0, propSubtotal - Number(propDiscount || 0) + propTaxAmount);

  // Selected Client
  const selectedCust = getCustomer(selectedCustomerId) || {};
  const currentClientName = selectedCust.name || customClientName || 'Al-Falah Textiles Ltd';
  const currentClientCompany = selectedCust.businessId ? (getBusiness(selectedCust.businessId)?.name || customClientCompany) : customClientCompany;

  // Assembled Proposal Object
  const currentProposalObject = {
    title: propTitle.trim() || 'Enterprise CRM Core Deployment',
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
      {/* Header matching user reference */}
      <div className="settings-header-top">
        <div className="settings-header-title">
          <h2>
            <span>System Settings & Configuration</span>
            <span className="modular-badge">Modular Control</span>
          </h2>
          <p>Configure application branding, corporate letterhead, custom dynamic pricing schemas, and automated communication alerts.</p>
        </div>
      </div>

      {/* Top Nav Tabs Bar matching reference image */}
      <div className="settings-nav-tabs">
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'org' ? 'active' : ''}`}
          onClick={() => setActiveTab('org')}
        >
          <div className="tab-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div className="tab-btn-content">
            <div className="tab-btn-title">Organization Identity</div>
            <div className="tab-btn-sub">Branding, Logo & Currency</div>
          </div>
          <span className="tab-num-badge">Tab 01</span>
        </button>

        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'proposal' ? 'active' : ''}`}
          onClick={() => setActiveTab('proposal')}
        >
          <div className="tab-btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="tab-btn-content">
            <div className="tab-btn-title">Letterhead & PDF Builder</div>
            <div className="tab-btn-sub">Corporate ID, A4 Template & Signature</div>
          </div>
          <span className="tab-num-badge">Tab 02</span>
        </button>
      </div>

      {/* TAB 01: Organization Identity & Session Details */}
      {activeTab === 'org' && (
        <div className="settings-layout">
          {/* Left Column: System & Session Details */}
          <div className="settings-card">
            <h4>System & Session Details</h4>

            <form onSubmit={handleSaveAllSettings} className="settings-form-grid enter-flow" autoComplete="off">
              <div className="full">
                <label>Application Name</label>
                <input
                  id="sAppName"
                  className="input"
                  value="Invoice Manager"
                  readOnly
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
                <label>Invoice Footer Note</label>
                <textarea
                  id="sFooterNote"
                  className="textarea"
                  rows={4}
                  placeholder="Thank you for your business."
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="full settings-save">
                <Button variant="primary" type="submit">
                  Save Settings
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: WhatsApp Delivery + Data & Backup */}
          <div className="settings-right-stack">
            {/* WhatsApp Scanner Card */}
            <WhatsAppScannerCard compact={true} />

            {/* Data & Backup Card */}
            <div className="settings-card">
              <h4>Data & Backup</h4>

              <div className="settings-data-note">
                PostgreSQL & Neon DB database records summary.
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
                  Backup Data
                </Button>
                <Button variant="light" onClick={() => fileInputRef.current?.click()}>
                  Restore Data
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
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 02: Letterhead & Proposal Builder */}
      {activeTab === 'proposal' && (
        <div>
          {/* Section 1: Corporate Identity & Tax Credentials */}
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
                  <span>Proposal Letterhead, Corporate Identity & PDF Builder</span>
                </h3>
                <p>Manage commercial quotation header data, NTN tax registrations, A4 background template, and authorized signature.</p>
              </div>
              <div className="prop-btn-group">
                <Button variant="light" size="xs" onClick={() => setShowA4Preview(!showA4Preview)}>
                  👁️ {showA4Preview ? 'Hide A4 Preview' : 'Show A4 Preview'}
                </Button>
                <Button variant="primary" size="xs" onClick={handleSaveAllSettings}>
                  💾 Save Settings
                </Button>
              </div>
            </div>

            <div className="prop-sub-heading">
              <span>🏛️ OFFICIAL CORPORATE IDENTITY & TAX CREDENTIALS</span>
            </div>

            <div className="prop-form-grid">
              <div>
                <label>Company / Agency Name</label>
                <input
                  className="input"
                  placeholder="e.g. Acme Technologies / ABC Traders"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div>
                <label>Tagline / Subtitle</label>
                <input
                  className="input"
                  placeholder="e.g. Software Development & Commercial Digital Solutions"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>

              <div className="span-2">
                <label>Official Registered Office Address</label>
                <input
                  className="input"
                  placeholder="e.g. Suite #101, Main Boulevard, Karachi, Pakistan"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                />
              </div>

              <div>
                <label>NTN / Tax Registration / STRN</label>
                <input
                  className="input"
                  placeholder="e.g. NTN: 1234567-8 | STRN: 1234567890123"
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
                  placeholder="03001234567"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(cleanPhoneInput(e.target.value))}
                />
              </div>

              <div>
                <label>Proposals & Inquiries Email</label>
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
                  placeholder="e.g. https://yourcompany.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Authorized Signatory & Stamp */}
            <div className="prop-sub-heading" style={{ marginTop: '22px' }}>
              <span>✍️ AUTHORIZED SIGNATORY & STAMP</span>
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
            </div>
          </div>

          {/* Section 2: Standard Proposal Validity & Terms & Conditions matching Image 1 */}
          <div className="proposal-builder-card">
            <div className="prop-card-header">
              <div>
                <h3>
                  <span>STANDARD PROPOSAL VALIDITY & TERMS & CONDITIONS</span>
                </h3>
                <p>Configure default quotation validity days and legal contract terms.</p>
              </div>
              <div className="preset-btn-group">
                <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>Quick Template:</span>
                <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset1)}>
                  Preset 1
                </button>
                <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset2)}>
                  Preset 2
                </button>
                <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset3)}>
                  Preset 3
                </button>
              </div>
            </div>

            <div className="prop-form-grid">
              <div>
                <label>Default Validity (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  className="input"
                  placeholder="14"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Math.max(1, Number(e.target.value || 14)))}
                />
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  Automatically calculates proposal expiry date on generation.
                </div>
              </div>

              <div className="span-2" style={{ gridColumn: 'span 3' }}>
                <label>Standard Commercial Terms & Conditions (Clauses)</label>
                <textarea
                  className="textarea"
                  rows={5}
                  value={propTerms}
                  onChange={(e) => setPropTerms(e.target.value)}
                  placeholder="Enter custom commercial terms & conditions, or click Preset 1 / 2 / 3 above to load pre-written contract terms..."
                  style={{ fontSize: '11.5px', lineHeight: '1.5' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Interactive A4 Proposal Sheet Preview matching user Image 1 & 2 */}
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
                  <p>Shows exact layout generated for clients.</p>
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
                        <h5>DATE & CURRENCY:</h5>
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
                    💾 Save Letterhead & Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
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
