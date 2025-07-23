
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// =================================================================
// IMPORTANT: Environment Variable Configuration
// =================================================================
// To use Google Cloud Storage, you must set up authentication
// and specify a bucket name.
//
// 1.  Set Environment Variables in your `.env` file:
//     - Create a `.env` file in the root of your project if it doesn't exist.
//     - Add the following variables, replacing the placeholder values:
//
//       GCS_BUCKET_NAME=your-actual-bucket-name
//       GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
//
//     - `GOOGLE_APPLICATION_CREDENTIALS` should be the absolute or relative path
//       to the JSON key file you downloaded from your Google Cloud project.
// =================================================================

const bucketName = process.env.GCS_BUCKET_NAME;

// The Storage client will automatically use the credentials from the
// GOOGLE_APPLICATION_CREDENTIALS environment variable.
let storage: Storage;
try {
    storage = new Storage();
} catch (error) {
    console.error("Failed to initialize Google Cloud Storage. Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and the file is accessible.", error);
    throw new Error("Could not initialize Google Cloud Storage client.");
}

/**
 * Uploads a file to Google Cloud Storage.
 * @param file The file to upload.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(file: File): Promise<string> {
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not set.");
  }
  if (!storage) {
    throw new Error("GCS Storage client is not initialized. Check your credentials.");
  }

  const bucket = storage.bucket(bucketName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const uniqueFilename = `${uuidv4()}-${file.name}`;
  const gcsFile = bucket.file(uniqueFilename);

  const stream = gcsFile.createWriteStream({
    metadata: {
      contentType: file.type,
    },
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      console.error("GCS Upload Stream Error:", err);
      reject(new Error('Failed to upload file to Google Cloud Storage. Check bucket permissions and configuration.'));
    });

    stream.on('finish', async () => {
      try {
        await gcsFile.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
        resolve(publicUrl);
      } catch (err) {
          console.error("GCS Make Public Error:", err);
          reject(new Error('Failed to make file public. Check GCS permissions (e.g., Storage Object Admin role).'));
      }
    });

    stream.end(fileBuffer);
  });
}
