const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {
  createPatientFolder,
  processAndUploadSession,
  listPatients,
  listPatientSessions,
  deleteSessionFile,
  deletePatientFolder,
  listPatientCharSessions,
  getRecentFilesFromSource, 
} = require('./services/s3Service');

const app = express();

app.use(cors({
  origin: 'https://alpdiagnostic-nu.vercel.app', // CHANGE HERE helllooooo
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));

// app.use(cors({
//   origin: 'http://localhost:3001', // CHANGE HERE
//   methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type'],
//   credentials: false
// }));

app.use(bodyParser.json());

app.get('/', (req, res) => {
  console.log('Received request for root route');
  res.send('Backend is running');
});

app.post('/create-patient', async (req, res) => {
  const { patientId } = req.body;
  console.log(`Received request to create patient with ID: ${patientId}`);
  try {
    await createPatientFolder(patientId);
    console.log(`Patient folder for ${patientId} created successfully`);
    res.status(200).send(`Patient folder for ${patientId} created`);
  } catch (error) {
    console.error(`Error creating patient folder: ${error.message}`);
    res.status(500).send(`Error creating patient folder: ${error.message}`);
  }
});

app.post('/process-and-upload-session', async (req, res) => {
  const { patientId, sessionNumber, fileName, sitOrStand = 'sit' } = req.body;

  console.log(`Received request to process and upload session for patient ${patientId}, session ${sessionNumber}, file ${fileName}, posture ${sitOrStand}`);

  try {
    const result = await processAndUploadSession(patientId, sessionNumber, fileName, sitOrStand);
    console.log(`✅ Session ${sessionNumber} (${sitOrStand}) uploaded for patient ${patientId} from file ${fileName}`);
    res.status(200).send(result);
  } catch (error) {
    console.error(`❌ Error processing and uploading session: ${error.message}`);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.get('/list-patients', async (req, res) => {
  console.log('Received request to list all patients');
  try {
    const patients = await listPatients();
    console.log(`Fetched list of patients: ${patients.length} found`);
    res.status(200).send(patients);
  } catch (error) {
    console.error(`Error fetching patients: ${error.message}`);
    res.status(500).send(`Error fetching patients: ${error.message}`);
  }
});

app.get('/list-patient-sessions/:patientId', async (req, res) => {
  const { patientId } = req.params;
  console.log(`Received request to list sessions for patient: ${patientId}`);
  try {
    let sessions = await listPatientSessions(patientId);
    console.log(`Fetched sessions for patient ${patientId}: ${sessions.length} found`);
    res.status(200).send(sessions);
  } catch (error) {
    console.error(`Error fetching sessions for patient ${patientId}: ${error.message}`);
    res.status(500).send(`Error fetching sessions: ${error.message}`);
  }
});

app.delete('/delete-session/:patientId/:fileName', async (req, res) => {
  const { patientId, fileName } = req.params;
  console.log(`Received request to delete session file: ${fileName} for patient: ${patientId}`);
  try {
    await deleteSessionFile(patientId, fileName);
    console.log(`Session file ${fileName} deleted for patient ${patientId}`);
    res.status(200).send(`Session file ${fileName} deleted`);
  } catch (error) {
    console.error(`Error deleting session file: ${error.message}`);
    res.status(500).send(`Error deleting session: ${error.message}`);
  }
});

app.delete('/delete-patient/:patientId', async (req, res) => {
  const { patientId } = req.params;
  console.log(`Received request to delete patient with ID: ${patientId}`);
  try {
    await deletePatientFolder(patientId);
    console.log(`Patient ${patientId} and all associated data deleted`);
    res.status(200).send(`Patient ${patientId} and all associated data deleted`);
  } catch (error) {
    console.error(`Error deleting patient ${patientId}: ${error.message}`);
    res.status(500).send(`Error deleting patient: ${error.message}`);
  }
});

app.get('/list-patient-char-sessions/:patientId', async (req, res) => {
  const { patientId } = req.params;
  try {
    const charData = await listPatientCharSessions(patientId);
    res.status(200).json(charData); 
  } catch (error) {
    console.error(`❌ Error fetching char sessions: ${error.message}`);
    res.status(500).send(`Error fetching char sessions: ${error.message}`);
  }
});

app.get('/recent-source-files', async (req, res) => {
  try {
    const recentFiles = await getRecentFilesFromSource(3);
    res.status(200).json(recentFiles);
  } catch (error) {
    console.error(`❌ Error fetching recent source files: ${error.message}`);
    res.status(500).send(`Error fetching recent files: ${error.message}`);
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
