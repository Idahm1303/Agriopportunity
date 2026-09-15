import { z } from "zod";

const extractionSchema = z.object({
  extractedText: z.string().min(1),
  qualifications: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0),
});

export type QualificationExtraction = z.infer<typeof extractionSchema>;

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

export async function extractQualification(file: File): Promise<QualificationExtraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI qualification extraction is not configured. Add OPENAI_API_KEY to the server environment.",
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const documentContent =
    file.type === "application/pdf"
      ? {
          type: "input_file",
          filename: file.name,
          file_data: `data:${file.type};base64,${base64}`,
        }
      : {
          type: "input_image",
          image_url: `data:${file.type};base64,${base64}`,
        };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Read this qualification document carefully.",
                "Extract the document text, named qualifications or certificates, and concrete professional or technical skills.",
                "Return JSON only with this shape: {\"extractedText\": string, \"qualifications\": string[], \"skills\": string[], \"confidence\": number from 0 to 1}.",
                "Keep skills concise and use the wording found in the document.",
              ].join(" "),
            },
            documentContent,
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`AI extraction failed (${response.status}): ${details.slice(0, 240)}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) {
    throw new Error("AI extraction returned no readable result.");
  }

  const parsed = extractionSchema.safeParse(parseModelJson(payload.output_text));
  if (!parsed.success) {
    throw new Error("AI extraction returned an invalid result.");
  }

  return parsed.data;
}