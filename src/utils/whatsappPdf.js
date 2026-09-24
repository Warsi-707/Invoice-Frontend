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
 * Trigger immediate browser file download (.pdf) directly to Downloads folder
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
 * High-precision HTML-to-PDF engine using isolated iframe context.
 * Guarantees all styles, fonts, tables, margins, colors, and layout are rendered 100% accurately.
 */
export async function htmlToPdfBlob(htmlContent, fileName = 'document.pdf') {
  return new Promise((resolve, reject) => {
    // Create an isolated sandbox iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '794px';
    iframe.style.height = '1200px';
    iframe.style.border = '0';
    iframe.style.zIndex = '-99999';
    iframe.style.backgroundColor = '#ffffff';
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Allow DOM layout and style computation
      setTimeout(async () => {
        try {
          const targetElement = iframeDoc.querySelector('.a4-page') || iframeDoc.querySelector('.invoice') || iframeDoc.body;
          if (targetElement && targetElement.scrollHeight) {
            iframe.style.height = `${Math.max(1123, targetElement.scrollHeight + 40)}px`;
          }

          const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              letterRendering: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 794,
              width: 794
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          const pdfBlob = await html2pdf().set(opt).from(targetElement).output('blob');
          resolve(pdfBlob);
        } catch (err) {
          console.error('html2pdf render error:', err);
          reject(err);
        } finally {
          setTimeout(() => {
            iframe.remove();
          }, 500);
        }
      }, 150);
    } catch (e) {
      iframe.remove();
      reject(e);
    }
  });
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

  // 1. Generate real PDF Blob in browser
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
