// See patient metrics

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow
} from '@mui/material';
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

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function DashboardPage() {
  const [showJoystickInfo, setShowJoystickInfo] = useState(false);
  const [showBoutInfo, setShowBoutInfo] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const patientName = location.state?.patientName || 'Unknown Patient';

  const [charData, setCharData] = useState([]);
  const [availableChars, setAvailableChars] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [presetMetrics, setPresetMetrics] = useState('');
  const [latestALP, setLatestALP] = useState(null);
  const [latestConfidence, setLatestConfidence] = useState(null);
  const [confidenceScores, setConfidenceScores] = useState({});

  const predefinedPresets = {
    'Session Time': ['session_time_min', 'moving_time_min'],
    'Joystick Bouts': ['num_bouts', 'joy_activations', 'joy_attempts'],
    'Distance': ['path_ft'],
    'Joystick Displacement': ['hist_F', 'hist_FR', 'hist_FL', 'hist_B', 'hist_BR', 'hist_BL'],
    'Bout Duration': ['mean_bout_duration_s', 'max_bout_duration_s'],
  };

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchCharData = async () => {
      try {
        const url = `${BACKEND_URL}/list-patient-char-sessions/${patientName}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();
        setCharData(data);

        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => b.sessionS - a.sessionS);
          const latest = sorted[0];

          setLatestALP(latest.Predicted_Class || 'N/A');
          setLatestConfidence(
            latest.Confidence_Score ? (latest.Confidence_Score * 100).toFixed(1) + '%' : 'N/A'
          );

          setConfidenceScores({
            'Stage 1': latest['Prob_Stage 1'] ? (latest['Prob_Stage 1'] * 100).toFixed(1) + '%' : 'N/A',
            'Stage 2': latest['Prob_Stage 2'] ? (latest['Prob_Stage 2'] * 100).toFixed(1) + '%' : 'N/A',
            'Stage 3': latest['Prob_Stage 3'] ? (latest['Prob_Stage 3'] * 100).toFixed(1) + '%' : 'N/A'
          });

          const keys = Object.keys(latest).filter(key =>
            !['sessionS', 'Timestamp', 'Elapsed Time (s)', 'Elapsed Time (min)'].includes(key)
          );

          setAvailableChars(keys);
          setSelectedMetrics(keys.slice(0, 1));
        }
      } catch (error) {
        console.error('Error fetching char session data:', error.message);
      }
    };

    fetchCharData();
  }, [patientName]);

  const sortedData = [...charData].sort((a, b) => {
    if (a.Timestamp && b.Timestamp) {
      return new Date(a.Timestamp) - new Date(b.Timestamp);
    }
    return a.sessionS - b.sessionS;
  });

  const modifiedData = sortedData.map(item => {
    const parsed = {};
    selectedMetrics.forEach(metric => {
      parsed[metric] = item[metric] !== '' ? parseFloat(item[metric]) : 0;
    });
    return {
      ...item,
      ...parsed,
      sessionLabel: item.sessionS && item.posture
        ? `S${item.sessionS} (${item.posture})`
        : `S${item.sessionS}`,
    };
  });

  const colors = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE'];

  const metricLabels = {
    session_time_min: 'Session Time',
    active_time_min: 'Active Time',
    moving_time_min: 'Moving Time',
    path_ft: 'Distance Traveled',
    hist_FR: 'Front Right',
    hist_F: 'Front',
    hist_FL: 'Front Left',
    hist_BL: 'Back Left',
    hist_B: 'Back',
    hist_BR: 'Back Right',
    num_bouts: 'Joystick Bouts (activations + attempts)',
    joy_activations: 'Joystick Activations',
    joy_attempts: 'Joystick Attempts',
    mean_bout_duration_s: 'Mean Bout Duration',
    max_bout_duration_s: 'Maximum Bout Duration'
  };

  const handlePresetChange = (presetName) => {
    setPresetMetrics(presetName);
    if (predefinedPresets[presetName]) {
      setSelectedMetrics(predefinedPresets[presetName]);
    }
  };

  const totalSessions = charData.length;

  const globalYMax = Math.max(
    ...modifiedData.flatMap(row =>
      selectedMetrics.map(metric => parseFloat(row[metric]) || 0)
    )
  );

return (
  <Box sx={{ padding: '20px', display: 'flex', flexDirection: 'row', gap: '20px' }}>
    {/* Left Side - Chart Section */}
    <Box sx={{ flex: 1 }}>
      <Typography variant="h5" sx={{ marginBottom: '20px', fontWeight: 'bold' }}>
        Dashboard for {patientName}
      </Typography>

      <Paper sx={{ padding: '20px', marginBottom: '20px' }}>
        <Typography variant="subtitle1" sx={{ marginBottom: '10px' }}>
          Select Metric Presets
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: '10px', flexWrap: 'wrap' }}>
          {Object.keys(predefinedPresets).map((preset) => (
            <Button
              key={preset}
              variant="contained"
              color={presetMetrics === preset ? 'primary' : 'default'}
              onClick={() => handlePresetChange(preset)}
            >
              {preset}
            </Button>
          ))}
        </Box>
      </Paper>

      <Paper sx={{ padding: '20px' }}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={modifiedData} margin={{ top: 30, right: 40, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#ccc" />
            <XAxis dataKey="sessionLabel" tick={{ dy: 5 }} />
            <YAxis
              domain={[0, Math.ceil((globalYMax + 1) / 10) * 10]}
              allowDataOverflow={false}
              label={{
                value: selectedMetrics.some(metric => metric.includes('hist')) ? '%' :
                       selectedMetrics.some(metric => metric.includes('time')) ? 'Minutes' :
                       selectedMetrics.some(metric => metric.includes('duration')) ? 'Seconds' :
                       selectedMetrics.some(metric => metric.includes('path') || metric.includes('length')) ? 'Feet' :
                       selectedMetrics.some(metric => metric.includes('num') || metric.includes('joy') || metric.includes('attempts')) ? 'Count' :
                       '',
                angle: -90,
                position: 'insideLeft',
                offset: 10,
                style: { textAnchor: 'middle', fontSize: 15 }
              }}
            />
            <Tooltip
              labelFormatter={(label) => `Session: ${label}`}
              formatter={(value, name) => {
                const label = metricLabels[name] || name;
                const numericValue = parseFloat(value);
                let suffix = '';
                if (name.includes('Front') || name.includes('Back')) suffix = '%';
                else if (name.includes('Time')) suffix = ' min';
                else if (name.includes('Duration')) suffix = ' s';
                else if (name.includes('Distance')) suffix = ' ft';
                else if (name.includes('Joystick')) suffix = ' bouts';
                return [isNaN(numericValue) ? value : `${numericValue.toFixed(1)}${suffix}`, label];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            {selectedMetrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={colors[index % colors.length]}
                name={metricLabels[metric]}
                strokeWidth={3}
                dot={true}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={1500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Box sx={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src="/ALP.png"
          alt="ALP Stage Visual"
          style={{ width: '100%', maxWidth: '1000px', height: 'auto' }}
        />
        <Typography variant="h6" sx={{ marginTop: '0px' }}>
          ALP Stage Overview
        </Typography>
      </Box>
    </Box>

    {/* Right Side - Stats and Controls */}
    <Box sx={{ width: '320px', flexShrink: 0 }}>
      <Paper sx={{ padding: '24px', marginBottom: '24px' }}>
        <Typography variant="body1" sx={{ fontSize: '1.15rem' }}>
          Total Sessions: <strong>{totalSessions}</strong>
        </Typography>

        <Box sx={{ mt: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6}>
              <Typography variant="subtitle1">Predicted ALP Stage:</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{latestALP}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle1">Confidence Score:</Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>{latestConfidence}</Typography>
            </Grid>
          </Grid>

          <Typography variant="subtitle1" sx={{ mt: 3 }}>
            Stage Probabilities:
            <Button
              size="small"
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              sx={{ ml: 1 }}
            >
              {showGroupInfo ? 'Hide Info' : 'What do these mean?'}
            </Button>
          </Typography>

          {showGroupInfo && (
            <Box
              sx={{
                mb: 2,
                mt: 1,
                fontSize: '0.85rem',
                color: 'gray',
                fontFamily: `'Roboto', 'Helvetica', 'Arial', 'sans-serif'`
              }}
            >
              <ul style={{ marginTop: 0, paddingLeft: '20px' }}>
                <li><strong>Stage 1</strong>: Exploring Function, focus on body and device (Phases 1–3)</li>
                <li><strong>Stage 2</strong>: Exploring Sequence, focus on body, device, and environment (Phases 4–5)</li>
                <li><strong>Stage 3</strong>: Exploring Performance, focus on body, device, environment, and activity (Phases 6–8)</li>
              </ul>
            </Box>
          )}

          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Stage 1</TableCell>
                  <TableCell align="right"><strong>{confidenceScores['Stage 1']}</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stage 2</TableCell>
                  <TableCell align="right"><strong>{confidenceScores['Stage 2']}</strong></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Stage 3</TableCell>
                  <TableCell align="right"><strong>{confidenceScores['Stage 3']}</strong></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="caption" sx={{ mt: 10 }} color="text.secondary">
            Disclaimer: This model is not entirely accurate and can make mistakes.
          </Typography>
        </Box>

        {presetMetrics && (
          <Paper sx={{ padding: '20px', marginTop: '24px' }}>
            {presetMetrics === 'Session Time' && (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>Session Time Legend</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '10px' }}>
                  <strong>Session Time:</strong> Total time in the Explorer Mini.
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }} color="text.secondary">
                  <strong>Moving Time:</strong> Total driving time in the Explorer Mini.
                </Typography>
              </>
            )}

            {presetMetrics === 'Joystick Bouts' && (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>Joystick Bouts Legend</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '10px' }}>
                  <strong>Joystick Bouts:</strong> Total joystick activations and attempts.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '10px' }}>
                  <strong>Joystick Activations:</strong> Bouts that led to movement.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '10px' }}>
                  <strong>Joystick Attempts:</strong> Bouts without resulting motion.
                </Typography>
                <Button size="small" onClick={() => setShowJoystickInfo(!showJoystickInfo)} sx={{ mb: 1 }}>
                  {showJoystickInfo ? 'Hide Bout Definition' : 'What is a bout?'}
                </Button>
                {showJoystickInfo && (
                  <Box sx={{ mb: 2, mt: 1, fontSize: '0.85rem', color: 'gray' }}>
                    <ul style={{ marginTop: 0, paddingLeft: '20px' }}>
                      <li>A continuous period during which the joystick is moved away from the neutral position.</li>
                    </ul>
                  </Box>
                )}
              </>
            )}

            {presetMetrics === 'Distance' && (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>Distance Traveled Legend</Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Distance Traveled:</strong> Total path covered by the Explorer Mini.
                </Typography>
              </>
            )}

            {presetMetrics === 'Joystick Displacement' && (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>Joystick Displacement Legend</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '10px' }}>
                  Joystick direction and displacement from neutral (black dot = center).
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <img
                    src="/JOYSTICK.png"
                    alt="Joystick Displacement Diagram"
                    style={{ width: '100%', maxWidth: '400px', height: 'auto' }}
                  />
                </Box>
              </>
            )}

            {presetMetrics === 'Bout Duration' && (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>Bout Duration Legend</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ marginBottom: '10px' }}>
                  <strong>Mean Bout Duration:</strong> Average joystick movement time per session.
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }} color="text.secondary">
                  <strong>Maximum Bout Duration:</strong> Longest single movement detected.
                </Typography>
                <Button size="small" onClick={() => setShowBoutInfo(!showBoutInfo)} sx={{ mb: 1 }}>
                  {showBoutInfo ? 'Hide Bout Definition' : 'What is a Bout?'}
                </Button>
                {showBoutInfo && (
                  <Box sx={{ mb: 2, mt: 1, fontSize: '0.85rem', color: 'gray' }}>
                    <ul style={{ marginTop: 0, paddingLeft: '20px' }}>
                      <li>A continuous period where the joystick is displaced from neutral.</li>
                    </ul>
                  </Box>
                )}
              </>
            )}
          </Paper>
        )}
      </Paper>

      <Button
        variant="outlined"
        color="primary"
        sx={{ width: '100%' }}
        onClick={() => navigate('/home')}
      >
        Go Back
      </Button>
    </Box>
  </Box>
);
} // end of DashboardPage


export default DashboardPage;
