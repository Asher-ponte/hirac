
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// =================================================================
// IMPORTANT: Environment Variable Configuration
// =================================================================
// To use Google Cloud Storage, you must set up authentication
// and specify a bucket name.
//
// 1. Authentication with a Service Account:
//    - In your Google Cloud project, go to "IAM & Admin" > "Service Accounts".
//    - Create a new service account. Give it a descriptive name.
//    - Grant the service account the "Storage Admin" role. This gives it
//      permissions to read and write files in GCS buckets.
//    - After creating the service account, go to its "Keys" tab,
//      click "Add Key", and create a new JSON key.
//    - A JSON file will be downloaded. Securely store this file.
//
// 2. Set Environment Variables:
//    - Create a `.env` file in the root of your project if you haven't already.
//    - Add the following variables to your `.env` file:
//
//      GCS_BUCKET_NAME=your-actual-bucket-name
//      GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/downloaded-service-account-key.json
//
//    - IMPORTANT: Replace `your-actual-bucket-name` with your real GCS bucket name.
//    - IMPORTANT: Replace the path with the *absolute path* to the JSON key file you downloaded.
//
// 3. Ensure `.env` is in `.gitignore` to keep your credentials secure.
// =================================================================

const gcsKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const bucketName = process.env.GCS_BUCKET_NAME;

if (!gcsKeyFile || !bucketName) {
    console.error("GCS environment variables not fully set. Check GCS_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS.");
    // We don't throw an error here to allow the app to run without GCS configured,
    // but file uploads will fail. The frontend should handle the error gracefully.
}

const storage = gcsKeyFile ? new Storage({ keyFilename: gcsKeyFile }) : new Storage();

/**
 * Uploads a file to Google Cloud Storage.
 * @param file The file to upload.
 * @returns The public URL of the uploaded file.
 */
export async function uploadFile(file: File): Promise<string> {
  if (!bucketName) {
    throw new Error("GCS_BUCKET_NAME environment variable is not set.");
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
      reject(err);
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
          reject(err);
      }
    });

    stream.end(fileBuffer);
  });
}
