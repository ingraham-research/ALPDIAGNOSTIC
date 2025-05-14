import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import HomePage from './pages/HomePage';
import AddPatientPage from './pages/AddPatientPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './LoginPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return null; // Prevent routes from rendering until auth state is ready

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={user ? "/home" : "/login"} />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/home" />} />
        <Route path="/home" element={user ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/add-patient" element={user ? <AddPatientPage /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} />} />
      </Routes>

    </Router>
  );
}

export default App;
