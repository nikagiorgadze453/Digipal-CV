/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

// Polyfill browser globals that pdfjs-dist (used by pdf-parse) expects in Node.js
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    is2D = true; isIdentity = true;
    inverse() { return new DOMMatrix(); }
    multiply() { return new DOMMatrix(); }
    scale() { return new DOMMatrix(); }
    translate() { return new DOMMatrix(); }
    transformPoint() { return { x: 0, y: 0, z: 0, w: 1 }; }
    toString() { return "matrix(1,0,0,1,0,0)"; }
  };
}
if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    rect() {}
    closePath() {}
  };
}
if (typeof globalThis.ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w = 0, h = 0) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Import the actual parser, not the index which tries to load a test PDF
  const pdf = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdf(buffer);
  return data.text as string;
}
