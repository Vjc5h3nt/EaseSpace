
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://` + process.env.CLOUDFLARE_ACCOUNT_ID + `.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { fileType, folder } = await request.json();
    if (!fileType || !folder) {
        return NextResponse.json({ error: "fileType and folder are required" }, { status: 400 });
    }

    const key = `${folder}/${uuidv4()}.${fileType.split('/')[1]}`;

    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 }); // URL expires in 5 minutes
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error: any) {
    console.error("Error creating presigned URL", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
