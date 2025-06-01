require('dotenv').config();
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

const SOURCE_BUCKET = process.env.S3_SOURCE_BUCKET;
const DEST_BUCKET = process.env.S3_DEST_BUCKET;

const createPatientFolder = async (patientId) => {
  const rawParams = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/raw/`,
    Body: "",
  };
  const processedParams = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/processed/`,
    Body: "",
  };
  const charParams = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/char/`,
    Body: "",
  };
  try {
    await destS3.send(new PutObjectCommand(rawParams));
    await destS3.send(new PutObjectCommand(processedParams));
    await destS3.send(new PutObjectCommand(charParams));
  } catch (error) {
    console.error(`❌ Error creating folders for ${patientId}: ${error.message}`);
  }
};

const listPatients = async () => {
  const params = { Bucket: DEST_BUCKET };
  try {
    const data = await destS3.send(new ListObjectsV2Command(params));
    if (!data.Contents) {
      return [];
    }
    const patientNames = new Set();
    data.Contents.forEach((file) => {
      const patientId = file.Key.split("/")[0];
      patientNames.add(patientId);
    });
    return Array.from(patientNames).map((id) => ({ id }));
  } catch (error) {
    console.error(`❌ Error fetching patients: ${error.message}`);
    return [];
  }
};

const listPatientSessions = async (patientId) => {
  const params = { Bucket: DEST_BUCKET, Prefix: `${patientId}/raw/` };
  try {
    const data = await destS3.send(new ListObjectsV2Command(params));
    if (!data.Contents) {
      return [];
    }
    const validSessions = data.Contents
      .map((file) => ({
        fileName: file.Key.split("/").pop().replace(/(_raw|\.csv)/g, ''),
        url: `https://${DEST_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`,
      }))
      .filter((session) => session.fileName !== '');
    return validSessions;
  } catch (error) {
    console.error(`❌ Error fetching sessions for ${patientId}: ${error.message}`);
    return [];
  }
};

const deleteSessionFile = async (patientId, fileName) => {
  const rawParams = { Bucket: DEST_BUCKET, Key: `${patientId}/raw/${fileName}_raw.csv` };
  const processedParams = { Bucket: DEST_BUCKET, Key: `${patientId}/processed/${fileName}_processed.csv` };
  const charParams = { Bucket: DEST_BUCKET, Key: `${patientId}/char/${fileName}_char.csv` };
  try {
    await destS3.send(new DeleteObjectCommand(rawParams));
    await destS3.send(new DeleteObjectCommand(processedParams));
    await destS3.send(new DeleteObjectCommand(charParams));
  } catch (error) {
    console.error(`❌ Error deleting session file ${fileName} for patient ${patientId}: ${error.message}`);
  }
};

const deletePatientFolder = async (patientId) => {
  const params = { Bucket: DEST_BUCKET, Prefix: `${patientId}/` };
  try {
    const data = await destS3.send(new ListObjectsV2Command(params));
    const deleteParams = {
      Bucket: DEST_BUCKET,
      Delete: { Objects: data.Contents.map((file) => ({ Key: file.Key })) },
    };
    await destS3.send(new DeleteObjectsCommand(deleteParams));
  } catch (error) {
    console.error(`❌ Error deleting files for patient ${patientId}: ${error.message}`);
  }
};

const getRecentFilesFromSource = async (count = 3) => {
  const params = { Bucket: SOURCE_BUCKET, Prefix: `explorer-mini-logger-2/` };
  try {
    const data = await sourceS3.send(new ListObjectsV2Command(params));
    if (!data.Contents || data.Contents.length === 0) {
      return [];
    }
    const recentFiles = data.Contents
      .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
      .slice(0, count)
      .map(file => ({
        key: file.Key,
        fileName: file.Key.split("/").pop(),
        lastModified: file.LastModified
      }));
    return recentFiles;
  } catch (error) {
    console.error(`❌ Error fetching recent files: ${error.message}`);
    return [];
  }
};

const fetchFileContent = async (fileKey) => {
  try {
    const file = await sourceS3.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: fileKey }));
    const fileData = await file.Body.transformToString("utf-8");
    return { fileData, fileName: fileKey.split("/").pop() };
  } catch (error) {
    console.error(`❌ Error fetching selected file: ${error.message}`);
    return null;
  }
};

const runPythonScript = (fileContent, code) => {
  let scriptPath = "";
  if (code == 0) {
    scriptPath = path.resolve(__dirname, 'preprocess_script.py');
  } else {
    scriptPath = path.resolve(__dirname, 'postprocess_script.py');
  }
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath]);
    pythonProcess.stdin.write(fileContent);
    pythonProcess.stdin.end();
    let pythonOutput = '';
    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
    });
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data.toString()}`);
    });
    pythonProcess.on('close', (code) => {
      console.log(`Python script finished with code ${code}`);
      if (code === 0) {
        resolve(pythonOutput);
      } else {
        reject("Python script failed.");
      }
    });
    pythonProcess.on('error', (err) => {
      console.error(`Error spawning Python process: ${err.message}`);
      reject(`Error spawning Python process: ${err.message}`);
    });
  });
};

const processAndUploadSession = async (patientId, sessionNumber, fileName = null, sitOrStand = 'sit') => {
  console.log(`📄 Using selected file: ${fileName}`);
  const session = await fetchFileContent(`explorer-mini-logger-2/${fileName}`);
  if (!session) {
    console.error("❌ No session file found.");
    return "Error: No session file found.";
  }

  const baseName = `${patientId}_${sessionNumber}_${sitOrStand}`;
  const rawFileName = `${baseName}_raw.csv`;
  const uploadParamsRaw = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/raw/${rawFileName}`,
    Body: session.fileData,
    ContentType: "text/csv",
  };

  const processedData = await runPythonScript(session.fileData, 0);
  const processedFileName = `${baseName}_processed.csv`;
  const uploadParamsProcessed = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/processed/${processedFileName}`,
    Body: processedData,
    ContentType: "text/csv",
  };

  const charData = await runPythonScript(processedData, 1);
  const charFileName = `${baseName}_char.csv`;
  const uploadParamsChar = {
    Bucket: DEST_BUCKET,
    Key: `${patientId}/char/${charFileName}`,
    Body: charData,
    ContentType: "text/csv",
  };

  const finalFileName = `${patientId}_${sessionNumber}_${sitOrStand}.csv`;

  try {
    await destS3.send(new PutObjectCommand(uploadParamsRaw));
    await destS3.send(new PutObjectCommand(uploadParamsProcessed));
    await destS3.send(new PutObjectCommand(uploadParamsChar));
    return `File ${finalFileName} uploaded successfully.`;
  } catch (error) {
    console.error(`❌ Error uploading files: ${error.message}`);
    return "Error uploading files.";
  }
};

const listPatientCharSessions = async (patientId) => {
  const params = { Bucket: DEST_BUCKET, Prefix: `${patientId}/char/` };
  try {
    const data = await destS3.send(new ListObjectsV2Command(params));
    if (!data.Contents || data.Contents.length === 0) {
      return [];
    }

    const sessions = data.Contents
      .map((file) => {
        const fileName = file.Key.split("/").pop();
        const match = fileName.match(/S(\d+)_(sit|stand)_char\.csv/);
        if (match) {
          return {
            fileName,
            key: file.Key,
            s: parseInt(match[1], 10),
            posture: match[2],
            url: `https://${DEST_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`,
          };
        }
        return null;
      })
      .filter((session) => session !== null);

    sessions.sort((a, b) => {
      if (a.s !== b.s) return a.s - b.s;
      return a.posture === 'sit' ? -1 : 1;
    });

    const combinedData = [];
    let header = null;
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const file = await destS3.send(new GetObjectCommand({ Bucket: DEST_BUCKET, Key: session.key }));
      const content = await file.Body.transformToString("utf-8");
      const rows = content.split('\n').filter(line => line.trim() !== '');
      if (rows.length < 2) continue;
      if (i === 0) {
        header = rows[0].split(',').map(h => h.trim());
      }
      const values = rows[1].split(',').map(v => v.trim());
      const rowObj = {};
      header.forEach((col, j) => {
        rowObj[col] = values[j] || '';
      });
      rowObj.sessionS = session.s;
      rowObj.posture = session.posture;
      combinedData.push(rowObj);
    }

    return combinedData;
  } catch (error) {
    console.error(`❌ Error fetching char sessions for patient ${patientId}: ${error.message}`);
    return [];
  }
};

module.exports = {
  createPatientFolder,
  processAndUploadSession,
  listPatients,
  listPatientSessions,
  deleteSessionFile,
  deletePatientFolder,
  listPatientCharSessions,
  getRecentFilesFromSource,
  fetchFileContent
};
