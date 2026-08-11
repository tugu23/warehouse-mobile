import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order } from '@/types';

/**
 * Copy type for printTwoCopies feature
 * - 'original': First copy with QR/lottery
 * - 'duplicate': Second copy without QR/lottery (or with different settings)
 */
export type CopyType = 'original' | 'duplicate';

export interface OrderReceiptData {
  orderId: number;
  order?: Order;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: string;
  eReceiptNumber?: string; // Lottery number
  eReceiptId?: string;
  qrBase64?: string; // QR code image (from backend)
  copyType?: CopyType; // For printTwoCopies feature
}

/**
 * Generate HTML receipt for printing
 * @param data - Receipt data including optional qrBase64 and copyType
 * @param options - Optional settings for copy type and QR display
 */
const generateReceiptHtml = (
  data: OrderReceiptData,
  options?: { showQr?: boolean; showLottery?: boolean }
): string => {
  const date = new Date().toLocaleDateString('mn-MN');
  const time = new Date().toLocaleTimeString('mn-MN');

  // Determine what to show based on copy type or options
  const isOriginal = data.copyType === 'original' || !data.copyType;
  const showQr = options?.showQr ?? (isOriginal || !data.copyType);
  const showLottery = options?.showLottery ?? (isOriginal || !data.copyType);

  // Copy label for printTwoCopies feature
  const copyLabel = data.copyType === 'duplicate' ? '2-р ХУВЬ' : data.copyType === 'original' ? '1-р ХУВЬ' : '';

  const itemsHtml = data.items
    .map(
      (item, index) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₮${item.unitPrice.toLocaleString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₮${item.subtotal.toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Баримт #${data.orderId}${copyLabel ? ` - ${copyLabel}` : ''}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #333;
          padding: 16px;
          max-width: 400px;
          margin: 0 auto;
          background: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px dashed #ddd;
        }
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
          color: #1a56db;
        }
        .company-subtitle {
          font-size: 12px;
          color: #666;
        }
        .copy-label {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }
        .info-section {
          margin-bottom: 16px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 13px;
        }
        .info-label {
          font-weight: 600;
          color: #555;
        }
        .info-value {
          text-align: right;
          color: #333;
        }
        .customer-section {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .customer-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        th {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          border-bottom: 2px solid #ddd;
          padding: 10px 4px;
          background: #f8f9fa;
        }
        td {
          padding: 10px 4px;
          font-size: 13px;
        }
        .totals {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 2px solid #ddd;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .grand-total {
          font-size: 18px;
          font-weight: bold;
          color: #1a56db;
          padding-top: 8px;
          border-top: 2px solid #333;
        }
        .footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 2px dashed #ddd;
        }
        .lottery-box {
          background: #fff3cd;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .lottery-label {
          font-size: 12px;
          color: #856404;
          margin-bottom: 4px;
        }
        .lottery-number {
          font-size: 20px;
          font-weight: bold;
          color: #856404;
          letter-spacing: 2px;
        }
        .qr-section {
          margin: 16px 0;
          text-align: center;
        }
        .qr-image {
          max-width: 150px;
          max-height: 150px;
        }
        .qr-label {
          font-size: 10px;
          color: #666;
          margin-top: 4px;
        }
        .thank-you {
          font-size: 14px;
          color: #666;
          margin-top: 16px;
        }
        @media print {
          body {
            padding: 0;
            max-width: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">Жи Эл Эф ХХК</div>
        <div class="company-subtitle">Агуулахын бараа бүртгэлийн систем</div>
        ${copyLabel ? `<div class="copy-label">${copyLabel}</div>` : ''}
      </div>

      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Баримт №:</span>
          <span class="info-value">${data.orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Огноо:</span>
          <span class="info-value">${date} ${time}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ТТД:</span>
          <span class="info-value">5001001234</span>
        </div>
        <div class="info-row">
          <span class="info-label">Төлбөр:</span>
          <span class="info-value">${data.paymentMethod}</span>
        </div>
      </div>

      <div class="customer-section">
        <div class="customer-name">${data.customerName}</div>
        ${data.customerPhone ? `<div style="font-size: 12px; color: #666;">Утас: ${data.customerPhone}</div>` : ''}
        ${data.customerAddress ? `<div style="font-size: 12px; color: #666;">${data.customerAddress}</div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 10%;">№</th>
            <th style="width: 40%;">Бараа</th>
            <th style="width: 15%; text-align: center;">Т/ш</th>
            <th style="width: 15%; text-align: right;">Үнэ</th>
            <th style="width: 20%; text-align: right;">Дүн</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="5" style="text-align: center; color: #999; padding: 20px;">Барааны мэдээлэл байхгүй</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Нийт үнэ (НӨАТ-гүй):</span>
          <span>₮${(data.totalAmount - data.vatAmount).toLocaleString()}</span>
        </div>
        <div class="total-row">
          <span>НӨАТ (10%):</span>
          <span>₮${data.vatAmount.toLocaleString()}</span>
        </div>
        <div class="total-row grand-total">
          <span>БҮГД:</span>
          <span>₮${data.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div class="footer">
        ${showLottery && data.eReceiptNumber ? `
        <div class="lottery-box">
          <div class="lottery-label">И-Баримт баталгаажлаа / Lottery</div>
          <div class="lottery-number">${data.eReceiptNumber}</div>
        </div>
        ` : ''}
        ${showQr && data.qrBase64 ? `
        <div class="qr-section">
          <img src="${data.qrBase64}" class="qr-image" alt="QR Code" />
          <div class="qr-label">QR Код / QR Code</div>
        </div>
        ` : ''}
        <div class="thank-you">Баярлалаа / Thank you</div>
        <div style="font-size: 10px; color: #999; margin-top: 8px;">
          Жи Эл Эф ХХК • info@jeleph.mn
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print receipt using native print dialog
 * @param data - Receipt data
 * @param options - Print options
 * @param options.printTwoCopies - Whether to print two copies (B2B: 1st with QR, 2nd without; B2C: 1st with lottery, 2nd without)
 * @param options.isB2B - Whether this is a B2B transaction (affects duplicate copy content)
 */
export const printReceipt = async (
  data: OrderReceiptData,
  options?: { printTwoCopies?: boolean; isB2B?: boolean }
): Promise<void> => {
  try {
    const printTwoCopies = options?.printTwoCopies ?? false;

    if (printTwoCopies) {
      // Print two copies sequentially
      // Copy 1: Original with QR and/or lottery
      await printSingleReceipt(data, { copyType: 'original' });

      // Copy 2: Duplicate without QR (B2B) or without lottery (B2C)
      const duplicateData: OrderReceiptData = {
        ...data,
        copyType: 'duplicate',
        // B2B: hide QR, keep lottery
        // B2C: hide lottery, keep QR (if available)
        eReceiptNumber: options?.isB2B ? data.eReceiptNumber : undefined,
        qrBase64: options?.isB2B ? data.qrBase64 : undefined,
      };
      await printSingleReceipt(duplicateData);
    } else {
      // Print single copy
      await printSingleReceipt(data);
    }
  } catch (error: any) {
    console.error('Print error:', error);
    throw new Error('Хэвлэхэд алдаа гарлаа');
  }
};

/**
 * Print a single receipt (internal helper)
 */
const printSingleReceipt = async (
  data: OrderReceiptData,
  options?: { copyType?: CopyType; showQr?: boolean; showLottery?: boolean }
): Promise<void> => {
  const html = generateReceiptHtml(data, {
    showQr: options?.showQr,
    showLottery: options?.showLottery,
  });

  // Try to check printer availability (expo-print 6.0+)
  // If not available, just try to print directly
  let hasPrinter = false;

  if (typeof Print.getAvailablePrintersAsync === 'function') {
    try {
      const { available } = await Print.getAvailablePrintersAsync();
      hasPrinter = available;
    } catch {
      // Ignore printer check errors
    }
  }

  // Print directly - if no printer, it will show share dialog as fallback
  await Print.printAsync({ html });
};

/**
 * Preview receipt (returns HTML for WebView or similar)
 */
export const getReceiptHtml = (
  data: OrderReceiptData,
  options?: { showQr?: boolean; showLottery?: boolean }
): string => {
  return generateReceiptHtml(data, options);
};

/**
 * Share receipt as PDF
 */
export const shareReceipt = async (
  data: OrderReceiptData,
  options?: { printTwoCopies?: boolean; isB2B?: boolean }
): Promise<void> => {
  try {
    const printTwoCopies = options?.printTwoCopies ?? false;

    if (printTwoCopies) {
      // For sharing, we'll create a combined PDF with both copies
      const copy1Html = generateReceiptHtml(data, { showQr: true, showLottery: true });
      const copy2Data: OrderReceiptData = {
        ...data,
        copyType: 'duplicate',
        eReceiptNumber: options?.isB2B ? data.eReceiptNumber : undefined,
        qrBase64: options?.isB2B ? data.qrBase64 : undefined,
      };
      const copy2Html = generateReceiptHtml(copy2Data);

      // Create combined HTML with page breaks
      const combinedHtml = `
        <html>
          <head>
            <style>
              @media print {
                .page-break { page-break-before: always; }
              }
            </style>
          </head>
          <body>
            ${copy1Html}
            <div class="page-break"></div>
            ${copy2Html}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: combinedHtml,
        fileName: `receipt-${data.orderId}-double`,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Баримт #${data.orderId}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      const html = generateReceiptHtml(data);

      const { uri } = await Print.printToFileAsync({
        html,
        fileName: `receipt-${data.orderId}`,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Баримт #${data.orderId}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (error) {
    console.error('Share error:', error);
    throw new Error('Хуваалцахад алдаа гарлаа');
  }
};

export default {
  printReceipt,
  getReceiptHtml,
  shareReceipt,
};
