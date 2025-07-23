
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// =================================================================
// IMPORTANT: Environment Variable Configuration
// =================================================================
// To use Google Cloud Storage, you must set up authentication
// and specify a bucket name.
//
// 1. Authentication:
//    - If running locally or on a non-Google Cloud environment,
//      download a service account JSON key file.
//    - Set the environment variable `GOOGLE_APPLICATION_CREDENTIALS`
//      to the absolute path of that JSON file.
//    - In Google Cloud environments (like Cloud Run), authentication
//      is often handled automatically.
//
// 2. Bucket Name:
//    - Set the environment variable `GCS_BUCKET_NAME` to the name
//      of the GCS bucket you want to upload files to.
//      e.g., `GCS_BUCKET_NAME=my-awesome-app-bucket`
//
// You can set these in your .env file for local development.
// =================================================================

const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not set.");
}

const storage = new Storage();
const bucket = storage.bucket(bucketName);

/**
 * Uploads a file to Google Cloud Storage.
 * @param file The file to upload.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(file: File): Promise<string> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const uniqueFilename = `${uuidv4()}-${file.name}`;
  const gcsFile = bucket.file(uniqueFilename);

  const stream = gcsFile.createWriteStream({
    metadata: {
      contentType: file.type,
    },
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', async () => {
      // Make the file public
      await gcsFile.makePublic();
      
      // Return the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
      resolve(publicUrl);
    });

    stream.end(fileBuffer);
  });
}
