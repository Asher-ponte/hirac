
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// =================================================================
// IMPORTANT: Environment Variable Configuration
// =================================================================
// To use Google Cloud Storage, you must set up authentication
// and specify a bucket name.
//
// 1.  Create a Service Account in your Google Cloud Project with the "Storage Admin" role.
// 2.  Download the JSON key file for that service account.
// 3.  Place the key file in the root directory of this project.
//
// 4.  Set Environment Variables in your `.env` file:
//     - Create a `.env` file in the root of your project if it doesn't exist.
//     - Add the following variables:
//
//       GCS_BUCKET_NAME=your-actual-bucket-name
//       GOOGLE_APPLICATION_CREDENTIALS=your-service-account-key-file.json
//
//     - Replace the placeholder values with your actual bucket name and the
//       filename of the key you downloaded.
// =================================================================

const bucketName = process.env.GCS_BUCKET_NAME;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// The Storage constructor will automatically use the credentials from the
// GOOGLE_APPLICATION_CREDENTIALS environment variable.
let storage: Storage;
try {
    if (!keyFilename) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.");
    }
    storage = new Storage({
        keyFilename: keyFilename,
    });
} catch (error) {
    console.error("Failed to initialize Google Cloud Storage. Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly.", error);
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
    resumable: false,
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      console.error("GCS Upload Stream Error:", err);
      reject(new Error('Failed to upload file to Google Cloud Storage.'));
    });

    stream.on('finish', async () => {
      try {
        // Make the file public
        await gcsFile.makePublic();
        
        // Return the public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;
        resolve(publicUrl);
      } catch (err) {
          console.error("GCS Make Public Error:", err);
          reject(new Error('Failed to make file public. Check GCS permissions.'));
      }
    });

    stream.end(fileBuffer);
  });
}
