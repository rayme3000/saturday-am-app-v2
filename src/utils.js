// --- File Upload Helper ---
export const uploadToR2 = async (file, folder) => {
  const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
  
  const command = new PutObjectCommand({
    Bucket: 'saturday-am-vault',
    Key: fileName,
    Body: file,
    ContentType: file.type,
  });

  try {
    await s3Client.send(command);
    // Return the public URL
    return `${CLOUDFLARE_BASE_URL}/${fileName}`;
  } catch (err) {
    console.error("R2 Upload Failed:", err);
    throw err;
  }
};