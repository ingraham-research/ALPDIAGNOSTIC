import React, { useState, useEffect } from "react";
import { Typography, Button, Box, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { createPatientFolder, processAndUploadSession, listPatients, listPatientSessions, deleteSessionFile, deletePatientFolder } from "../services/s3Service";

function AddPatientPage() {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDialog, setShowDialog] = useState(false);
    const [syncLoading, setSyncLoading] = useState({}); // Track sync state per patient
    const [showDeleteDialog, setShowDeleteDialog] = useState(false); // For Delete Confirmation
    const navigate = useNavigate();
    

    // Load patients from S3 on page load
    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        setLoading(true);
        const patientsFromS3 = await listPatients();
        setPatients(patientsFromS3);
        setLoading(false);
    };

    const handleAddPatient = async () => {
        const patientId = prompt("Enter patient ID:");
        if (!patientId) return;

        if (patients.some((p) => p.id === patientId)) {
            alert("⚠️ Patient ID already exists!");
            return;
        }

        await createPatientFolder(patientId);
        alert(`✅ Patient ${patientId} added!`);
        loadPatients(); // Refresh list
    };

    const handleSelectPatient = async (patientId) => {
        setSelectedPatient(patientId);
        setShowDialog(true);
        setLoading(true);
        
        const patientSessions = await listPatientSessions(patientId);
        setSessions(patientSessions);
        setLoading(false);
    };

    const handleSyncLatestFile = async (patientId) => {
        // Prompt the user for the visit and session numbers
        const visitNumber = prompt("Please enter the visit number (e.g., T1, T2):");
        const sessionNumber = prompt("Please enter the session number (e.g., S1, S2):");

        if (!visitNumber || !sessionNumber) {
            alert("❌ Visit number and session number are required!");
            return; // Exit if inputs are not provided
        }

        // Optionally, you can check if the entered values are valid
        if (!/T\d+/i.test(visitNumber) || !/S\d+/i.test(sessionNumber)) {
            alert("❌ Invalid format for visit number or session number. Please follow the format 'T1', 'S1'.");
            return;
        }

        // Set the loading state to indicate syncing is in progress
        setSyncLoading((prev) => ({ ...prev, [patientId]: true }));

        // Call the function to sync the latest file to the patient
        const message = await processAndUploadSession(patientId, visitNumber, sessionNumber);
        
        // Display the result
        if (message) {
            alert(`✅ ${message}`);
        } else {
            alert(`❌ Sync failed for ${patientId} ${message}`);
        }

        // Reset the loading state
        setSyncLoading((prev) => ({ ...prev, [patientId]: false }));

        // Refresh the patient list
        loadPatients();
    };

    const handleDeletePatient = async (patientId) => {
        setShowDeleteDialog(true);
        setSelectedPatient(patientId);
    };

    const confirmDeletePatient = async () => {
        if (window.confirm("Are you sure you want to delete this patient and all their data?")) {
            await deletePatientFolder(selectedPatient); // Call the service function to delete the patient folder
            alert("🗑️ Patient and all associated files deleted!");
            loadPatients(); // Refresh the patient list after deletion
        }
        setShowDeleteDialog(false); // Close the confirmation dialog
    };

    const handleDeleteSession = async (patient, fileName) => {
        if (!window.confirm("Are you sure you want to delete this session file?")) return;
        
        const success = await deleteSessionFile(patient, fileName);
        if (success) {
            alert("🗑️ Session file deleted! Exit and open again to refresh.");
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
                            {sessions.map((session, index) => (
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
