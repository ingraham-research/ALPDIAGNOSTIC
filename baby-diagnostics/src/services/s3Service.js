import { 
    S3Client, 
    ListObjectsV2Command, 
    GetObjectCommand, 
    PutObjectCommand, 
    DeleteObjectCommand, 
    DeleteObjectsCommand 
  } from "@aws-sdk/client-s3";
  
  // Configure two S3 Clients: One for source, one for destination
  const sourceS3 = new S3Client({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
    },
  });
  
  const destS3 = new S3Client({
    region: process.env.REACT_APP_AWS_REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
    },
  });
  
  const SOURCE_BUCKET = process.env.REACT_APP_S3_SOURCE_BUCKET;
  const DEST_BUCKET = process.env.REACT_APP_S3_DEST_BUCKET;
  
  /**
   * Create a new patient folder in S3 (empty object since S3 doesn't support actual folders)
   */
  export const createPatientFolder = async (patientId) => {
    try {
        const rawParams = {
        Bucket: DEST_BUCKET,
        Key: `${patientId}/raw/`,
        Body: "",
        };
        await destS3.send(new PutObjectCommand(rawParams));
        console.log(`✅ Created patient folder: ${patientId}`);

        const processedParams = {
            Bucket: DEST_BUCKET,
            Key: `${patientId}/processed/`, // Creates a directory-like structure
            Body: "",
        };
        
        await destS3.send(new PutObjectCommand(processedParams));
        console.log(`✅ Created patient folder: ${patientId}`);
    } catch (error) {
        console.error(`❌ Error creating patient folder: ${error.message}`);
    }
  };
  
  export const getLatestFileFromSource = async () => {
    const params = {
      Bucket: SOURCE_BUCKET,
      Prefix: "", // No patientId prefix, so fetch all files in the bucket
    };
  
    const data = await sourceS3.send(new ListObjectsV2Command(params));
    if (!data.Contents || data.Contents.length === 0) return null;
  
    // Sort by last modified date (newest first)
    const latestFile = data.Contents.sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))[0];
  
    const getParams = {
      Bucket: SOURCE_BUCKET,
      Key: latestFile.Key,
    };
  
    const file = await sourceS3.send(new GetObjectCommand(getParams));
    const fileData = await file.Body.transformToString("utf-8");
  
    console.log(`✅ Fetched latest session file:`, latestFile.Key);
    return { fileData, fileName: latestFile.Key.split("/").pop() }; // Return file data and name
  };
  
  const { exec } = require('child_process'); // Import exec to run the Python script
  const path = require('path');

  const runPythonScript = (fileContent) => {
    // Use `path.resolve` to get the absolute path to the Python script in your services folder
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
        resolve(stdout);  // This is the processed data returned by Python
      });
    });
  };

  export const processAndUploadSession = async (patientId, visitNumber, sessionNumber) => {
    const session = await getLatestFileFromSource();
    if (!session) return console.log("❌ No session file found.");
  
    const newFileName = `${patientId}_${visitNumber}_${sessionNumber}_raw.csv`;
  
    const uploadParamsRaw = {
      Bucket: DEST_BUCKET,
      Key: `${patientId}/raw/${newFileName}`, 
      Body: session.fileData,
      ContentType: "text/csv",
    };
  
    // Call the Python script to process the session data
    try {
      const processedData = await runPythonScript(session.fileData);
  
      const cleanedFileName = newFileName.replace(/(_raw|\.csv)/g, '');
      const processedFileName = newFileName.replace(/_raw/g, '_processed');
  
      const uploadParamsProcessed = {
        Bucket: DEST_BUCKET,
        Key: `${patientId}/processed/${processedFileName}`,
        Body: processedData,  // Upload the processed data
        ContentType: "text/csv",
      };
  
      // Upload the raw and processed files
      await destS3.send(new PutObjectCommand(uploadParamsRaw));
      await destS3.send(new PutObjectCommand(uploadParamsProcessed));
      return `File ${cleanedFileName} uploaded successfully.`;
    } catch (error) {
      console.error("Error during file upload:", error);
      return null;  // or return a specific error message
    }
  };
  
  export const listPatientSessions = async (patientId) => {
    const params = {
        Bucket: DEST_BUCKET,
        Prefix: `${patientId}/raw/`, // Get all session files
    };

    const data = await destS3.send(new ListObjectsV2Command(params));
    if (!data.Contents || data.Contents.length === 0) return [];

    // Filter out empty session objects (those that are directories)
    const validSessions = data.Contents
        .map((file) => ({
            fileName: file.Key.split("/").pop().replace(/(_raw|\.csv)/g, ''), // Extract filename only
            url: `https://${DEST_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${file.Key}`,
        }))
        .filter((session) => session.fileName !== ''); // Filter out sessions with empty file names

    return validSessions;
};


  /**
 * List all patient folders from S3 (gets folder names only)
 */

  export const listPatients = async () => {
    const params = {
        Bucket: DEST_BUCKET
    };

    try {
        const data = await destS3.send(new ListObjectsV2Command(params));
        if (!data.Contents || data.Contents.length === 0) return [];

        // Extract patient names from file keys
        const patientNames = new Set();
        data.Contents.forEach((file) => {
            const patientId = file.Key.split("/")[0]; // Assuming "patientID/fileName"
            patientNames.add(patientId);
        });

        return Array.from(patientNames).map((id) => ({ id }));
    } catch (error) {
        console.error("❌ Error fetching patients from S3:", error);
        return [];
    }
};
  
  /**
   * Delete a specific session file for a patient
   */
  export const deleteSessionFile = async (patientId, fileName) => {
    const rawParams = {
      Bucket: DEST_BUCKET,
      Key: `${patientId}/raw/${fileName}_raw.csv`,
    };
    const processedParams = {
        Bucket: DEST_BUCKET,
        Key: `${patientId}/processed/${fileName}_processed.csv`,
      };
  
    await destS3.send(new DeleteObjectCommand(rawParams));
    await destS3.send(new DeleteObjectCommand(processedParams));
    console.log(`🗑️ Deleted session ${fileName} for patient ${patientId}`);
    return true;
  };

  /**
   * Delete an entire patient folder and all its files
   */
  export const deletePatientFolder = async (patientId) => {
    const params = {
      Bucket: DEST_BUCKET,
      Prefix: `${patientId}/`, // Get all objects inside patient folder
    };
  
    const data = await destS3.send(new ListObjectsV2Command(params));
    if (!data.Contents || data.Contents.length === 0) return;
  
    // Prepare batch delete request
    const deleteParams = {
      Bucket: DEST_BUCKET,
      Delete: {
        Objects: data.Contents.map((file) => ({ Key: file.Key })),
      },
    };
  
    await destS3.send(new DeleteObjectsCommand(deleteParams));
    console.log(`🗑️ Deleted all files for patient ${patientId}`);
  };

  
  