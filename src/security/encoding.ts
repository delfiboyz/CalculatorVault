const HEX = '0123456789abcdef';

export const bytesToHex = (bytes: Uint8Array) => {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
  }
  return out;
};

export const hexToBytes = (hex: string) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
};

// JSON with every non-ASCII character escaped, so it round-trips through bytes
// without needing a UTF-8 encoder/decoder in the JS runtime.
export const jsonToBytes = (value: unknown) => {
  const json = JSON.stringify(value).replace(
    /[\u007f-￿]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );
  return asciiToBytes(json);
};

export const bytesToJson = <T>(bytes: Uint8Array): T => {
  let json = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    json += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return JSON.parse(json);
};

export const asciiToBytes = (text: string) => {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i) & 0x7f;
  }
  return out;
};

// Compares in time independent of where the first difference is.
export const constantTimeEqual = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
};
