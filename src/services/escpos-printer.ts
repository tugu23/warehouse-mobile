import { Printer, PrintJob, EBarimtReceipt } from '@/types';

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const Commands = {
  // Initialization
  INIT: [ESC, 0x40],

  // Text alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Text formatting
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_HEIGHT_OFF: [GS, 0x21, 0x00],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x10],
  DOUBLE_WIDTH_OFF: [GS, 0x21, 0x00],
  DOUBLE_SIZE_ON: [GS, 0x21, 0x11],
  DOUBLE_SIZE_OFF: [GS, 0x21, 0x00],

  // Line spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  LINE_SPACING_SET: (n: number) => [ESC, 0x33, n],

  // Cut
  CUT: [GS, 0x56, 0x00],
  PARTIAL_CUT: [GS, 0x56, 0x01],

  // Cash drawer
  OPEN_CASH_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xfa],

  // Feed
  FEED_LINES: (n: number) => [ESC, 0x64, n],
  FEED_DOTS: (n: number) => [ESC, 0x4a, n],
};

/**
 * Encode string to bytes
 */
function encode(str: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(str));
}

/**
 * Convert ArrayBuffer to Array
 */
function bufferToArray(buffer: ArrayBuffer): number[] {
  return Array.from(new Uint8Array(buffer));
}

/**
 * Create a printer service for ESC/POS thermal printers
 */
export class EscPosPrintService {
  private printer: Printer | null = null;
  private device: any = null;

  constructor() {}

  /**
   * Connect to a printer
   */
  async connect(printer: Printer): Promise<boolean> {
    // In a real implementation, this would use react-native-ble-plx
    // For demo purposes, we simulate connection
    try {
      console.log(`Connecting to printer: ${printer.name} (${printer.address})`);
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.printer = printer;
      this.device = { connected: true, ...printer };
      return true;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  /**
   * Disconnect from the printer
   */
  async disconnect(): Promise<void> {
    if (this.device) {
      console.log('Disconnecting from printer');
      this.device = null;
      this.printer = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.device?.connected || false;
  }

  /**
   * Build a receipt in ESC/POS format
   */
  buildReceipt(receipt: EBarimtReceipt): number[] {
    const data: number[] = [];

    // Initialize printer
    data.push(...Commands.INIT);

    // Set line spacing
    data.push(...Commands.LINE_SPACING_SET(30));

    // Header - Company Name (centered, bold, double height)
    data.push(...Commands.ALIGN_CENTER);
    data.push(...Commands.BOLD_ON);
    data.push(...Commands.DOUBLE_HEIGHT_ON);
    data.push(...encode(receipt.companyName || 'OASIS WAREHOUSE'));
    data.push(LF);
    data.push(...Commands.DOUBLE_HEIGHT_OFF);

    // Company address
    data.push(...Commands.BOLD_OFF);
    data.push(...encode(receipt.companyAddress || 'Улаанбаатар хот'));
    data.push(LF);

    // Separator
    data.push(...encode('================================'));
    data.push(LF);

    // Receipt title
    data.push(...Commands.BOLD_ON);
    data.push(...encode(receipt.type === 'RETURN' ? 'БУЦААН ОЛГОСОН БАРАА' : 'Э-СИСТЕМИЙН БАРАА'));
    data.push(LF);
    data.push(...Commands.BOLD_OFF);

    data.push(...encode('БАРААНЫ БАРИМТ'));
    data.push(LF);

    // Separator
    data.push(...encode('================================'));
    data.push(LF);

    // Receipt info
    data.push(...Commands.ALIGN_LEFT);

    // Bill ID
    data.push(...encode(`Билл: ${receipt.billId}`));
    data.push(LF);

    // Date
    data.push(...encode(`Огноо: ${receipt.date}`));
    data.push(LF);

    // Time
    data.push(...encode(`Цаг: ${receipt.time || new Date().toLocaleTimeString('mn-MN')}`));
    data.push(LF);

    // Branch
    if (receipt.branchName) {
      data.push(...encode(`Салбар: ${receipt.branchName}`));
      data.push(LF);
    }

    // Cashier
    if (receipt.cashierName) {
      data.push(...encode(`Кассир: ${receipt.cashierName}`));
      data.push(LF);
    }

    // Separator
    data.push(...encode('--------------------------------'));
    data.push(LF);

    // Customer info (if B2B)
    if (receipt.customerNo) {
      data.push(...Commands.BOLD_ON);
      data.push(...encode(`Харилцагч: ${receipt.customerName || receipt.customerNo}`));
      data.push(LF);
      data.push(...Commands.BOLD_OFF);
      data.push(...encode(`Регистр: ${receipt.customerNo}`));
      data.push(LF);
      data.push(...encode('--------------------------------'));
      data.push(LF);
    }

    // Items header
    data.push(...Commands.BOLD_ON);
    data.push(...encode('Бараа                          Тоо   Үнэ'));
    data.push(LF);
    data.push(...Commands.BOLD_OFF);
    data.push(...encode('--------------------------------'));
    data.push(LF);

    // Items
    receipt.items.forEach((item) => {
      const name = item.name.length > 28
        ? item.name.substring(0, 25) + '...'
        : item.name.padEnd(28);
      const qty = String(item.quantity).padStart(3);
      const price = item.total.toLocaleString().padStart(10);
      data.push(...encode(`${name}${qty}${price}`));
      data.push(LF);

      // If there's a discount
      if (item.discount && item.discount > 0) {
        data.push(...encode(`  -${item.discount.toLocaleString()} MNT`));
        data.push(LF);
      }
    });

    // Separator
    data.push(...encode('================================'));
    data.push(LF);

    // Totals
    data.push(...Commands.BOLD_ON);

    // Subtotal
    data.push(...encode(`Дүн (НХАТ-гүй):    ${(receipt.subTotal || 0).toLocaleString()} MNT`));
    data.push(LF);

    // VAT
    data.push(...encode(`НӨАТ (10%):         ${(receipt.vatAmount || 0).toLocaleString()} MNT`));
    data.push(LF);

    // Total
    data.push(...Commands.DOUBLE_HEIGHT_ON);
    data.push(...encode(`НИЙТ ДҮН:         ${(receipt.totalAmount || 0).toLocaleString()} MNT`));
    data.push(LF);
    data.push(...Commands.DOUBLE_HEIGHT_OFF);

    data.push(...Commands.BOLD_OFF);
    data.push(LF);

    // Payment type
    data.push(...encode(`Төлбөрийн хэлбэр: ${receipt.paymentType || 'Бэлэн'}`));
    data.push(LF);

    // Lottery number
    if (receipt.lottery) {
      data.push(LF);
      data.push(...Commands.BOLD_ON);
      data.push(...encode('СУГАЛААНЫ ДҮН:'));
      data.push(LF);
      data.push(...Commands.DOUBLE_SIZE_ON);
      data.push(...encode(receipt.lottery));
      data.push(LF);
      data.push(...Commands.DOUBLE_SIZE_OFF);
      data.push(...Commands.BOLD_OFF);
    }

    // QR Code section
    if (receipt.qrData) {
      data.push(LF);
      data.push(...encode('QR КОД:'));
      data.push(LF);
      // QR code would be sent as an image in a real implementation
      // For now, we just print a placeholder
      data.push(...encode('[QR CODE PLACEHOLDER]'));
      data.push(LF);
    }

    // Footer
    data.push(LF);
    data.push(...encode('================================'));
    data.push(LF);
    data.push(...Commands.ALIGN_CENTER);
    data.push(...encode('Татвар төлөгчөөр баримтжуулсан'));
    data.push(LF);
    data.push(...encode(`https://e-barimt.mn/verify/${receipt.billId}`));
    data.push(LF);
    data.push(LF);
    data.push(...encode('Хүндэтгэсэн'));
    data.push(LF);
    data.push(LF);

    // Feed and cut
    data.push(...Commands.FEED_LINES(4));
    data.push(...Commands.PARTIAL_CUT);

    return data;
  }

  /**
   * Print a receipt
   */
  async printReceipt(receipt: EBarimtReceipt): Promise<boolean> {
    if (!this.isConnected()) {
      console.error('Printer not connected');
      return false;
    }

    try {
      const data = this.buildReceipt(receipt);

      // In a real implementation, this would send data to the printer
      // via BLE or USB
      console.log('Printing receipt:', data.length, 'bytes');
      console.log('Receipt data:', new Uint8Array(data));

      // Simulate printing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      console.error('Failed to print receipt:', error);
      return false;
    }
  }

  /**
   * Print a simple text
   */
  async printText(text: string): Promise<boolean> {
    if (!this.isConnected()) {
      console.error('Printer not connected');
      return false;
    }

    try {
      const data: number[] = [
        ...Commands.INIT,
        ...Commands.ALIGN_CENTER,
        ...encode(text),
        LF,
        ...Commands.FEED_LINES(3),
        ...Commands.PARTIAL_CUT,
      ];

      console.log('Printing text:', text);
      await new Promise((resolve) => setTimeout(resolve, 500));

      return true;
    } catch (error) {
      console.error('Failed to print text:', error);
      return false;
    }
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(): Promise<boolean> {
    if (!this.isConnected()) {
      console.error('Printer not connected');
      return false;
    }

    try {
      const data: number[] = [...Commands.INIT, ...Commands.OPEN_CASH_DRAWER];
      console.log('Opening cash drawer');
      await new Promise((resolve) => setTimeout(resolve, 200));
      return true;
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      return false;
    }
  }

  /**
   * Print a test page
   */
  async printTestPage(): Promise<boolean> {
    const testReceipt: EBarimtReceipt = {
      billId: 'TEST-' + Date.now(),
      date: new Date().toLocaleDateString('mn-MN'),
      time: new Date().toLocaleTimeString('mn-MN'),
      companyName: 'OASIS WAREHOUSE TEST',
      companyAddress: 'Улаанбаатар хот',
      branchName: 'Төв салбар',
      cashierName: 'Тест',
      customerNo: 'АБ-1234567',
      customerName: 'Иванов Иван',
      type: 'REGISTER',
      items: [
        { id: 1, name: 'Тест бараа 1', quantity: 2, unitPrice: 5000, total: 10000, vatRate: 0.1 },
        { id: 2, name: 'Тест бараа 2', quantity: 1, unitPrice: 15000, total: 15000, vatRate: 0.1 },
      ],
      subTotal: 22727,
      vatAmount: 2273,
      totalAmount: 25000,
      paymentType: 'Бэлэн',
      lottery: '12345678',
      qrData: 'INV|TEST123|2024-01-01|25000',
    };

    return this.printReceipt(testReceipt);
  }
}

// Singleton instance
export const printService = new EscPosPrintService();

/**
 * Format order for eBarimt receipt
 */
export function formatOrderForReceipt(
  order: any,
  eBarimtResult: any
): EBarimtReceipt {
  return {
    billId: eBarimtResult.billId || `ORD-${order.id}`,
    date: new Date(order.createdAt || order.date).toLocaleDateString('mn-MN'),
    time: new Date(order.createdAt || order.date).toLocaleTimeString('mn-MN'),
    companyName: 'OASIS WAREHOUSE',
    companyAddress: 'Улаанбаатар хот',
    branchName: order.branchName || '',
    cashierName: order.cashierName || order.userName || '',
    customerNo: eBarimtResult.customerNo || order.customerNo || '',
    customerName: eBarimtResult.customerName || order.customerName || '',
    type: eBarimtResult.type === 'RETURN' ? 'RETURN' : 'REGISTER',
    items: (order.items || []).map((item: any) => ({
      id: item.id || item.productId,
      name: item.name || item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total || (item.quantity * item.unitPrice),
      discount: item.discount || 0,
      vatRate: 0.1,
    })),
    subTotal: order.subTotal || (order.totalAmount - order.vatAmount),
    vatAmount: order.vatAmount,
    totalAmount: order.totalAmount,
    paymentType: order.paymentType || 'Бэлэн',
    lottery: eBarimtResult.lottery,
    qrData: eBarimtResult.qrData,
  };
}
