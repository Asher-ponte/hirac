
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// =================================================================
// IMPORTANT: Environment Variable Configuration
// =================================================================
// To use Google Cloud Storage, you must set up authentication
// and specify a bucket name.
//
// 1. Set Environment Variables:
//    - This application is configured to read GCS credentials directly
//      from environment variables.
//    - Ensure the following are set in your `.env` file:
//
//      GCS_BUCKET_NAME=your-actual-bucket-name
//      GCS_SERVICE_ACCOUNT_KEY_JSON="{\"type\": "service_account", ...}"
//
//    - GCS_SERVICE_ACCOUNT_KEY_JSON should contain the full JSON content
//      of the service account key.
// =================================================================

const gcsServiceAccountKeyJson = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
const bucketName = process.env.GCS_BUCKET_NAME;

let storage: Storage;

if (!bucketName) {
    console.error("GCS_BUCKET_NAME environment variable is not set.");
}

if (!gcsServiceAccountKeyJson) {
    console.error("GCS_SERVICE_ACCOUNT_KEY_JSON environment variable not set.");
    // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS might be set as a file path
    storage = new Storage();
} else {
    try {
        const credentialsString = gcsServiceAccountKeyJson.replace(/\\n/g, '\n');
        const credentials = JSON.parse(credentialsString);
        storage = new Storage({ credentials });
    } catch (error) {
        console.error("Failed to parse GCS_SERVICE_ACCOUNT_KEY_JSON:", error);
        throw new Error("Invalid GCS service account JSON in environment variable.");
    }
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
