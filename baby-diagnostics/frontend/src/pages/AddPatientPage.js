import React, { useState, useEffect } from "react";
import { Typography, Button, Box, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
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

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    console.log("Loading patients..."); // Debugging message
    setLoading(true);
    const response = await fetch(`${BACKEND_URL}/list-patients`);  // Ensure you're using the correct backend URL
    const patientsData = await response.json();
    console.log("Patients loaded:", patientsData); // Debugging message
    setPatients(patientsData);
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
    console.log(`Selecting patient with ID: ${patientId}`); // Debugging message
    setSelectedPatient(patientId);
    setShowDialog(true);
    setLoading(true);

    const response = await fetch(`${BACKEND_URL}/list-patient-sessions/${patientId}`);  // Adjusted API path
    console.log('Fetching sessions for patient:', patientId); // Debugging message
    const sessionsData = await response.json();
    console.log("Sessions data:", sessionsData); // Debugging message
    setSessions(sessionsData);
    setLoading(false);
  };

  const handleSyncLatestFile = async (patientId) => {
    let visitNumber = prompt("Please enter the visit number (e.g., V1, V2):");
    const sessionNumber = prompt("Please enter the session number (e.g., S1, S2):");

    if (!visitNumber || !sessionNumber) {
      alert("❌ Visit number and session number are required!");
      return;
    }

    if (!/V\d+/i.test(visitNumber) || !/S\d+/i.test(sessionNumber)) {
      alert("❌ Invalid format for visit number or session number. Please follow the format 'V1', 'S1'.");
      return;
    }

    console.log(`Syncing latest file for patient ${patientId} with visit ${visitNumber} and session ${sessionNumber}`); // Debugging message
    
    visitNumber = visitNumber.replace('V', 'T')

    setSyncLoading((prev) => ({ ...prev, [patientId]: true }));

    const response = await fetch(`${BACKEND_URL}/process-and-upload-session`, {  // Adjusted API path
      method: "POST",
      body: JSON.stringify({ patientId, visitNumber, sessionNumber }),
      headers: { "Content-Type": "application/json" },
    });
    const message = await response.text();
    console.log("Response from sync request:", message); // Debugging message

    if (response.ok) {
      alert(`✅ ${message}`);
    } else {
      alert(`❌ Sync failed for ${patientId}`);
    }

    setSyncLoading((prev) => ({ ...prev, [patientId]: false }));
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
    fileName = fileName.replace('V', 'T')
    const response = await fetch(`${BACKEND_URL}/delete-session/${patient}/${fileName}`, { method: "DELETE" });  // Adjusted API path
    if (response.ok) {
      alert("🗑️ Session file deleted!");
      handleSelectPatient(patient);
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

      <Button variant="outlined" color="primary" sx={{ marginTop: "20px", width: "200px" }} onClick={() => navigate("/")}>
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
