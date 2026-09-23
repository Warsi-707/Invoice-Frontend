import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import WhatsAppScannerCard from '../components/whatsapp/WhatsAppScannerCard';
import ProposalPreviewModal from '../components/proposal/ProposalPreviewModal';
import InvoicePreview from '../components/invoice/InvoicePreview';
import { downloadProposalFile } from '../utils/proposal';
import { downloadInvoiceFile } from '../utils/invoice';
import { MONTHS, money, today, cleanPhoneInput } from '../utils/formatters';

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
  const [companyName, setCompanyName] = useState(savedProp.companyName || 'iSysware');
  const [tagline, setTagline] = useState(savedProp.tagline || 'ERP • Custom Software • Web • AI Solutions');
  const [officeAddress, setOfficeAddress] = useState(savedProp.officeAddress || 'Karachi, Pakistan');
  const [ntnTax, setNtnTax] = useState(savedProp.ntnTax || '');
  const [supportPhone, setSupportPhone] = useState(savedProp.supportPhone || '+92 314 8843707');
  const [inquiryEmail, setInquiryEmail] = useState(savedProp.inquiryEmail || 'info@isysware.com');
  const [websiteUrl, setWebsiteUrl] = useState(savedProp.websiteUrl || 'isysware.com');

  // Admin & Security Credentials
  const [adminUser, setAdminUser] = useState(state.settings?.admin || 'Administrator');
  const [adminPass, setAdminPass] = useState(state.settings?.password || 'admin123');

  // Proposal & Letterhead State
  const [signatoryName, setSignatoryName] = useState(savedProp.signatoryName || '');
  const [signatoryTitle, setSignatoryTitle] = useState(savedProp.signatoryTitle || '');
  const [validityDays, setValidityDays] = useState(savedProp.validityDays || 14);
  const [propTerms, setPropTerms] = useState(savedProp.terms || PRESET_TERMS.preset2);
  const [showA4Preview, setShowA4Preview] = useState(true);

  // Invoice Settings State
  const [currency, setCurrency] = useState(state.settings?.currency || 'PKR');
  const [dueDays, setDueDays] = useState(state.settings?.dueDays ?? 0);
  const [footerNote, setFooterNote] = useState(state.settings?.footerNote || 'Thank you for your business.');
  const [bankName, setBankName] = useState(savedProp.bankName || 'Meezan Bank');
  const [accountTitle, setAccountTitle] = useState(savedProp.accountTitle || 'iSysware Software Solution');
  const [accountIban, setAccountIban] = useState(savedProp.accountIban || 'PK36MEZN00012345678901');
  const [invoicePrefix, setInvoicePrefix] = useState(savedProp.invoicePrefix || 'ISW-');
  const [paymentMethod, setPaymentMethod] = useState(savedProp.paymentMethod || 'Bank Transfer / Online');
  const [invoiceSubtitle, setInvoiceSubtitle] = useState(savedProp.invoiceSubtitle || 'Professional Services Invoice');
  const [preparedBy, setPreparedBy] = useState(savedProp.preparedBy || savedProp.companyName || 'iSysware');
  const [thankYouMsg, setThankYouMsg] = useState(savedProp.thankYouMsg || 'Thank you for choosing iSysware. • Please reference the invoice number when making payment.');
  const [invoiceNotes, setInvoiceNotes] = useState(savedProp.invoiceNotes || 'Add payment terms, renewal note, support period, milestone details, tax note, or any client-specific instructions.');
  const [showInvPreview, setShowInvPreview] = useState(true);

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

  // Preview Modal States
  const [isPropPreviewOpen, setIsPropPreviewOpen] = useState(false);
  const [isInvPreviewOpen, setIsInvPreviewOpen] = useState(false);

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
      if (p.paymentMethod !== undefined) setPaymentMethod(p.paymentMethod);
      if (p.invoiceSubtitle !== undefined) setInvoiceSubtitle(p.invoiceSubtitle);
      if (p.preparedBy !== undefined) setPreparedBy(p.preparedBy);
      if (p.thankYouMsg !== undefined) setThankYouMsg(p.thankYouMsg);
      if (p.invoiceNotes !== undefined) setInvoiceNotes(p.invoiceNotes);
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
      invoicePrefix: invoicePrefix.trim() || 'ISW-',
      paymentMethod: paymentMethod.trim() || 'Bank Transfer / Online',
      invoiceSubtitle: invoiceSubtitle.trim() || 'Professional Services Invoice',
      preparedBy: preparedBy.trim() || companyName.trim() || 'iSysware',
      thankYouMsg: thankYouMsg.trim() || `Thank you for choosing ${companyName.trim() || 'iSysware'}. • Please reference the invoice number when making payment.`,
      invoiceNotes: invoiceNotes.trim()
    };

    updateSettings({
      admin: adminUser.trim() || 'Administrator',
      password: adminPass.trim() || 'admin123',
      currency,
      dueDays: Math.max(0, Number(dueDays || 0)),
      footerNote: (invoiceNotes || footerNote).trim(),
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

  // Sample Invoice Object for Preview & Template Testing
  const sampleInvoiceObject = {
    id: 'sample-inv',
    invoiceNo: `${invoicePrefix || 'ISW-'}0001`,
    date: today(),
    dueDate: today(),
    currency: currency || 'PKR',
    project: 'Enterprise Software & Cloud Billing',
    serviceType: 'Software Development & Hosting',
    billingCycle: 'Monthly Retainer Cycle',
    servicePeriod: `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`,
    items: [
      { itemId: '1', name: 'Custom ERP Software Maintenance & Cloud Hosting', period: 'Current Month', qty: 1, price: 45000, amount: 45000 },
      { itemId: '2', name: 'Dedicated Technical Support & Automated Daily Backups', period: 'Current Month', qty: 1, price: 15000, amount: 15000 }
    ],
    subtotal: 60000,
    discount: 0,
    taxPct: 0,
    taxAmount: 0,
    total: 60000,
    paid: 0,
    balance: 60000,
    status: 'Unpaid',
    notes: invoiceNotes || 'Add payment terms, renewal note, support period, milestone details, tax note, or any client-specific instructions.'
  };

  const sampleInvoiceBusiness = {
    name: companyName || 'iSysware',
    companyName: companyName || 'iSysware',
    tagline: tagline || 'ERP • Custom Software • Web • AI Solutions',
    email: inquiryEmail || 'info@isysware.com',
    phone: supportPhone || '+92 314 8843707',
    website: websiteUrl || 'isysware.com',
    currency: currency || 'PKR',
    paymentMethod: paymentMethod || 'Bank Transfer / Online',
    bankName: bankName || 'Meezan Bank',
    accountTitle: accountTitle || 'iSysware Software Solution',
    accountIban: accountIban || 'PK36MEZN00012345678901',
    invoiceSubtitle: invoiceSubtitle || 'Professional Services Invoice',
    preparedBy: preparedBy || companyName || 'iSysware',
    thankYouMsg: thankYouMsg || `Thank you for choosing ${companyName || 'iSysware'}. • Please reference the invoice number when making payment.`,
    footerNote: invoiceNotes || 'Add payment terms, renewal note, support period, milestone details, tax note, or any client-specific instructions.'
  };

  const sampleCustomer = {
    name: 'Al-Falah Textiles Ltd',
    contactPerson: 'Director Operations',
    email: 'finance@alfalah.com',
    phone: '0300-1234567',
    address: 'Plot 42, Industrial Area, Karachi, Pakistan'
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

  const handleDownloadSampleInvoice = async () => {
    try {
      showToast('⏳ Generating Invoice PDF...');
      await downloadInvoiceFile(sampleInvoiceObject, sampleInvoiceBusiness, sampleCustomer, 'Sample_Corporate_Invoice.pdf');
      showToast('✅ Invoice PDF downloaded.');
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
            {activeTab === 'org' && <span>🏛️ Organization &amp; System Settings</span>}
            {activeTab === 'proposal' && <span>📜 Proposal &amp; Official Letterhead</span>}
            {activeTab === 'invoice' && <span>🧾 Invoice Template &amp; Bank Settings</span>}
            <span className="modular-badge">
              {activeTab === 'org' ? 'Module 01' : activeTab === 'proposal' ? 'Module 02' : 'Module 03'}
            </span>
          </h2>
          <p>
            {activeTab === 'org' && 'Configure system credentials, defaults, WhatsApp automatic delivery, and PostgreSQL cloud backup.'}
            {activeTab === 'proposal' && 'Configure official organization identity profile, letterhead template, signatory stamp, and contract clauses.'}
            {activeTab === 'invoice' && 'Configure invoice provider identity, numbering prefix, bank credentials, payment terms, and corporate layout across all software.'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          MODULE 01: Organization & System Settings
         ========================================================================= */}
      {activeTab === 'org' && (
        <div className="settings-layout">
          {/* Left Column: System & Session Details */}
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
                  placeholder="e.g. ISW-"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </div>

              <div className="full">
                <label>Invoice Footer Note</label>
                <textarea
                  id="sFooterNote"
                  className="textarea"
                  rows={2}
                  placeholder="Thank you for your business."
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="full settings-save">
                <Button variant="primary" type="submit">
                  💾 Save System Settings
                </Button>
              </div>
            </form>
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

      {/* =========================================================================
          MODULE 02: Proposal Letterhead & PDF Builder
         ========================================================================= */}
      {activeTab === 'proposal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Single Unified Proposal & Letterhead Card */}
          <div className="settings-card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0b4b8f', fontWeight: '800' }}>
                  📜 Proposal &amp; Official Letterhead Profile
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Configure official letterhead details, authorized signatory credentials, and standard commercial terms in one unified form.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button variant="light" size="xs" onClick={() => setShowA4Preview(!showA4Preview)}>
                  👁️ {showA4Preview ? 'Hide A4 Preview' : 'Show A4 Preview'}
                </Button>
                <Button variant="primary" size="xs" onClick={handleSaveAllSettings}>
                  💾 Save Proposal Settings
                </Button>
              </div>
            </div>

            <form onSubmit={handleSaveAllSettings} className="settings-form-grid enter-flow" autoComplete="off">
              {/* Section 1: Official Letterhead */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '2px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🏢 1. Official Organization &amp; Letterhead Details
                </span>
              </div>

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

              {/* Section 2: Authorized Signatory */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '14px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ✍️ 2. Authorized Signatory &amp; Proposal Validity
                </span>
              </div>

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

              {/* Section 3: Terms & Conditions */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '14px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📋 3. Standard Commercial Terms &amp; Conditions
                </span>
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

              <div className="full">
                <label>Commercial Clauses &amp; Terms</label>
                <textarea
                  className="textarea"
                  rows={5}
                  value={propTerms}
                  onChange={(e) => setPropTerms(e.target.value)}
                  placeholder="Enter custom commercial terms & conditions..."
                  style={{ fontSize: '12px', lineHeight: '1.45', minHeight: '115px' }}
                />
              </div>

              {/* Single Save Button at Bottom */}
              <div className="full settings-save" style={{ marginTop: '14px' }}>
                <Button variant="primary" type="submit">
                  💾 Save Proposal Settings
                </Button>
              </div>
            </form>
          </div>

          {/* Section 4: Interactive A4 Proposal Sheet Preview */}
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
                  <Button variant="primary" size="xs" onClick={() => setIsPropPreviewOpen(true)}>
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
                  <Button variant="primary" onClick={() => setIsPropPreviewOpen(true)}>
                    👁️ Fullscreen A4 Preview
                  </Button>
                  <Button variant="light" onClick={handleDownloadProposal}>
                    📄 Download A4 Proposal
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
          MODULE 03: Invoice Template & Bank Settings
         ========================================================================= */}
      {activeTab === 'invoice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Invoice Form Card */}
          <div className="settings-card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#0b4b8f', fontWeight: '800' }}>
                  🧾 Invoice Layout, Branding &amp; Bank Settings
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Configure company header details, invoice numbering prefix, bank account credentials, notes, and layout across all generated invoices.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button variant="light" size="xs" onClick={() => setShowInvPreview(!showInvPreview)}>
                  👁️ {showInvPreview ? 'Hide Invoice Preview' : 'Show Invoice Preview'}
                </Button>
                <Button variant="primary" size="xs" onClick={handleSaveAllSettings}>
                  💾 Save Invoice Settings
                </Button>
              </div>
            </div>

            <form onSubmit={handleSaveAllSettings} className="settings-form-grid enter-flow" autoComplete="off">
              {/* Section 1: Provider Identity on Invoices */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '2px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🏢 1. Provider Identity on Invoices (Top Header)
                </span>
              </div>

              <div>
                <label>Company / Brand Name <span className="req">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. iSysware"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div>
                <label>Tagline / Services Subtitle</label>
                <input
                  className="input"
                  placeholder="e.g. ERP • Custom Software • Web • AI Solutions"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>

              <div>
                <label>Inquiry Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="e.g. info@isysware.com"
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                />
              </div>

              <div>
                <label>Support / Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="e.g. +92 314 8843707"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                />
              </div>

              <div>
                <label>Official Website</label>
                <input
                  className="input"
                  placeholder="e.g. isysware.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>

              <div>
                <label>Invoice Subtitle (Right Top)</label>
                <input
                  className="input"
                  placeholder="e.g. Professional Services Invoice"
                  value={invoiceSubtitle}
                  onChange={(e) => setInvoiceSubtitle(e.target.value)}
                />
              </div>

              {/* Section 2: Numbering & Defaults */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '14px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔢 2. Numbering &amp; Billing Defaults
                </span>
              </div>

              <div>
                <label>Invoice Number Prefix</label>
                <input
                  className="input"
                  placeholder="e.g. ISW- or INV-"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </div>

              <div>
                <label>Default Currency</label>
                <select
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
                  className="input"
                  type="number"
                  min="0"
                  max="365"
                  placeholder="0"
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                />
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                  0 = Due on receipt
                </div>
              </div>

              {/* Section 3: Bank & Payment Credentials */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '14px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🏦 3. Bank &amp; Payment Credentials (Bottom Left Box)
                </span>
              </div>

              <div>
                <label>Payment Method</label>
                <input
                  className="input"
                  placeholder="e.g. Bank Transfer / Online / Cash"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
              </div>

              <div>
                <label>Bank / Wallet Name</label>
                <input
                  className="input"
                  placeholder="e.g. Meezan Bank / HBL / Bank Alfalah"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div>
                <label>Account Title</label>
                <input
                  className="input"
                  placeholder="e.g. iSysware Software Solution"
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                />
              </div>

              <div>
                <label>Account Number / IBAN</label>
                <input
                  className="input"
                  placeholder="e.g. PK36MEZN00012345678901"
                  value={accountIban}
                  onChange={(e) => setAccountIban(e.target.value)}
                />
              </div>

              {/* Section 4: Notes & Signatures */}
              <div className="full" style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginTop: '14px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '750', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📝 4. Notes, Signature &amp; Footer Text
                </span>
              </div>

              <div>
                <label>Prepared By Name</label>
                <input
                  className="input"
                  placeholder="e.g. iSysware"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                />
              </div>

              <div>
                <label>Thank You Footer Text</label>
                <input
                  className="input"
                  placeholder="e.g. Thank you for choosing iSysware. • Please reference the invoice number when making payment."
                  value={thankYouMsg}
                  onChange={(e) => setThankYouMsg(e.target.value)}
                />
              </div>

              <div className="full">
                <label>Default Notes / Terms (Bottom Left Box)</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Add payment terms, renewal note, support period, milestone details, tax note, or any client-specific instructions."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                />
              </div>

              <div className="full settings-save" style={{ marginTop: '14px' }}>
                <Button variant="primary" type="submit">
                  💾 Save Invoice Settings
                </Button>
              </div>
            </form>
          </div>

          {/* Live Corporate Invoice Preview Card */}
          {showInvPreview && (
            <div className="proposal-builder-card">
              <div className="prop-card-header">
                <div>
                  <h3 style={{ color: '#0b4b8f' }}>
                    <span>🧾 Live Corporate Invoice Layout Preview</span>
                  </h3>
                  <p>Shows the exact invoice format rendered across all modules, client downloads, and WhatsApp delivery.</p>
                </div>
                <div className="prop-btn-group">
                  <Button variant="light" size="xs" onClick={handleDownloadSampleInvoice}>
                    📄 Download Sample PDF
                  </Button>
                  <Button variant="primary" size="xs" onClick={() => setIsInvPreviewOpen(true)}>
                    👁️ Fullscreen Preview
                  </Button>
                </div>
              </div>

              {/* Embedded Exact Invoice Layout */}
              <div className="embedded-a4-wrapper" style={{ background: '#e2e8f0', padding: '16px' }}>
                <div style={{ background: '#ffffff', maxWidth: '800px', margin: '0 auto', padding: '24px 28px', borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                  {/* Top Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h1 style={{ fontSize: '24px', fontWeight: '850', color: '#0b4b8f', margin: '0 0 2px', letterSpacing: '-0.5px' }}>
                        {companyName || 'iSysware'}
                      </h1>
                      <div style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px' }}>
                        {tagline || 'ERP • Custom Software • Web • AI Solutions'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#0284c7' }}>
                        {[inquiryEmail || 'info@isysware.com', supportPhone || '+92 314 8843707', websiteUrl || 'isysware.com'].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '1px', lineHeight: '1' }}>
                        INVOICE
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {invoiceSubtitle || 'Professional Services Invoice'}
                      </div>
                    </div>
                  </div>

                  {/* Blue Top Divider */}
                  <div style={{ height: '3px', background: '#0b4b8f', marginTop: '8px', marginBottom: '14px', borderRadius: '2px' }} />

                  {/* 4-Column Meta Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px', background: '#ffffff' }}>
                    <div style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        INVOICE NO.
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>
                        {invoicePrefix || 'ISW-'}0001
                      </div>
                    </div>
                    <div style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        ISSUE DATE
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>
                        {today()}
                      </div>
                    </div>
                    <div style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        DUE DATE
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>
                        {today()}
                      </div>
                    </div>
                    <div style={{ padding: '6px 10px' }}>
                      <div style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
                        CURRENCY
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '750', color: '#0f172a' }}>
                        {currency}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Bill To & Service Details Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '16px', background: '#ffffff' }}>
                    <div style={{ padding: '10px 14px', borderRight: '1px solid #cbd5e1' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        BILL TO
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginBottom: '2px' }}>
                        {sampleCustomer.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        Contact: {sampleCustomer.contactPerson}
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        Email / Phone: {sampleCustomer.email} / {sampleCustomer.phone}
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        Billing Address: {sampleCustomer.address}
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        SERVICE DETAILS
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        <strong>Project / Service:</strong> Enterprise Software &amp; Cloud Billing
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        <strong>Service Type:</strong> Software Development &amp; Hosting
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        <strong>Billing Cycle:</strong> Monthly Retainer Cycle
                      </div>
                      <div style={{ fontSize: '11px', color: '#334155', lineHeight: '1.35' }}>
                        <strong>Service Period:</strong> {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
                      </div>
                    </div>
                  </div>

                  {/* Table: INVOICE ITEMS */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      INVOICE ITEMS
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#0b4b8f', color: '#ffffff', fontSize: '10.5px', fontWeight: '750', padding: '6px 8px', textAlign: 'center', width: '5%', border: '1px solid #0b4b8f' }}>#</th>
                          <th style={{ background: '#0b4b8f', color: '#ffffff', fontSize: '10.5px', fontWeight: '750', padding: '6px 8px', textAlign: 'left', width: '45%', border: '1px solid #0b4b8f' }}>Description</th>
                          <th style={{ background: '#0b4b8f', color: '#ffffff', fontSize: '10.5px', fontWeight: '750', padding: '6px 8px', textAlign: 'left', width: '25%', border: '1px solid #0b4b8f' }}>Billing Period / Milestone</th>
                          <th style={{ background: '#0b4b8f', color: '#ffffff', fontSize: '10.5px', fontWeight: '750', padding: '6px 8px', textAlign: 'center', width: '10%', border: '1px solid #0b4b8f' }}>Qty</th>
                          <th style={{ background: '#0b4b8f', color: '#ffffff', fontSize: '10.5px', fontWeight: '750', padding: '6px 8px', textAlign: 'right', width: '15%', border: '1px solid #0b4b8f' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleInvoiceObject.items.map((x, idx) => (
                          <tr key={x.itemId || idx} style={{ background: idx % 2 === 1 ? '#fafcff' : '#ffffff' }}>
                            <td style={{ fontSize: '11px', padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ fontSize: '11px', padding: '6px 8px', border: '1px solid #e2e8f0' }}>
                              <strong>{x.name}</strong>
                            </td>
                            <td style={{ fontSize: '11px', padding: '6px 8px', border: '1px solid #e2e8f0' }}>{x.period}</td>
                            <td style={{ fontSize: '11px', padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{x.qty}</td>
                            <td style={{ fontSize: '11px', padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700' }}>
                              {money(x.amount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom 2-Column Section */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '14px', marginBottom: '16px' }}>
                    {/* Left: Payment Details & Notes */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 12px', background: '#ffffff' }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>
                        PAYMENT DETAILS
                      </div>
                      <div style={{ display: 'flex', fontSize: '10.5px', margin: '2px 0' }}>
                        <span style={{ width: '85px', fontWeight: '700', color: '#475569' }}>Method:</span>
                        <span style={{ flex: 1, fontWeight: '600', color: '#0f172a' }}>{paymentMethod || 'Bank Transfer / Online'}</span>
                      </div>
                      <div style={{ display: 'flex', fontSize: '10.5px', margin: '2px 0' }}>
                        <span style={{ width: '85px', fontWeight: '700', color: '#475569' }}>Account Title:</span>
                        <span style={{ flex: 1, fontWeight: '600', color: '#0f172a' }}>{accountTitle || 'iSysware Software Solution'}</span>
                      </div>
                      <div style={{ display: 'flex', fontSize: '10.5px', margin: '2px 0' }}>
                        <span style={{ width: '85px', fontWeight: '700', color: '#475569' }}>Bank / Wallet:</span>
                        <span style={{ flex: 1, fontWeight: '600', color: '#0f172a' }}>{bankName || 'Meezan Bank'}</span>
                      </div>
                      <div style={{ display: 'flex', fontSize: '10.5px', margin: '2px 0' }}>
                        <span style={{ width: '85px', fontWeight: '700', color: '#475569' }}>Account / IBAN:</span>
                        <span style={{ flex: 1, fontWeight: '600', color: '#0f172a', fontFamily: 'monospace' }}>{accountIban || 'PK36MEZN00012345678901'}</span>
                      </div>

                      <div style={{ fontSize: '10px', fontWeight: '800', color: '#0b4b8f', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginBottom: '3px' }}>
                        NOTES / TERMS
                      </div>
                      <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4' }}>
                        {invoiceNotes || 'Add payment terms, renewal note, support period, milestone details, tax note, or any client-specific instructions.'}
                      </div>
                    </div>

                    {/* Right: Summary */}
                    <div style={{ background: '#edf4fe', border: '1px solid #c7dcfb', borderRadius: '4px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px', color: '#334155' }}>
                        <span>Subtotal</span>
                        <strong>{money(60000, currency)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px', color: '#64748b' }}>
                        <span>Discount</span>
                        <span>[0.00]</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px', color: '#64748b' }}>
                        <span>Tax / VAT</span>
                        <span>[0.00]</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 2px', fontSize: '11.5px', fontWeight: '800', color: '#0f172a', borderTop: '1px solid #cbd5e1', marginTop: '4px' }}>
                        <span>TOTAL</span>
                        <strong>{money(60000, currency)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px', color: '#334155' }}>
                        <span>Paid</span>
                        <span>{money(0, currency)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 2px', fontSize: '13.5px', fontWeight: '900', color: '#0b4b8f', borderTop: '2px solid #0b4b8f', marginTop: '4px' }}>
                        <span>BALANCE DUE</span>
                        <span>{money(60000, currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '8px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '10.5px', color: '#475569' }}>
                      <strong>Prepared By:</strong> {preparedBy || companyName || 'iSysware'}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#475569' }}>
                      <strong>Authorized Signature:</strong> ______________________
                    </div>
                  </div>

                  {/* Footer Message */}
                  <div style={{ textAlign: 'center', fontSize: '10px', color: '#0b4b8f', fontWeight: '700', marginBottom: '6px' }}>
                    {thankYouMsg || `Thank you for choosing ${companyName || 'iSysware'}. • Please reference the invoice number when making payment.`}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                    {companyName || 'iSysware'} | {inquiryEmail || 'info@isysware.com'} | {supportPhone || '+92 314 8843707'} | {websiteUrl || 'isysware.com'}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="prop-actions-bar" style={{ marginTop: '16px' }}>
                <div className="prop-btn-group">
                  <Button variant="primary" onClick={() => setIsInvPreviewOpen(true)}>
                    👁️ Fullscreen Invoice Preview
                  </Button>
                  <Button variant="light" onClick={handleDownloadSampleInvoice}>
                    📄 Download Sample Invoice PDF
                  </Button>
                </div>
                <div>
                  <Button variant="primary" onClick={handleSaveAllSettings}>
                    💾 Save Invoice Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live A4 Proposal Preview Modal */}
      <ProposalPreviewModal
        isOpen={isPropPreviewOpen}
        onClose={() => setIsPropPreviewOpen(false)}
        proposal={currentProposalObject}
        business={{ currency }}
        customer={selectedCust}
      />

      {/* Live Invoice Preview Modal */}
      <InvoicePreview
        isOpen={isInvPreviewOpen}
        onClose={() => setIsInvPreviewOpen(false)}
        invoice={sampleInvoiceObject}
        business={sampleInvoiceBusiness}
        customer={sampleCustomer}
      />
    </section>
  );
}
