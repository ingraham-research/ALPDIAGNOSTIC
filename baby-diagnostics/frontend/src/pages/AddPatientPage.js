import React, { useState, useEffect } from "react";
import {
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";

import { useNavigate } from "react-router-dom";

function AddPatientPage() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [syncLoading, setSyncLoading] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // For Delete Confirmation
  const navigate = useNavigate();

  const [recentFiles, setRecentFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [pendingPatientId, setPendingPatientId] = useState('');
  const [pendingSessionNumber, setPendingSessionNumber] = useState('');

  const [showSessionHelp, setShowSessionHelp] = useState(false);
  const [isStand, setIsStand] = useState(false);




  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    console.log("Loading patients...");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/list-patients`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const patientsData = await response.json();
      console.log("Patients loaded:", patientsData);
      setPatients(patientsData);
    } catch (error) {
      console.error('Error loading patients:', error.message);
    }

    setLoading(false);
  };

  const handleAddPatient = async () => {
    const patientId = prompt("Enter patient ID:");
    if (!patientId) return;

    if (patients.some((p) => p.id === patientId)) {
      alert("⚠️ Patient ID already exists!");
      return;
    }

    console.log(`Sending request to add patient with ID: ${patientId}`); // Debugging message
    await fetch(`${BACKEND_URL}/create-patient`, {  // Adjusted API path
      method: "POST",
      body: JSON.stringify({ patientId }),
      headers: { "Content-Type": "application/json" },
    });

    alert(`✅ Patient ${patientId} added!`);
    loadPatients(); // Refresh list
  };

  const handleSelectPatient = async (patientId) => {
    console.log(`Selecting patient with ID: ${patientId}`);
    setSelectedPatient(patientId);
    setShowDialog(true);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/list-patient-sessions/${patientId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const sessionsData = await response.json();
      console.log("Sessions data:", sessionsData);

      sessionsData.sort((a, b) => {
        const getSessionNumber = (fileName) => {
          const match = fileName.match(/S(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getSessionNumber(a.fileName) - getSessionNumber(b.fileName);
      });

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error.message);
    }

    setLoading(false);
  };

  // const handleSyncLatestFile = async (patientId) => {
  //   const sessionNumber = prompt("Please enter the session number (e.g., S1, S2):");

  //   if (!sessionNumber) {
  //     alert("❌ Session number is required!");
  //     return;
  //   }

  //   if (!/S\d+/i.test(sessionNumber)) {
  //     alert("❌ Invalid format for session number. Please follow the format 'S1', 'S2'.");
  //     return;
  //   }

  //   console.log(`Syncing latest file for patient ${patientId} with session ${sessionNumber}`); // Debugging message

  //   setSyncLoading((prev) => ({ ...prev, [patientId]: true }));

  //   const response = await fetch(`${BACKEND_URL}/process-and-upload-session`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     credentials: 'omit',
  //     body: JSON.stringify({ patientId, sessionNumber })
  //   });
  //   const message = await response.text();
  //   console.log("Response from sync request:", message); // Debugging message

  //   if (response.ok) {
  //     alert(`✅ ${message}`);
  //   } else {
  //     alert(`❌ Sync failed for ${patientId}`);
  //     setSyncLoading((prev) => ({ ...prev, [patientId]: false }));
  //     return;
  //   }

  //   setSyncLoading((prev) => ({ ...prev, [patientId]: false }));
  //   loadPatients();
  // };

  const handleSyncLatestFile = async (patientId) => {
    const sessionNumber = prompt("Please enter the session number (e.g., S1, S2):");

    if (!sessionNumber || !/S\d+$/i.test(sessionNumber)) {
      alert("❌ Invalid session number format.");
      return;
    }

    setPendingPatientId(patientId);
    setPendingSessionNumber(sessionNumber);
    setShowSessionHelp(false); 
    setIsStand(false);

    try {
      const response = await fetch(`${BACKEND_URL}/recent-source-files`);
      const files = await response.json();
      setRecentFiles(files);
      setShowFileDialog(true);  // open file picker
    } catch (error) {
      console.error("❌ Error fetching recent files:", error.message);
      alert("Failed to load recent files.");
    }
  };

  const confirmFileSync = async () => {
    if (!selectedFile) {
      alert("Please select a file.");
      return;
    }

    setShowFileDialog(false);
    setSelectedFile(null);

    setSyncLoading((prev) => ({ ...prev, [pendingPatientId]: true }));

    

    const response = await fetch(`${BACKEND_URL}/process-and-upload-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
      patientId: pendingPatientId,
      sessionNumber: pendingSessionNumber,
      fileName: selectedFile.fileName,
      sitOrStand: isStand ? 'stand' : 'sit',  // ✅ added this
    }),
    });

    const message = await response.text();

    if (response.ok) {
      alert(`✅ ${message}`);
    } else {
      alert(`❌ Sync failed: ${message}`);
    }

    setSyncLoading((prev) => ({ ...prev, [pendingPatientId]: false }));
    loadPatients();
  };



  const handleDeletePatient = async (patientId) => {
    console.log(`Preparing to delete patient with ID: ${patientId}`); // Debugging message
    setShowDeleteDialog(true);
    setSelectedPatient(patientId);
  };

  const confirmDeletePatient = async () => {
    console.log(`Deleting patient with ID: ${selectedPatient}`); // Debugging message
    const response = await fetch(`${BACKEND_URL}/delete-patient/${selectedPatient}`, { method: "DELETE" });  // Adjusted API path
    if (response.ok) {
      alert("🗑️ Patient and all associated files deleted!");
      loadPatients();
    }
    setShowDeleteDialog(false);
  };

  const handleDeleteSession = async (patient, fileName) => {
    if (!window.confirm("Are you sure you want to delete this session file?")) return;

    console.log(`Deleting session file: ${fileName} for patient: ${patient}`); // Debugging message
    const response = await fetch(`${BACKEND_URL}/delete-session/${selectedPatient}/${fileName}`, {
      method: 'DELETE',
      credentials: 'omit'
    });
    if (response.ok) {
      alert("🗑️ Session file deleted!");
      handleSelectPatient(patient);
    } else {
      alert("❌ Failed to delete patient.");
      return;
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", textAlign: "center" }}>
      <Typography variant="h5" sx={{ marginBottom: "20px" }}>Manage Patients</Typography>

      <Button variant="contained" color="primary" sx={{ marginBottom: "10px" }} onClick={handleAddPatient}>
        ➕ Add Patient
      </Button>

      <Button variant="outlined" sx={{ marginBottom: "10px" }} onClick={loadPatients}>
        🔄 Refresh Patients
      </Button>

      <Typography variant="h6" sx={{ marginTop: "20px", marginBottom: "10px" }}>Existing Patients</Typography>

      {loading ? (
        <Typography variant="body1" sx={{ color: "#666" }}>Loading...</Typography>
      ) : patients.length === 0 ? (
        <Typography variant="body1" sx={{ color: "#666" }}>No patients found.</Typography>
      ) : (
        <List sx={{ width: "100%", maxWidth: "500px", backgroundColor: "#f7f9fc", padding: "10px" }}>
          {patients.map((patient) => (
            <ListItem key={patient.id} sx={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ddd", padding: "10px" }}>
              <ListItemText primary={patient.id} sx={{ flex: 1 }} />
              <Button 
                variant="outlined" 
                color="secondary" 
                onClick={() => handleSyncLatestFile(patient.id)}
                disabled={syncLoading[patient.id]}
              >
                {syncLoading[patient.id] ? "🔄 Syncing..." : "🔄 Sync"}
              </Button>
              <Button variant="outlined" color="primary" onClick={() => handleSelectPatient(patient.id)}>
                📂 View Sessions
              </Button>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={() => handleDeletePatient(patient.id)}
              >
                🗑️ Delete Patient
              </Button>
            </ListItem>
          ))}
        </List>
      )}

      <Button variant="outlined" color="primary" sx={{ marginTop: "20px", width: "200px" }} onClick={() => navigate("/home")}>
        Go Back
      </Button>

      {/* Delete Patient Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Confirm Patient Deletion</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the patient and all associated files?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button onClick={confirmDeletePatient} color="error">
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Selection Dialog */}
      <Dialog open={showFileDialog} onClose={() => {
        setShowFileDialog(false);
        setSelectedFile(null); // reset selection
      }}>
        <DialogTitle>Select File to Sync</DialogTitle>
        <DialogContent>
          <List>
            {recentFiles.map((file) => (
              <ListItem key={file.fileName} disablePadding>
                <ListItemButton
                  selected={selectedFile?.fileName === file.fileName}
                  onClick={() => setSelectedFile(file)}
                  sx={{
                    borderRadius: '12px',
                    '&.Mui-selected': {
                      backgroundColor: '#1976d2',  // Medium blue
                      color: 'white',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: '#1565c0',  // Slightly darker on hover
                    },
                  }}
                >
                  <ListItemText
                    primary={file.fileName}
                    secondary={`Last Modified: ${new Date(file.lastModified).toLocaleString()}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel id="posture-label">Posture</InputLabel>
            <Select
              labelId="posture-label"
              id="posture-select"
              value={isStand ? 'stand' : 'sit'}
              label="Posture"
              onChange={(e) => setIsStand(e.target.value === 'stand')}
            >
              <MenuItem value="sit">Sit</MenuItem>
              <MenuItem value="stand">Stand</MenuItem>
            </Select>
          </FormControl>


        <Typography variant="body2" sx={{ mt: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
  <Button
    size="small"
    onClick={() => setShowSessionHelp(!showSessionHelp)}
    sx={{ ml: 1 }}
    color="primary"
  >
    {showSessionHelp ? 'Hide Help' : 'Didn’t find your session?'}
  </Button>
</Typography>

{showSessionHelp && (
  <Box
    sx={{
      mt:1,
      mb: 2,
      pl: 3, 
    }}
  >
  <Typography
    component="div"
    sx={{
      fontSize: '0.85rem', 
      color: 'gray',
      fontFamily: `'Roboto', 'Helvetica', 'Arial', 'sans-serif'`,
      whiteSpace: 'pre-line',
    }}
  >
    We’re sorry! This could be a wifi error, but here are some troubleshooting suggestions:
    {'\n'} • Please check that the power button is lit blue before recording.
    {'\n'} • Please check that the EM Mini blinks when recording.
    {'\n'} • Please try to sync again.
    {'\n'} • Please try to record a session again.

  </Typography>
  </Box>
)}



        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowFileDialog(false);
            setSelectedFile(null); // ✅ reset file selection when cancel is clicked
          }}>
            Cancel
          </Button>
          <Button onClick={confirmFileSync} color="primary">Sync Selected File</Button>
        </DialogActions>
      </Dialog>


      {/* Patient Sessions Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>Sessions for {selectedPatient}</DialogTitle>
        <DialogContent>
          {loading ? (
            <Typography>Loading...</Typography>
          ) : sessions.length === 0 ? (
            <Typography>No sessions found.</Typography>
          ) : (
            <List>
              {sessions.map((session) => (
                <ListItem key={session.fileName}>
                  <ListItemText primary={session.fileName} />
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleDeleteSession(selectedPatient, session.fileName)}
                  >
                    🗑️ Delete
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)} color="secondary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AddPatientPage;
 

