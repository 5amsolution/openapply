import "server-only";

// Resume file → plain text. PDF via unpdf (pure JS), DOCX via mammoth.

export const RESUME_MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
} as const;

export async function extractResumeText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (file.type === RESUME_MIME.pdf || name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return clean(text);
  }
  if (file.type === RESUME_MIME.docx || name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return clean(value);
  }
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    return clean(new TextDecoder().decode(buf));
  }
  throw new Error("Upload a PDF, DOCX or TXT resume.");
}

function clean(s: string): string {
  return s.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Cheap extraction used when the user hasn't added an AI key yet. */
export function heuristicProfile(text: string) {
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? "";
  const phone = text.match(/(\+?\d[\d\s().-]{8,}\d)/)?.[0]?.trim() ?? "";
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0] ?? "";
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i)?.[0] ?? "";
  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 2 && l.length < 60 && !l.includes("@")) ?? "";
  return { email, phone, linkedin, github, full_name: firstLine };
}
