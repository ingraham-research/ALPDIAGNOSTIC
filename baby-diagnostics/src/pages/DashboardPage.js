import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Typography, Box, Button, Paper } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const patientName = location.state?.patientName || 'Unknown Patient';

  const [mockSessions, setMockSessions] = useState([]);

  useEffect(() => {
    const fakeSessions = Array.from({ length: 10 }, (_, i) => ({
      sessionNumber: i + 1,
      date: `2025-0${(i % 9) + 1}-01`,
      alpScore: Math.floor(Math.random() * 7) + 1,
      height: Math.floor(60 + i * 2 + Math.random() * 5), 
      weight: Math.floor(10 + i * 0.5 + Math.random() * 2), 
      speed: Math.floor(10 + Math.random() * 5), 
      maxVelocity: Math.floor(20 + Math.random() * 10), 
    }));
    setMockSessions(fakeSessions);
  }, []);

  const maxAlpScore = Math.max(...mockSessions.map((s) => s.alpScore || 0));
  const maxHeight = Math.max(...mockSessions.map((s) => s.height || 0));
  const maxWeight = Math.max(...mockSessions.map((s) => s.weight || 0));
  const maxVelocity = Math.max(...mockSessions.map((s) => s.maxVelocity || 0));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row', 
        padding: '20px',
      }}
    >
      {/* Left Section: Feature Trends */}
      <Box
        sx={{
          flex: 2,
          paddingRight: '20px',
          borderRight: '1px solid #ddd',
        }}
      >
        <Typography variant="h5" sx={{ marginBottom: '20px' }}>
          Dashboard for {patientName}
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: '30px' }}>
          {mockSessions.length} sessions recorded
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: '400px',
            marginBottom: '30px',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mockSessions}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="sessionNumber"
                label={{ value: 'Session', position: 'insideBottom' }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="alpScore"
                stroke="#8884d8"
                name="ALP Score"
                activeDot={{ r: 8 }}
              />
              <Line type="monotone" dataKey="height" stroke="#82ca9d" name="Height (cm)" />
              <Line type="monotone" dataKey="weight" stroke="#ffc658" name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Box>

      {/* Right Section: Prominent Data Summary */}
      <Box
        sx={{
          flex: 1,
          paddingLeft: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: '20px',
            backgroundColor: '#f7f9fc',
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: '10px' }}>
            Data that we really care about
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            <strong>Current ALP Score:</strong> {maxAlpScore}
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            <strong>Max Height:</strong> {maxHeight} cm
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: '10px' }}>
            <strong>Max Weight:</strong> {maxWeight} kg
          </Typography>
          <Typography variant="body1">
            <strong>Max Velocity:</strong> {maxVelocity} m/s
          </Typography>
        </Paper>

        {/* Go Back Button */}
        <Button
          variant="outlined"
          color="primary"
          sx={{ marginTop: '20px', width: '100%' }}
          onClick={() => navigate('/')}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
}

export default DashboardPage;
