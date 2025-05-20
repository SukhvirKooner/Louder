import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import EventList from './components/EventList';
import EventDetail from './components/EventDetail';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<EventList />} />
            <Route path="/event/:id" element={<EventDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App; 