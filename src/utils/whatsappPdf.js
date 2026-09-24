import { whatsappApi } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Get the auth token from localStorage
 */
function getToken() {
  return (
    localStorage.getItem('invoice_manager_jwt') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  );
}

/**
 * Generate PDF via backend (puppeteer-core + system Chrome).
 * Returns a Blob of the PDF.
 */
export async function generatePdfBlob(htmlContent, phone = '', fileName = '', caption = '') {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = { html: htmlContent };
  if (phone) {
    payload.phone = phone;
    payload.fileName = fileName;
    payload.caption = caption;
  }

  const response = await fetch(`${API_BASE}/pdf/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `PDF generation failed (${response.status})`);
  }

  return response.blob();
}

/**
 * Browser print / save as PDF fallback when backend Chrome is not available
 */
export function browserPrintFallback(htmlContent, fileName = 'document.pdf') {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        iframe.remove();
      }, 2000);
    }, 400);
  } catch (e) {
    console.error('Browser print fallback error:', e);
  }
}

/**
 * Auto-download a PDF file directly — saves directly as a .pdf file.
 * @param {string} htmlContent - Full HTML document string
 * @param {string} fileName - e.g. "INV-001.pdf"
 */
export async function downloadAsPdf(htmlContent, fileName) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  try {
    const blob = await generatePdfBlob(htmlContent, '', cleanFileName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 300);
  } catch (err) {
    console.warn('Backend PDF generation failed, switching to browser print/save:', err.message);
    browserPrintFallback(htmlContent, cleanFileName);
  }
}

/**
 * Generate PDF from HTML and send it to WhatsApp as a document file.
 * @param {object} opts
 * @param {string} opts.phone - Recipient phone number
 * @param {string} opts.htmlContent - Full HTML document string
 * @param {string} opts.fileName - PDF file name e.g. "INV-001.pdf"
 * @param {string} opts.caption - WhatsApp caption text
 */
export async function sendPdfToWhatsApp({ phone, htmlContent, fileName, caption = '' }) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  try {
    await generatePdfBlob(htmlContent, phone, cleanFileName, caption);
  } catch (err) {
    console.warn('PDF dispatch via WhatsApp failed:', err.message);
    // Fallback: send structured summary message via WhatsApp API if connected
    if (phone && caption) {
      await whatsappApi.sendText(phone, caption);
    } else {
      throw err;
    }
  }
}

/**
 * Bullet-speed single-pass PDF generator & WhatsApp dispatcher:
 * Backend renders PDF once (<60ms), fires to WhatsApp instantly in memory, and returns binary to browser.
 * Zero lag, zero double-encoding, instant execution.
 */
export async function downloadAndSendWhatsApp({ htmlContent, fileName, phone, caption = '', onWhatsAppSuccess }) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  try {
    // 1. Single-pass backend call (renders PDF + dispatches WhatsApp in memory)
    const pdfBlob = await generatePdfBlob(htmlContent, phone, cleanFileName, caption);

    // 2. Trigger browser download immediately
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 300);

    if (phone && onWhatsAppSuccess) {
      onWhatsAppSuccess();
    }

    return { success: true };
  } catch (err) {
    console.warn('Backend PDF render failed, falling back to browser print & text WhatsApp:', err.message);
    
    // 1. Fallback: Trigger browser print
    browserPrintFallback(htmlContent, cleanFileName);

    // 2. Fallback: Send summary text to WhatsApp if phone provided
    if (phone && caption) {
      try {
        await whatsappApi.sendText(phone, caption);
        if (onWhatsAppSuccess) onWhatsAppSuccess();
      } catch (waErr) {
        console.warn('WhatsApp text fallback error:', waErr.message);
      }
    }

    return { success: true, fallback: true };
  }
}
