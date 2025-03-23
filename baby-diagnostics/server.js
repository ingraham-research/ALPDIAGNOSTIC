const express = require('express');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();

// Enable CORS for all requests
app.use(cors());

// Middleware to parse incoming JSON requests
app.use(bodyParser.json());

// Create two S3 Clients for source and destination
const sourceS3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const destS3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Set the S3 bucket names
const SOURCE_BUCKET = process.env.S3_SOURCE_BUCKET;
const DEST_BUCKET = process.env.S3_DEST_BUCKET;

// Function to get the latest file from the source bucket
const getLatestFileFromSource = async () => {
  const params = { Bucket: SOURCE_BUCKET, Prefix: '' };

  const data = await sourceS3.send(new ListObjectsV2Command(params));
  if (!data.Contents || data.Contents.length === 0) return null;

  const latestFile = data.Contents.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))[0];
  const getParams = { Bucket: SOURCE_BUCKET, Key: latestFile.Key };
  const file = await sourceS3.send(new GetObjectCommand(getParams));
  const fileData = await file.Body.transformToString('utf-8');

  return { fileData, fileName: latestFile.Key.split('/').pop() }; // Return the file content and name
};

// Function to process data with Python
const runPythonScript = (fileContent) => {
  const scriptPath = path.resolve(__dirname, 'preprocess_script.py');
  return new Promise((resolve, reject) => {
    exec(`python3 ${scriptPath}`, { input: fileContent }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing script: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
};

// Function to process and upload session data to S3
app.post('/process-and-upload-session', async (req, res) => {
  const { patientId, visitNumber, sessionNumber } = req.body;

  const session = await getLatestFileFromSource();
  if (!session) return res.status(400).send('No session file found.');

  const newFileName = `${patientId}_${visitNumber}_${sessionNumber}_raw.csv`;
  const uploadParamsRaw = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/raw/${newFileName}`,
    Body: session.fileData,
    ContentType: 'text/csv',
  };

  try {
    // Run Python script to process the data
    const processedData = await runPythonScript(session.fileData);

    // Prepare the processed file name and upload parameters
    const processedFileName = newFileName.replace(/_raw/g, '_processed');
    const uploadParamsProcessed = {
      Bucket: DEST_BUCKET,
      Key: `${patientId}/processed/${processedFileName}`,
      Body: processedData,
      ContentType: 'text/csv',
    };

    // Upload the raw and processed files to S3
    await destS3.send(new PutObjectCommand(uploadParamsRaw));
    await destS3.send(new PutObjectCommand(uploadParamsProcessed));

    res.status(200).send(`File ${newFileName} uploaded successfully.`);
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).send('Error uploading file');
  }
});

// Start the backend server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
