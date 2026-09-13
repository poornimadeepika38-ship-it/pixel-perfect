import { unzipSync, strFromU8 } from "fflate";

function clean(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(bytes);
  const { text } = await extractText(doc, { mergePages: true });
  return clean(Array.isArray(text) ? text.join("\n") : text);
}

function extractDocx(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const doc = files["word/document.xml"];
  if (!doc) throw new Error("This DOCX file could not be read.");
  const xml = strFromU8(doc);
  const text = xml
    .replace(/<w:p[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, " ")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return clean(text);
}

export async function extractResumeText(
  bytes: Uint8Array,
  fileName: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  let text = "";
  if (lower.endsWith(".pdf")) {
    text = await extractPdf(bytes);
  } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    text = extractDocx(bytes);
  } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    text = clean(strFromU8(bytes));
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
  }

  if (text.length < 40) {
    throw new Error("No readable text found in this file (it may be a scanned image).");
  }
  return text.slice(0, 30000);
}
