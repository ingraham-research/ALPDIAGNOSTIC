// ipconfig getifaddr en0
// npm start --host 0.0.0.0
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AddPatientPage from './pages/AddPatientPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add-patient" element={<AddPatientPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
