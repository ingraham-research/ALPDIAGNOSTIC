import React, { useState, useEffect } from 'react';
import { Typography, Button, Box, MenuItem, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Fetch patients from the backend API on component mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/list-patients`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit'  // VERY IMPORTANT for deployed backend to avoid 431 errors
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        setPatients(data);  // Set patients in state
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    fetchPatients();
  }, []);

  // Handle selecting a patient and navigating to their dashboard
  const handleGoToDashboard = () => {
    if (selectedPatient) {
      navigate(`/dashboard`, { state: { patientName: selectedPatient } });
    } else {
      alert('Please select a patient.');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" sx={{ marginBottom: '20px' }}>
        ALP Diagnostics
      </Typography>

      {/* Dropdown for selecting a patient */}
      <TextField
        select
        label="Select Patient"
        value={selectedPatient}
        onChange={(e) => setSelectedPatient(e.target.value)}
        sx={{ marginBottom: '20px', width: '300px' }}
      >
        {patients.length === 0 ? (
          <MenuItem disabled>No patients found</MenuItem>
        ) : (
          patients.map((patient) => (
            <MenuItem key={patient.id} value={patient.id}>
              {patient.id}
            </MenuItem>
          ))
        )}
      </TextField>

      {/* Buttons */}
      <Button
        variant="contained"
        color="primary"
        sx={{ marginBottom: '20px', width: '200px' }}
        onClick={handleGoToDashboard}
      >
        Go to Dashboard
      </Button>
      <Button
        variant="outlined"
        color="secondary"
        sx={{ width: '200px' }}
        onClick={() => navigate('/add-patient')}
      >
        Add Patient
      </Button>
    </Box>
  );
}

export default HomePage;
