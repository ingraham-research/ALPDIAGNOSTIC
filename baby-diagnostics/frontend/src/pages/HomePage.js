import React, { useState, useEffect } from 'react';
import { Typography, Button, Box, MenuItem, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

function HomePage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/list-patients`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        setPatients(data);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    fetchPatients();
  }, []);

  const handleGoToDashboard = () => {
    if (selectedPatient) {
      navigate(`/dashboard`, { state: { patientName: selectedPatient } });
    } else {
      alert('Please select a patient.');
    }
  };

  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        navigate('/login');
      })
      .catch((error) => {
        console.error('Logout failed:', error);
      });
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
      <Button
        variant="text"
        color="error"
        sx={{ marginTop: '50px', width: '200px' }}
        onClick={handleLogout}
      >
        Log Out
      </Button>
    </Box>
  );
}

export default HomePage;
