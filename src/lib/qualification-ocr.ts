import { tmpdir } from "node:os";
import { z } from "zod";

const extractionSchema = z.object({
  extractedText: z.string().default(""),
  qualifications: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0),
});
const profileDocumentSchema = z.object({
  extractedText: z.string().min(1),
  fields: z.record(z.string(), z.string()).default({}),
  confidence: z.number().min(0).max(1).default(0),
});

export type ExtractionMethod = "groq" | "openai" | "ocr";
export type QualificationExtraction = z.infer<typeof extractionSchema> & { method: ExtractionMethod };
export type ProfileDocumentType = "id_document" | "business_registration" | "funding_proof" | "certificate";
export type ProfileDocumentExtraction = z.infer<typeof profileDocumentSchema> & { method: ExtractionMethod };

type AiProvider = {
  name: "groq" | "openai";
  baseUrl: string;
  apiKey: string;
  model: string;
  readsPdfFiles: boolean;
  maxOutputTokens?: number;
};

type PreparedDocument = {
  file: File;
  bytes: Buffer;
  pdfText: string;
};

type ResponsesPayload = {
  output_text?: string | null;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

const maximumPromptTextLength = 12000;
const maximumOcrConfidence = 0.7;

const documentTypesByExtension: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

const qualificationPattern = /\b(national senior certificate|matric(?:ulation)?|higher certificate|advanced certificate|national certificate|national diploma|diploma|degree|bachelor|b\.?\s?sc|b\.?\s?tech|b\.?\s?agric|honours|masters?|m\.?\s?sc|ph\.?d|doctorate|certificate|nqf\s*level\s*\d+|learnership)\b/i;

const skillListPattern = /^(?:modules?|subjects?|skills?|competenc(?:y|ies)|courses?|majors?)\s*(?:completed|covered|passed)?\s*[:\-]\s*(.*)$/i;

const datePattern = /\b(\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}|\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/i;

const knownSkills = [
  "Crop science",
  "Crop production",
  "Plant production",
  "Animal production",
  "Livestock management",
  "Poultry production",
  "Dairy farming",
  "Irrigation",
  "Soil science",
  "Agronomy",
  "Horticulture",
  "Hydroponics",
  "Greenhouse management",
  "Pest management",
  "Weed control",
  "Aquaculture",
  "Viticulture",
  "Forestry",
  "Agricultural extension",
  "Agricultural economics",
  "Agricultural finance",
  "Farm management",
  "Farm business management",
  "Farm operations",
  "Food safety",
  "Food processing",
  "Tractor operation",
  "Farm machinery",
  "Data capture",
  "Computer literacy",
  "Bookkeeping",
  "Sales and marketing",
  "Project management",
  "Supervision",
  "First aid",
  "Health and safety",
];

const profileDocumentInstructions: Record<ProfileDocumentType, string> = {
  id_document: "Extract the person's full name, South African ID number, and document expiry if visible.",
  business_registration: "Extract the registered business name, registration number, registration status, and registered province if visible.",
  funding_proof: "Extract the document date, funding or facility type, and any stated funding amount range. Do not extract bank account or card numbers.",
  certificate: "Extract certificate name, issuing organisation, issue date, and skills listed.",
};

export function qualificationDocumentType(file: File) {
  const mimeType = file.type === "image/jpg" || file.type === "image/pjpeg" ? "image/jpeg" : file.type;
  if (Object.values(documentTypesByExtension).includes(mimeType)) return mimeType;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return documentTypesByExtension[extension] ?? null;
}

function configuredProviders(): AiProvider[] {
  const providers: AiProvider[] = [];

  if (process.env.GROQ_API_KEY) {
    providers.push({
      name: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b",
      readsPdfFiles: false,
      maxOutputTokens: 900,
    });
  }

  if (process.env.OPENAI_API_KEY) {
    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    providers.push({
      name: "openai",
      baseUrl,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      readsPdfFiles: baseUrl.includes("api.openai.com"),
    });
  }

  return providers;
}

function readOutputText(payload: ResponsesPayload) {
  if (payload.output_text) return payload.output_text;
  return (payload.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function parseModelJson(value: string) {
  const cleaned = value.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  return JSON.parse(
    objectStart >= 0 && objectEnd >= objectStart
      ? cleaned.slice(objectStart, objectEnd + 1)
      : cleaned,
  );
}

async function readPdfText(bytes: Uint8Array) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text.trim();
}

async function prepareDocument(upload: File): Promise<PreparedDocument> {
  const bytes = Buffer.from(await upload.arrayBuffer());
  const file = new File([bytes], upload.name, { type: qualificationDocumentType(upload) ?? upload.type });
  const pdfText = file.type === "application/pdf"
    ? await readPdfText(new Uint8Array(bytes)).catch(() => "")
    : "";
  return { file, bytes, pdfText };
}

async function requestAiJson(provider: AiProvider, document: PreparedDocument, instructions: string[]) {
  const { file, bytes, pdfText } = document;
  const isPdf = file.type === "application/pdf";
  const sendsText = isPdf && !provider.readsPdfFiles;
  if (sendsText && !pdfText) {
    throw new Error("this provider cannot read scanned PDFs");
  }

  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
  const documentContent = sendsText
    ? { type: "input_text", text: `Document text:\n${pdfText.slice(0, maximumPromptTextLength)}` }
    : isPdf
      ? { type: "input_file", filename: file.name, file_data: dataUrl }
      : { type: "input_image", image_url: dataUrl };

  const response = await fetch(`${provider.baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      text: { format: { type: "json_object" } },
      ...(provider.maxOutputTokens ? { max_output_tokens: provider.maxOutputTokens } : {}),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                ...instructions,
                sendsText ? "The document text is already known, so set extractedText to an empty string." : "",
              ].filter(Boolean).join(" "),
            },
            documentContent,
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`request failed (${response.status}): ${details.slice(0, 240)}`);
  }

  const outputText = readOutputText((await response.json()) as ResponsesPayload);
  if (!outputText) {
    throw new Error("no readable result");
  }

  try {
    return parseModelJson(outputText) as unknown;
  } catch {
    throw new Error("invalid JSON result");
  }
}

function withKnownText(modelJson: unknown, pdfText: string) {
  if (!pdfText || !modelJson || typeof modelJson !== "object" || Array.isArray(modelJson)) return modelJson;
  const result = modelJson as { extractedText?: unknown };
  return typeof result.extractedText === "string" && result.extractedText.trim()
    ? modelJson
    : { ...result, extractedText: pdfText };
}

async function recognizeImageText(bytes: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", undefined, { cachePath: tmpdir() });
  try {
    const { data } = await worker.recognize(bytes);
    return { text: data.text.trim(), confidence: data.confidence / 100 };
  } finally {
    await worker.terminate();
  }
}

async function readDocumentLocally({ file, bytes, pdfText }: PreparedDocument) {
  if (file.type === "application/pdf") {
    if (!pdfText) {
      throw new Error("the PDF has no selectable text; upload a JPG or PNG photo of the document instead");
    }
    return { text: pdfText, readConfidence: 0.9 };
  }

  const result = await recognizeImageText(bytes);
  if (!result.text) {
    throw new Error("no readable text was found in the document");
  }
  return { text: result.text, readConfidence: result.confidence };
}

function ocrConfidence(readConfidence: number, foundDetails: boolean) {
  return Math.round(Math.min(maximumOcrConfidence, readConfidence * (foundDetails ? 0.75 : 0.35)) * 100) / 100;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").replace(/^[\s•*\-–:]+|[\s•*\-–:,.;]+$/g, "").trim();
}

function textLines(text: string) {
  return text.split(/\r?\n/).map(cleanLine).filter(Boolean);
}

function detectQualifications(lines: string[]) {
  const qualifications = lines
    .filter((line) => line.length >= 6 && line.length <= 120 && qualificationPattern.test(line))
    .filter((line) => !/^(this|the|we|it)\b/i.test(line));
  return Array.from(new Set(qualifications)).slice(0, 5);
}

function detectSkills(lines: string[], text: string) {
  const skills: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(skillListPattern);
    if (!match) continue;
    const listText = [match[1], ...lines.slice(index + 1, index + 4).filter((line) => !line.includes(":"))].join(", ");
    for (const item of listText.split(/[,;•|]/)) {
      const skill = cleanLine(item);
      if (skill.length >= 3 && skill.length <= 60) skills.push(skill);
    }
  }

  const normalizedText = ` ${normalize(text)} `;
  for (const skill of knownSkills) {
    const key = normalize(skill);
    const alreadyListed = skills.some((listed) => ` ${normalize(listed)} `.includes(` ${key} `));
    if (!alreadyListed && normalizedText.includes(` ${key} `)) skills.push(skill);
  }

  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = normalize(skill);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

function detectProfileFields(documentType: ProfileDocumentType, text: string) {
  const lines = textLines(text);
  const fields: Record<string, string> = {};
  const date = text.match(datePattern)?.[1];

  if (documentType === "id_document") {
    const idNumber = text.match(/\b(\d{6}\s?\d{4}\s?\d{3})\b/)?.[1];
    if (idNumber) fields["ID number"] = idNumber.replace(/\s/g, "");
  }

  if (documentType === "business_registration") {
    const registrationNumber = text.match(/\b((?:19|20)\d{2}\s*\/\s*\d{6}\s*\/\s*\d{2})\b/)?.[1];
    if (registrationNumber) fields["Registration number"] = registrationNumber.replace(/\s/g, "");
    const businessName = lines.find((line) => /\b(\(pty\)\s*ltd|pty\s*ltd|limited|co-?operative|cc)\b/i.test(line) && line.length <= 100);
    if (businessName) fields["Business name"] = businessName;
  }

  if (documentType === "funding_proof") {
    const amount = text.match(/\bR\s?\d[\d\s,]*(?:\.\d{2})?\b/)?.[0];
    if (amount) fields["Funding amount"] = amount.replace(/\s+/g, " ").trim();
    if (date) fields["Document date"] = date;
  }

  if (documentType === "certificate") {
    const [certificateName] = detectQualifications(lines);
    if (certificateName) fields["Certificate name"] = certificateName;
    const skills = detectSkills(lines, text);
    if (skills.length) fields["Skills"] = skills.join(", ");
    if (date) fields["Issue date"] = date;
  }

  return fields;
}

async function runExtraction<T>(
  upload: File,
  extractWithAi: (provider: AiProvider, document: PreparedDocument) => Promise<T>,
  extractWithOcr: (document: PreparedDocument) => Promise<T>,
): Promise<T & { method: ExtractionMethod }> {
  const document = await prepareDocument(upload);
  const failures: string[] = [];

  for (const provider of configuredProviders()) {
    try {
      return { ...(await extractWithAi(provider, document)), method: provider.name };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Document extraction with ${provider.name} failed, trying the next method: ${reason}`);
      failures.push(`${provider.name}: ${reason}`);
    }
  }

  try {
    return { ...(await extractWithOcr(document)), method: "ocr" };
  } catch (error) {
    failures.push(`ocr: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error(`Document extraction failed. ${failures.join(" | ")}`);
}

export async function extractQualification(upload: File): Promise<QualificationExtraction> {
  return runExtraction(
    upload,
    async (provider, document) => {
      const modelJson = await requestAiJson(provider, document, [
        "Read this qualification document carefully.",
        "Extract the document text, named qualifications or certificates, and concrete professional or technical skills.",
        "Return JSON only with this shape: {\"extractedText\": string, \"qualifications\": string[], \"skills\": string[], \"confidence\": number from 0 to 1}.",
        "Keep skills concise and use the wording found in the document.",
      ]);
      const parsed = extractionSchema.safeParse(withKnownText(modelJson, document.pdfText));
      if (!parsed.success) throw new Error("result did not match the expected shape");
      return parsed.data;
    },
    async (document) => {
      const { text, readConfidence } = await readDocumentLocally(document);
      const lines = textLines(text);
      const qualifications = detectQualifications(lines);
      const skills = detectSkills(lines, text);
      return {
        extractedText: text,
        qualifications,
        skills,
        confidence: ocrConfidence(readConfidence, qualifications.length > 0 || skills.length > 0),
      };
    },
  );
}

export async function extractProfileDocument(upload: File, documentType: ProfileDocumentType): Promise<ProfileDocumentExtraction> {
  return runExtraction(
    upload,
    async (provider, document) => {
      const modelJson = await requestAiJson(provider, document, [
        `Read this ${documentType.replaceAll("_", " ")} carefully.`,
        profileDocumentInstructions[documentType],
        "Return JSON only with this shape: {\"extractedText\": string, \"fields\": {\"field name\": \"value\"}, \"confidence\": number from 0 to 1}.",
        "Only include values that are readable. Do not guess missing information.",
      ]);
      const parsed = profileDocumentSchema.safeParse(withKnownText(modelJson, document.pdfText));
      if (!parsed.success) throw new Error("result did not match the expected shape");
      return parsed.data;
    },
    async (document) => {
      const { text, readConfidence } = await readDocumentLocally(document);
      const fields = detectProfileFields(documentType, text);
      return {
        extractedText: text,
        fields,
        confidence: ocrConfidence(readConfidence, Object.keys(fields).length > 0),
      };
    },
  );
}
