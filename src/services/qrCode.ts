/**
 * QR code generation for e-Barimt receipts.
 *
 * The backend returns `qrData` — the QR code *value* as a string, not an
 * image. The `qrcode` package (already a dependency of react-native-qrcode-svg)
 * can turn that value into an inline SVG, which we can embed directly in the
 * print HTML and also render on screen via react-native-svg.
 */
import QRCode from 'qrcode';

/**
 * Build an inline SVG element for the given QR value.
 * Resolves to an empty string when there is nothing to encode.
 */
export const buildQrSvg = async (
  value: string | undefined | null,
  size = 160
): Promise<string> => {
  if (!value) return '';

  // qrcode escapes nothing by itself, so make sure the payload cannot break
  // out of the surrounding HTML.
  const safe = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  try {
    return await QRCode.toString(safe, {
      type: 'svg',
      margin: 1,
      width: size,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('Failed to build QR SVG:', error);
    return '';
  }
};

/**
 * Build a data URI holding the QR code as an SVG image, for use in <img src>.
 */
export const buildQrDataUri = async (
  value: string | undefined | null,
  size = 160
): Promise<string> => {
  const svg = await buildQrSvg(value, size);
  if (!svg) return '';
  return `data:image/svg+xml;base64,${base64Encode(svg)}`;
};

/**
 * Base64-encode a UTF-8 string. `btoa` only handles latin1, so go through
 * encodeURIComponent to support the full range of characters.
 */
const base64Encode = (input: string): string => {
  if (typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return globalThis.btoa(binary);
  }
  return '';
};
