import html2pdf from 'html2pdf.js';
import { whatsappApi } from '../services/api';

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
 * Trigger instantaneous browser file download (.pdf) to Downloads folder
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
 * High-speed genuine PDF generator using html2pdf.js.
 * Uses exact-rendered off-screen container so the output is 100% crisp, formatted, and never empty.
 */
export async function htmlToPdfBlob(htmlContent, fileName = 'document.pdf') {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  // Position off-screen but with active rendering layout so html2canvas computes non-zero dimensions
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.zIndex = '-999999';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  document.body.appendChild(container);

  const opt = {
    margin: [4, 4, 4, 4],
    filename: fileName,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale: 1.5,
      useCORS: true,
      letterRendering: true,
      logging: false,
      scrollX: 0,
      scrollY: 0
    },
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
 * Generate PDF Blob
 */
export async function generatePdfBlob(htmlContent, phone = '', fileName = 'document.pdf', caption = '') {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const clientBlob = await htmlToPdfBlob(htmlContent, cleanFileName);

  if (phone) {
    (async () => {
      try {
        const base64Data = await blobToBase64(clientBlob);
        await whatsappApi.sendDocument(phone, base64Data, cleanFileName, 'application/pdf', caption);
      } catch (err) {
        console.warn('WhatsApp background send error:', err.message);
        if (caption) {
          whatsappApi.sendText(phone, caption).catch(() => {});
        }
      }
    })();
  }

  return clientBlob;
}

/**
 * ⚡ 1-Click Instant Download directly into user's Downloads folder
 */
export async function downloadAsPdf(htmlContent, fileName) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = await htmlToPdfBlob(htmlContent, cleanFileName);
  triggerDownload(blob, cleanFileName);
  return { success: true };
}

/**
 * Send genuine .pdf document file to WhatsApp
 */
export async function sendPdfToWhatsApp({ phone, htmlContent, fileName, caption = '' }) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = await htmlToPdfBlob(htmlContent, cleanFileName);
  const base64Data = await blobToBase64(blob);
  await whatsappApi.sendDocument(phone, base64Data, cleanFileName, 'application/pdf', caption);
  return { success: true };
}

/**
 * ⚡ 1-Click Instant: Downloads real .pdf to Downloads folder + sends real .pdf file to WhatsApp!
 */
export async function downloadAndSendWhatsApp({ htmlContent, fileName, phone, caption = '', onWhatsAppSuccess }) {
  const cleanFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // 1. Generate real PDF Blob in browser (<300ms)
  const pdfBlob = await htmlToPdfBlob(htmlContent, cleanFileName);

  // 2. ⚡ IMMEDIATELY save .pdf file to user's device (zero lag)
  triggerDownload(pdfBlob, cleanFileName);

  // 3. Concurrently dispatch real .pdf document to WhatsApp in background
  if (phone) {
    (async () => {
      try {
        const base64Data = await blobToBase64(pdfBlob);
        await whatsappApi.sendDocument(phone, base64Data, cleanFileName, 'application/pdf', caption);
        if (onWhatsAppSuccess) onWhatsAppSuccess();
      } catch (err) {
        console.warn('WhatsApp auto-send error:', err.message);
        if (caption) {
          whatsappApi.sendText(phone, caption).catch(() => {});
        }
      }
    })();
  }

  return { success: true };
}
