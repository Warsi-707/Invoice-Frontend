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

// Sleek Flat SVG Icons (no emojis, no bulky vectors)
const FlatIcons = {
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  building: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="22.01" />
      <line x1="15" y1="22" x2="15" y2="22.01" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
      <line x1="9" y1="18" x2="9" y2="18.01" />
      <line x1="15" y1="18" x2="15" y2="18.01" />
    </svg>
  ),
  invoice: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  proposal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  ),
  database: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  whatsapp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  save: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  eye: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  download: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  upload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
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
    getCustomer
  } = useApp();

  const fileInputRef = useRef(null);
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'org' | 'invoice' | 'proposal' | 'system' | 'whatsapp'

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

  // Invoice Settings State
  const [currency, setCurrency] = useState(state.settings?.currency || 'PKR');
  const [dueDays, setDueDays] = useState(state.settings?.dueDays ?? 0);
  const [bankName, setBankName] = useState(savedProp.bankName || 'Meezan Bank');
  const [accountTitle, setAccountTitle] = useState(savedProp.accountTitle || 'iSysware Software Solution');
  const [accountIban, setAccountIban] = useState(savedProp.accountIban || 'PK36MEZN00012345678901');
  const [invoicePrefix, setInvoicePrefix] = useState(savedProp.invoicePrefix || 'ISW-');
  const [paymentMethod, setPaymentMethod] = useState(savedProp.paymentMethod || 'Bank Transfer / Online');
  const [invoiceSubtitle, setInvoiceSubtitle] = useState(savedProp.invoiceSubtitle || 'Professional Services Invoice');
  const [preparedBy, setPreparedBy] = useState(savedProp.preparedBy || savedProp.companyName || 'iSysware');
  const [thankYouMsg, setThankYouMsg] = useState(savedProp.thankYouMsg || 'Thank you for choosing iSysware. • Please reference the invoice number when making payment.');
  const [invoiceNotes, setInvoiceNotes] = useState(savedProp.invoiceNotes || 'Add payment terms, renewal note, support period, milestone details, tax note, or any client-specific instructions.');

  // Preview Modal States
  const [isPropPreviewOpen, setIsPropPreviewOpen] = useState(false);
  const [isInvPreviewOpen, setIsInvPreviewOpen] = useState(false);

  useEffect(() => {
    setAdminUser(state.settings?.admin || 'Administrator');
    setAdminPass(state.settings?.password || 'admin123');
    setCurrency(state.settings?.currency || 'PKR');
    setDueDays(state.settings?.dueDays ?? 0);

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
      footerNote: invoiceNotes.trim(),
      proposalData: proposalDataPayload
    });

    showToast('Settings saved successfully.');
  };

  // Sample Invoice Object for Preview
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

  // Sample Proposal Object for Preview
  const sampleProposalObject = {
    title: 'Enterprise Software & Cloud Automation',
    proposalNo: `PROP-${new Date().getFullYear()}-0001`,
    date: today(),
    validity: `${validityDays || 14} Days`,
    validityDays: Number(validityDays || 14),
    summary: 'We are pleased to submit this commercial proposal for enterprise cloud software deployment, tailored database architecture, and automated collections infrastructure.',
    items: [
      { id: '1', name: 'Enterprise Cloud System & Database Architecture', desc: 'Complete backend API and high-availability database cluster setup', qty: 1, price: 65000, discount: 0, taxPct: 0 },
      { id: '2', name: 'Automated Invoice & WhatsApp Billing Gateway', desc: 'Real-time client ledger sync and automated document dispatch', qty: 1, price: 35000, discount: 0, taxPct: 0 }
    ],
    subtotal: 100000,
    discount: 0,
    taxPct: 0,
    taxAmount: 0,
    total: 100000,
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
    clientName: 'Al-Falah Textiles Ltd',
    clientCompany: 'Al-Falah Group'
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
    <section id="settings" className="page active" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Unified Settings Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#0b4b8f', display: 'flex', alignItems: 'center' }}>{FlatIcons.settings}</span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              Settings &amp; System Configuration
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
            Manage organization identity, invoice branding, bank credentials, proposal letterhead, and cloud database.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button variant="light" size="sm" onClick={() => setIsInvPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>{FlatIcons.eye}</span>
            <span>Invoice Preview</span>
          </Button>
          <Button variant="light" size="sm" onClick={() => setIsPropPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>{FlatIcons.eye}</span>
            <span>Proposal Preview</span>
          </Button>
          <Button variant="primary" size="sm" onClick={handleSaveAllSettings} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>{FlatIcons.save}</span>
            <span>Save All Settings</span>
          </Button>
        </div>
      </div>

      {/* Flat Section Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { id: 'all', label: 'All Settings', icon: FlatIcons.settings },
          { id: 'org', label: 'Organization Identity', icon: FlatIcons.building },
          { id: 'invoice', label: 'Invoice & Banking', icon: FlatIcons.invoice },
          { id: 'proposal', label: 'Proposal & Letterhead', icon: FlatIcons.proposal },
          { id: 'system', label: 'System & Database', icon: FlatIcons.database },
          { id: 'whatsapp', label: 'WhatsApp Service', icon: FlatIcons.whatsapp }
        ].map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActiveSection(sec.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              border: activeSection === sec.id ? '1px solid #0b4b8f' : '1px solid #cbd5e1',
              background: activeSection === sec.id ? '#0b4b8f' : '#ffffff',
              color: activeSection === sec.id ? '#ffffff' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{sec.icon}</span>
            <span>{sec.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSaveAllSettings} autoComplete="off">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* SECTION 1: Organization Identity & Corporate Profile */}
          {(activeSection === 'all' || activeSection === 'org') && (
            <div className="settings-card" style={{ padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ color: '#0b4b8f', display: 'flex', alignItems: 'center' }}>{FlatIcons.building}</span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0b4b8f' }}>
                  1. Organization Identity &amp; Corporate Profile
                </h3>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>
                This identity is used as the top header brand name across all generated Invoices, Quotations, and Proposals.
              </p>

              <div className="settings-form-grid enter-flow">
                <div>
                  <label>Company / Brand Name <span className="req">*</span></label>
                  <input
                    className="input"
                    placeholder="e.g. iSysware Software Solution"
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

                <div className="full">
                  <label>Registered Office Address</label>
                  <input
                    className="input"
                    placeholder="e.g. Suite 402, Business Avenue, Karachi, Pakistan"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label>NTN / Tax Registration / STRN</label>
                  <input
                    className="input"
                    placeholder="e.g. NTN: 646383-1"
                    value={ntnTax}
                    onChange={(e) => setNtnTax(e.target.value)}
                  />
                </div>

                <div>
                  <label>Official Support Phone</label>
                  <input
                    type="tel"
                    className="input phone11"
                    placeholder="e.g. +92 314 8843707"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(cleanPhoneInput(e.target.value))}
                  />
                </div>

                <div>
                  <label>Inquiry Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="e.g. info@isysware.com"
                    value={inquiryEmail}
                    onChange={(e) => setInquiryEmail(e.target.value)}
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
              </div>
            </div>
          )}

          {/* SECTION 2: Invoice Layout, Defaults & Bank Credentials */}
          {(activeSection === 'all' || activeSection === 'invoice') && (
            <div className="settings-card" style={{ padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0b4b8f', display: 'flex', alignItems: 'center' }}>{FlatIcons.invoice}</span>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0b4b8f' }}>
                    2. Invoice Layout, Defaults &amp; Bank Credentials
                  </h3>
                </div>
                <Button variant="light" size="xs" onClick={() => setIsInvPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>{FlatIcons.eye}</span>
                  <span>Preview Layout</span>
                </Button>
              </div>

              <div className="settings-form-grid enter-flow">
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
                    type="number"
                    min="0"
                    max="365"
                    className="input"
                    placeholder="0"
                    value={dueDays}
                    onChange={(e) => setDueDays(e.target.value)}
                  />
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                    0 = Due immediately upon receipt
                  </div>
                </div>

                <div>
                  <label>Invoice Subtitle (Top Right)</label>
                  <input
                    className="input"
                    placeholder="e.g. Professional Services Invoice"
                    value={invoiceSubtitle}
                    onChange={(e) => setInvoiceSubtitle(e.target.value)}
                  />
                </div>

                <div>
                  <label>Payment Method</label>
                  <input
                    className="input"
                    placeholder="e.g. Bank Transfer / Online"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                </div>

                <div>
                  <label>Bank / Wallet Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Meezan Bank / HBL"
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

                <div>
                  <label>Prepared By</label>
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
                    placeholder="e.g. Thank you for choosing iSysware."
                    value={thankYouMsg}
                    onChange={(e) => setThankYouMsg(e.target.value)}
                  />
                </div>

                <div className="full">
                  <label>Default Invoice Notes &amp; Payment Terms</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="Add payment terms, renewal note, support period, milestone details, or client-specific instructions."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Proposal & Letterhead Profile */}
          {(activeSection === 'all' || activeSection === 'proposal') && (
            <div className="settings-card" style={{ padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#0b4b8f', display: 'flex', alignItems: 'center' }}>{FlatIcons.proposal}</span>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0b4b8f' }}>
                    3. Commercial Proposal &amp; Letterhead Profile
                  </h3>
                </div>
                <Button variant="light" size="xs" onClick={() => setIsPropPreviewOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>{FlatIcons.eye}</span>
                  <span>Preview Proposal</span>
                </Button>
              </div>

              <div className="settings-form-grid enter-flow">
                <div>
                  <label>Authorized Signatory Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Khuzaima Warsi"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                  />
                </div>

                <div>
                  <label>Signatory Official Designation</label>
                  <input
                    className="input"
                    placeholder="e.g. Managing Director / CEO"
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

                <div className="full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Standard Proposal Terms &amp; Clauses</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset1)} style={{ padding: '2px 8px', fontSize: '11px' }}>
                        Preset 1 (Milestones)
                      </button>
                      <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset2)} style={{ padding: '2px 8px', fontSize: '11px' }}>
                        Preset 2 (Retainer)
                      </button>
                      <button type="button" className="preset-chip-btn" onClick={() => setPropTerms(PRESET_TERMS.preset3)} style={{ padding: '2px 8px', fontSize: '11px' }}>
                        Preset 3 (Hardware)
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={propTerms}
                    onChange={(e) => setPropTerms(e.target.value)}
                    placeholder="Enter standard commercial terms & conditions..."
                    style={{ fontSize: '12px', lineHeight: '1.45' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4 & 5: System Admin, Database Cloud Backup & WhatsApp Integration */}
          {(activeSection === 'all' || activeSection === 'system' || activeSection === 'whatsapp') && (
            <div style={{ display: 'grid', gridTemplateColumns: activeSection === 'all' ? '1fr 1fr' : '1fr', gap: '22px' }}>

              {/* System Credentials & Neon PostgreSQL Backup */}
              {(activeSection === 'all' || activeSection === 'system') && (
                <div className="settings-card" style={{ padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <span style={{ color: '#0b4b8f', display: 'flex', alignItems: 'center' }}>{FlatIcons.database}</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0b4b8f' }}>
                      4. System Credentials &amp; Database Backup
                    </h3>
                  </div>

                  <div className="settings-form-grid enter-flow" style={{ marginBottom: '16px' }}>
                    <div>
                      <label>Admin Username <span className="req">*</span></label>
                      <input
                        className="input"
                        placeholder="Administrator"
                        value={adminUser}
                        onChange={(e) => setAdminUser(e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Admin Login Password <span className="req">*</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="admin123"
                        value={adminPass}
                        onChange={(e) => setAdminPass(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Database Summary (Neon PostgreSQL)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                      <div>Businesses: <strong>{businessCount}</strong></div>
                      <div>Clients: <strong>{customerCount}</strong></div>
                      <div>Invoices: <strong>{invoiceCount}</strong></div>
                      <div>Payments: <strong>{paymentCount}</strong></div>
                      <div>Reversals: <strong>{reversalCount}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button variant="light" size="xs" onClick={backupData} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{FlatIcons.download}</span>
                      <span>Backup JSON</span>
                    </Button>
                    <Button variant="light" size="xs" onClick={() => fileInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{FlatIcons.upload}</span>
                      <span>Restore JSON</span>
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      style={{ display: 'none' }}
                      onChange={handleRestoreFileChange}
                    />
                    <Button variant="danger" size="xs" onClick={clearAllData} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>{FlatIcons.trash}</span>
                      <span>Reset Data</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* WhatsApp Automatic Delivery */}
              {(activeSection === 'all' || activeSection === 'whatsapp') && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <WhatsAppScannerCard isStandalone={false} />
                </div>
              )}
            </div>
          )}

          {/* Bottom Save Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <Button variant="primary" type="submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 20px' }}>
              <span>{FlatIcons.save}</span>
              <span>Save All Settings</span>
            </Button>
          </div>

        </div>
      </form>

      {/* Invoice Preview Modal */}
      <InvoicePreview
        isOpen={isInvPreviewOpen}
        onClose={() => setIsInvPreviewOpen(false)}
        invoice={sampleInvoiceObject}
        business={sampleInvoiceBusiness}
        customer={sampleCustomer}
      />

      {/* Proposal Preview Modal */}
      <ProposalPreviewModal
        isOpen={isPropPreviewOpen}
        onClose={() => setIsPropPreviewOpen(false)}
        proposal={sampleProposalObject}
        business={sampleInvoiceBusiness}
        customer={sampleCustomer}
      />
    </section>
  );
}
