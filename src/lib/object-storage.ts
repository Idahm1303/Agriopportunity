import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const bucketName = process.env.AWS_S3_BUCKET ?? "agriopportunity-documents";

function getStorageClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured. Set AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in .env.local. AWS_S3_BUCKET is optional and defaults to agriopportunity-documents.",
    );
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function safeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "document";
}

export async function uploadDocument(input: {
  file: File;
  userId: string;
  documentType: string;
  referenceId?: string;
}) {
  const key = [
    "documents",
    input.documentType,
    input.userId,
    input.referenceId ?? crypto.randomUUID(),
    safeFileName(input.file.name),
  ].join("/");

  await getStorageClient().send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: Buffer.from(await input.file.arrayBuffer()),
    ContentType: input.file.type || "application/octet-stream",
    Metadata: {
      userId: input.userId,
      documentType: input.documentType,
    },
  }));

  return key;
}

export async function downloadDocument(key: string) {
  const response = await getStorageClient().send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  if (!response.Body) throw new Error("The uploaded CV could not be read from document storage.");
  return response.Body.transformToByteArray();
}