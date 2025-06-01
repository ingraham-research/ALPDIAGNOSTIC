import React, { useState } from 'react';
import { Box, TextField, Typography, Button, Paper, Alert, Link } from '@mui/material';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (err) {
      console.error(err);
      setErrorMsg("Login failed. Please check your email and password.");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMsg("Please enter your email first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setErrorMsg('');
    } catch (err) {
      console.error(err);
      setErrorMsg("Could not send reset email. Check if your email is correct.");
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f4f6f8' }}>
      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
        elevation={3}
        sx={{ padding: 4, width: 350, textAlign: 'center' }}
      >
        <Typography variant="h5" gutterBottom>Sign In</Typography>

        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        {resetSent && <Alert severity="success" sx={{ mb: 2 }}>Reset link sent to your email!</Alert>}

        <TextField
          fullWidth
          label="Email"
          type="email"
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          sx={{ mt: 2, mb: 1 }}
        >
          Login
        </Button>

        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={handleForgotPassword}
          sx={{ textTransform: 'none' }}
        >
          Forgot password?
        </Link>

      </Paper>
    </Box>
  );
}

export default LoginPage;
