import html2pdf from 'html2pdf.js';
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
 * Convert Blob to base64 string
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result || '').toString();
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64 || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Trigger immediate browser file download (.pdf)
 */
function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

/**
 * Client-side genuine PDF generator using html2pdf.js (A4 high-resolution PDF Blob)
 */
export async function htmlToPdfBlob(htmlContent, fileName = 'document.pdf') {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#000000';
  document.body.appendChild(container);

  const opt = {
    margin: [4, 4, 4, 4],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
    return pdfBlob;
  } finally {
    container.remove();
  }
}

/**
 * Generate PDF Blob:
 * 1. Tries ultra-fast backend Puppeteer renderer.
 * 2. If backend Chrome is missing or fails, seamlessly renders genuine A4 PDF in browser via html2pdf.
 * 3. If phone is provided, delivers genuine PDF document file directly to WhatsApp.
 */
export async function generatePdfBlob(htmlContent, phone = '', fileName = 'document.pdf', caption = '') {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const token = getToken();

  // Attempt 1: Fast Backend Rendering
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = { html: htmlContent };
    if (phone) {
      payload.phone = phone;
      payload.fileName = cleanFileName;
      payload.caption = caption;
    }

    const response = await fetch(`${API_BASE}/pdf/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 100) {
        return blob;
      }
    }
  } catch (backendErr) {
    console.warn('Backend PDF endpoint error, switching to browser html2pdf:', backendErr.message);
  }

  // Attempt 2: High-Quality Client-Side PDF Generation
  const clientBlob = await htmlToPdfBlob(htmlContent, cleanFileName);

  // If recipient phone is provided, send the actual PDF document file to WhatsApp
  if (phone) {
    try {
      const base64Data = await blobToBase64(clientBlob);
      await whatsappApi.sendDocument(phone, base64Data, cleanFileName, 'application/pdf', caption);
    } catch (waErr) {
      console.warn('WhatsApp document dispatch error:', waErr.message);
      // If document send fails, fallback to sending message text
      if (caption) {
        await whatsappApi.sendText(phone, caption).catch(() => {});
      }
    }
  }

  return clientBlob;
}

/**
 * Auto-download a genuine PDF file directly to device Downloads folder
 */
export async function downloadAsPdf(htmlContent, fileName) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = await generatePdfBlob(htmlContent, '', cleanFileName);
  triggerDownload(blob, cleanFileName);
  return { success: true };
}

/**
 * Generate PDF and send genuine .pdf file to WhatsApp
 */
export async function sendPdfToWhatsApp({ phone, htmlContent, fileName, caption = '' }) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  await generatePdfBlob(htmlContent, phone, cleanFileName, caption);
  return { success: true };
}

/**
 * ⚡ Dual Action:
 * 1. Downloads genuine .pdf file directly to Downloads folder.
 * 2. Simultaneously sends genuine .pdf file to recipient's WhatsApp chat.
 */
export async function downloadAndSendWhatsApp({ htmlContent, fileName, phone, caption = '', onWhatsAppSuccess }) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // 1. Generate PDF and dispatch to WhatsApp
  const pdfBlob = await generatePdfBlob(htmlContent, phone, cleanFileName, caption);

  // 2. Automatically save .pdf file to device downloads folder
  triggerDownload(pdfBlob, cleanFileName);

  if (phone && onWhatsAppSuccess) {
    onWhatsAppSuccess();
  }

  return { success: true };
}
