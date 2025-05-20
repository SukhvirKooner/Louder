import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [hasSubscribed, setHasSubscribed] = useState(false);

  const checkSubscription = () => {
    const userEmail = localStorage.getItem('userEmail');
    setHasSubscribed(!!userEmail);
  };

  useEffect(() => {
    // Initial check
    checkSubscription();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userEmail') {
        checkSubscription();
      }
    };

    // Listen for custom event
    const handleEmailSubmitted = () => {
      checkSubscription();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('emailSubmitted', handleEmailSubmitted);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emailSubmitted', handleEmailSubmitted);
    };
  }, []);

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600">
            Sydney Events Hub
          </Link>
          <div className="flex items-center space-x-4">
            {!hasSubscribed && (
              <Link
                to="/email"
                className="text-blue-600 hover:text-blue-800"
              >
                Subscribe
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 