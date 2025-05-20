import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [redirectTicketUrl, setRedirectTicketUrl] = useState('');

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };
  const handleOpenEmailModal = () => {
        setRedirectTicketUrl('');   // no ticket URL
        setShowEmailModal(true);
      };

  const handleShowEmailModal = (ticketUrl: string) => {
    setRedirectTicketUrl(ticketUrl);
    setShowEmailModal(true);
  };

  const handleCloseEmailModal = () => {
    setShowEmailModal(false);
    setRedirectTicketUrl(''); // Clear the URL when closing
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
      <Navbar
          onSearchChange={handleSearchChange}
          showEmailModal={showEmailModal}
          onShowEmailModal={( ) => handleShowEmailModal('')}  // ← use your existing handler
          onCloseEmailModal={handleCloseEmailModal}
          redirectTicketUrl={redirectTicketUrl}
        />
        <Routes>
          <Route path="/" element={<Home searchTerm={searchTerm} onShowEmailModalRequest={handleShowEmailModal} />} />

        </Routes>
      </div>
    </Router>
  );
};

export default App; 