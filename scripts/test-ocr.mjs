import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import { extractProfileDocument, extractQualification } from "../src/lib/qualification-ocr.ts";

const [filePath, documentType] = process.argv.slice(2);
const profileDocumentTypes = ["id_document", "business_registration", "funding_proof", "certificate"];
if (!filePath || (documentType && !profileDocumentTypes.includes(documentType))) {
  console.error("Usage: node --env-file=.env.local scripts/test-ocr.mjs <path-to-pdf-jpg-or-png> [id_document|business_registration|funding_proof|certificate]");
  process.exit(1);
}

const mimeTypes = { ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
const type = mimeTypes[extname(filePath).toLowerCase()];
if (!type) {
  console.error("Only PDF, JPG, and PNG files are supported.");
  process.exit(1);
}

const file = new File([await readFile(filePath)], basename(filePath), { type });
const result = documentType
  ? await extractProfileDocument(file, documentType)
  : await extractQualification(file);
console.log(JSON.stringify(result, null, 2));
process.exit(0);
