import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

interface NavbarProps {
  onSearchChange: (term: string) => void;
  showEmailModal: boolean;
  onShowEmailModal: () => void;
  onCloseEmailModal: () => void;
  redirectTicketUrl: string;
}

const Navbar: React.FC<NavbarProps> = ({ onSearchChange, showEmailModal, onShowEmailModal, onCloseEmailModal, redirectTicketUrl }) => {
  const [hasSubscribed, setHasSubscribed] = useState(false);
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
      // No need to close modal here, it's handled by onCloseEmailModal prop
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('emailSubmitted', handleEmailSubmitted);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('emailSubmitted', handleEmailSubmitted);
    };
  }, []);

  useEffect(() => {
    // Clear form when modal is opened/closed
    if (showEmailModal) {
      setEmail('');
      setStatus('idle');
      setMessage('');
    }
  }, [showEmailModal]);

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
      window.dispatchEvent(new Event('emailSubmitted'));

      // Close modal and redirect to ticket URL
      onCloseEmailModal(); // Close the modal via prop
      if (redirectTicketUrl) {
        window.location.href = redirectTicketUrl;
      }

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
      <header className="sticky top-0 z-50 bg-black shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Link to="/" className="text-3xl md:text-4xl font-bold font-poppins text-white">
              <span className="text-white">LOUDER</span>
            </Link>
            <span className="hidden md:inline-block ml-2 text-sm text-gray-400">SYDNEY</span>
          </div>
          
          <div className="w-full md:w-1/2 lg:w-1/3 mb-4 md:mb-0">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Search events or venues..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-700 bg-black text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex items-center">
            {!hasSubscribed && (
              <button
                onClick={onShowEmailModal}
                className="bg-white hover:bg-gray-200 text-black font-semibold py-3 px-10 rounded-full focus:outline-none focus:ring-2 focus:ring-white transition"
              >
                Subscribe
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-black rounded-lg p-6 max-w-md w-full text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Subscribe to Events</h2>
              <button
                onClick={onCloseEmailModal}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-black text-white shadow-sm focus:border-white focus:ring-white"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-white text-black py-2 px-4 rounded-md hover:bg-gray-200 transition-colors disabled:bg-gray-400"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe & Continue'}
              </button>
              {message && (
                <p
                  className={`text-center ${
                    status === 'success' ? 'text-green-400' : 'text-red-400'
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