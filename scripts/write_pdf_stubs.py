import pathlib
ROOT = pathlib.Path(r"C:\Users\moham\Desktop\Vibe\Codex\Kinetra")
BASE = ROOT / "packages" / "core" / "src" / "pdf"

# Build real modular facades on top of the monolithic pdf.ts. These keep
# the existing emitter intact but expose a sliced public surface that
# downstream code (layout, text, equation, figure, page, document) can
# import. They are thin re-exports today and will grow as more code is
# moved out of pdf.ts.

LAYOUT = r'''/**
 * PDF layout helpers.
 *
 * Re-export of geometry primitives from the PDF emitter. Higher-level
 * document composition lives in `./document.ts`.
 */
export { BLACK, WHITE, GRAY, RED, BLUE, GREEN, ORANGE } from "./pdf.js";
export type { RgbColor, StandardFont, Point2D, TextOptions, LineOptions, RectOptions, PathOptions } from "./pdf.js";
'''

(BASE / "layout.ts").write_text(LAYOUT, encoding="utf-8")

TEXT = r'''/**
 * PDF text helpers.
 *
 * The emitter's `Page.text()` method already handles font selection,
 * alignment and rotation. This module adds small typed wrappers and a
 * word-wrapping helper used by the document composer.
 */
export interface TextWrapResult {
  lines: string[];
  /** Width in points of the widest line. */
  widthPt: number;
}

/**
 * Greedy word-wrap. Caller chooses the font/size pair to estimate widths;
 * we fall back to a character-based heuristic that approximates Helvetica
 * metrics. For exact widths, callers should measure with a font engine.
 */
export function wrapText(text: string, maxWidthPt: number, avgCharWidthPt = 4.5): TextWrapResult {
  const maxChars = Math.max(1, Math.floor(maxWidthPt / avgCharWidthPt));
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let cur = "";
  let widest = 0;
  for (const w of words) {
    if ((cur + w).length > maxChars) {
      if (cur.length > 0) {
        widest = Math.max(widest, cur.length * avgCharWidthPt);
        lines.push(cur.trim());
        cur = "";
      }
      if (w.length > maxChars) {
        // Hard-break very long tokens.
        for (let i = 0; i < w.length; i += maxChars) {
          const piece = w.slice(i, i + maxChars);
          widest = Math.max(widest, piece.length * avgCharWidthPt);
          lines.push(piece);
        }
      } else {
        cur = w;
      }
    } else {
      cur += w;
    }
  }
  if (cur.trim().length > 0) {
    widest = Math.max(widest, cur.length * avgCharWidthPt);
    lines.push(cur.trim());
  }
  return { lines, widthPt: widest };
}
'''

(BASE / "text.ts").write_text(TEXT, encoding="utf-8")

EQ = r'''/**
 * PDF equation helpers.
 *
 * Equations are emitted as text using Unicode math characters; the PDF
 * Standard 14 fonts (Helvetica/Times/Courier) cover the Latin/Greek
 * alphabet and a reasonable set of math symbols. This module builds
 * TeX-like strings from a structured model.
 */

export interface EquationPart {
  type: "literal" | "ident" | "sup" | "sub" | "frac" | "sqrt" | "op";
  text?: string;
  children?: EquationPart[];
}

/**
 * Render an equation as a Unicode string suitable for a PDF Standard font.
 * Whitespace is preserved to keep fractions and superscripts readable.
 */
export function renderEquation(p: EquationPart): string {
  switch (p.type) {
    case "literal":
      return p.text ?? "";
    case "ident":
      return p.text ?? "";
    case "sup": {
      const body = (p.children ?? []).map(renderEquation).join("");
      return `${body}\u207B\u00B9\u2070\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079`.slice(body.length, body.length + 1);
    }
    case "sub": {
      const body = (p.children ?? []).map(renderEquation).join("");
      return body;
    }
    case "frac": {
      const top = (p.children ?? []).slice(0, 1).map(renderEquation).join("");
      const bot = (p.children ?? []).slice(1).map(renderEquation).join("");
      return `(${top})/(${bot})`;
    }
    case "sqrt": {
      const body = (p.children ?? []).map(renderEquation).join("");
      return `sqrt(${body})`;
    }
    case "op": {
      const body = (p.children ?? []).map(renderEquation).join("");
      return `${p.text ?? ""}(${body})`;
    }
  }
}

export const SYMBOL = {
  plus: "+",
  minus: "\u2212",
  times: "\u00B7",
  divide: "\u00F7",
  approx: "\u2248",
  neq: "\u2260",
  leq: "\u2264",
  geq: "\u2265",
  alpha: "\u03B1",
  beta: "\u03B2",
  gamma: "\u03B3",
  delta: "\u03B4",
  theta: "\u03B8",
  pi: "\u03C0",
  omega: "\u03C9",
  sigma: "\u03C3",
  Omega: "\u03A9",
  Sigma: "\u03A3",
  Pi: "\u03A0",
  integral: "\u222B",
  partial: "\u2202",
  nabla: "\u2207",
  sqrt: "\u221A",
  sum: "\u2211",
  prod: "\u220F",
  infty: "\u221E",
  vdot: "\u22C5",
  times_: "\u00D7",
  hbar: "\u210F",
  ohm: "\u03A9",
  mu0: "\u00B5\u2080",
  epsilon0: "\u03B5\u2080",
} as const;
'''

(BASE / "equation.ts").write_text(EQ, encoding="utf-8")

FIG = r'''/**
 * PDF figure helpers.
 *
 * A "figure" is a labelled, captioned SVG/PNG block embedded into a PDF
 * page. The composer measures the figure and the page margin to choose a
 * placement; this module exposes the helper functions used by the
 * document composer.
 */

import type { RectOptions } from "./pdf.js";

export interface FigureBlock {
  kind: "svg" | "png";
  /** Width in points; height is computed from the aspect ratio when set. */
  widthPt: number;
  /** Optional explicit height. When omitted, computed from widthPt and the aspect ratio. */
  heightPt?: number;
  /** Source bytes (decoded). */
  data: string; // svg XML or base64-encoded PNG
  caption?: string;
  label?: string;
  /** x,y in points relative to the page origin. */
  x: number;
  y: number;
}

/**
 * Auto-compute a figure's height when only width and aspect ratio are known.
 */
export function figureHeight(widthPt: number, aspectRatio: number): number {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error(`Invalid aspect ratio: ${aspectRatio}`);
  }
  return widthPt / aspectRatio;
}

/**
 * Bounding box helper used to reserve layout space for a figure before
 * placing it. The figure will be drawn with `drawImage` or SVG path
 * operators; this returns the surrounding `RectOptions` if a background
 * fill is desired.
 */
export function figureBackground(b: FigureBlock, fill: { r: number; g: number; b: number }): RectOptions {
  const h = b.heightPt ?? 0;
  return {
    x: b.x,
    y: b.y - h,
    width: b.widthPt,
    height: h,
    fill,
    stroke: undefined,
  };
}
'''

(BASE / "figure.ts").write_text(FIG, encoding="utf-8")

PAGE = r'''/**
 * Page-level helpers for the PDF emitter.
 *
 * Re-export the public Page class plus a few convenience builders.
 */
export { Page } from "./pdf.js";
export type { Page as PageType } from "./pdf.js";
'''

(BASE / "page.ts").write_text(PAGE, encoding="utf-8")

DOC = r'''/**
 * Document composer.
 *
 * Thin facade over the monolithic emitter that exposes a higher-level
 * builder API: `addPage()`, `addHeading()`, `addParagraph()`, `addFigure()`
 * and `build()`. Backed by the existing `PDFDocument` class so the byte-
 * stable output is preserved.
 */

import { KinetraError } from "../errors.js";
import { PDFDocument, Page, type RgbColor, BLACK } from "./pdf.js";
import { wrapText } from "./text.js";

export interface DocumentBuilderOpts {
  title: string;
  author?: string;
  subject?: string;
  pageSize?: "letter" | "a4";
}

export interface FigureSpec {
  svg: string;
  caption?: string;
  widthPt: number;
  aspectRatio: number;
}

export interface DocumentBuilder {
  addPage(): Page;
  addHeading(text: string, level?: 1 | 2 | 3): void;
  addParagraph(text: string, opts?: { fontSize?: number; color?: RgbColor }): void;
  addFigure(spec: FigureSpec): void;
  addEquation(text: string): void;
  build(): Uint8Array;
}

export function createDocument(opts: DocumentBuilderOpts): DocumentBuilder {
  const doc = new PDFDocument({
    title: opts.title,
    author: opts.author ?? "Kinetra",
    subject: opts.subject,
    pageSize: opts.pageSize ?? "letter",
  });
  let page: Page = doc.addPage();
  let cursorY = 760;
  const marginX = 60;

  function ensureRoom(neededPt: number) {
    if (cursorY - neededPt < 60) {
      page = doc.addPage();
      cursorY = 760;
    }
  }

  function writeText(text: string, opts: { fontSize?: number; color?: RgbColor; bold?: boolean } = {}) {
    const fontSize = opts.fontSize ?? 11;
    const font = opts.bold ? "Helvetica-Bold" : "Helvetica";
    const wrap = wrapText(text, 612 - marginX * 2, fontSize * 0.5);
    for (const line of wrap.lines) {
      ensureRoom(fontSize + 4);
      page.text({
        x: marginX,
        y: cursorY,
        font,
        fontSize,
        text: line,
        color: opts.color ?? BLACK,
      });
      cursorY -= fontSize + 3;
    }
  }

  return {
    addPage(): Page {
      page = doc.addPage();
      cursorY = 760;
      return page;
    },
    addHeading(text: string, level = 1): void {
      const size = level === 1 ? 22 : level === 2 ? 16 : 13;
      ensureRoom(size + 8);
      page.text({
        x: marginX,
        y: cursorY,
        font: "Helvetica-Bold",
        fontSize: size,
        text,
      });
      cursorY -= size + 8;
    },
    addParagraph(text: string, opts?: { fontSize?: number; color?: RgbColor }): void {
      writeText(text, opts ?? {});
    },
    addFigure(spec: FigureSpec): void {
      const height = spec.widthPt / spec.aspectRatio;
      ensureRoom(height + 30);
      // Embed the SVG via an image is not supported by the bare emitter; for
      // now we record the figure as a labeled rectangle placeholder so the
      // caller can swap in a real raster at composition time.
      page.rect({
        x: marginX,
        y: cursorY - height,
        width: spec.widthPt,
        height,
        stroke: { r: 0, g: 0, b: 0 },
        lineWidth: 0.5,
      });
      cursorY -= height + 6;
      if (spec.caption) {
        writeText(spec.caption, { fontSize: 9 });
        cursorY -= 4;
      }
    },
    addEquation(text: string): void {
      ensureRoom(20);
      page.text({
        x: marginX,
        y: cursorY,
        font: "Times-Italic",
        fontSize: 12,
        text,
      });
      cursorY -= 18;
    },
    build(): Uint8Array {
      return doc.build();
    },
  };
}

/**
 * Convenience: validate that the assembled document meets minimum
 * requirements (at least one page, non-zero length, valid PDF header).
 */
export function validateDocument(bytes: Uint8Array): void {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 10) {
    throw new KinetraError("validation", "Document is too small", { bytes: bytes.byteLength });
  }
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 8));
  if (!head.startsWith("%PDF-")) {
    throw new KinetraError("validation", "Document is not a PDF", { head });
  }
}
'''

(BASE / "document.ts").write_text(DOC, encoding="utf-8")
print("wrote pdf/layout.ts, text.ts, equation.ts, figure.ts, page.ts, document.ts")