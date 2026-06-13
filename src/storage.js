import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

export const uploadToR2 = async (file, folder) => {
  const fileName = `${folder}/${Date.now()}-${file.name}`;
  const command = new PutObjectCommand({
    Bucket: "saturday-am-vault",
    Key: fileName,
    Body: file,
    ContentType: file.type,
  });

  await s3Client.send(command);
  return `https://cdn.saturday-am.com/${fileName}`; // Update with your actual R2 public domain
};