import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

interface NavbarProps {
  onSearchChange: (term: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearchChange }) => {
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
      setShowEmailModal(false);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('emailSubmitted', handleEmailSubmitted);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emailSubmitted', handleEmailSubmitted);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/submit-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit email');
      }

      setStatus('success');
      setMessage('Thank you for subscribing!');

      try {
        localStorage.setItem('userEmail', email);
        console.log('Email saved to localStorage:', email);
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
      }

      // Dispatch event to notify other components
      const event = new Event('emailSubmitted');
      window.dispatchEvent(event);
    } catch (err) {
      setStatus('error');
      setMessage('Failed to submit email. Please try again.');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange(value);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Link to="/" className="text-3xl md:text-4xl font-bold font-poppins text-louder-purple">
              <span className="text-louder-purple-dark">LOUDER</span>
            </Link>
            <span className="hidden md:inline-block ml-2 text-sm text-gray-500">SYDNEY</span>
          </div>
          
          <div className="w-full md:w-1/2 lg:w-1/3 mb-4 md:mb-0">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search events or venues..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-louder-purple focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex items-center">
            {!hasSubscribed && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="text-blue-600 hover:text-blue-800"
              >
                Subscribe
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Subscribe to Events</h2>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
              {message && (
                <p
                  className={`text-center ${
                    status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar; 