import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import EventDetail from './components/EventDetail';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar onSearchChange={handleSearchChange} />
        <Routes>
          <Route path="/" element={<Home searchTerm={searchTerm} />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App; 