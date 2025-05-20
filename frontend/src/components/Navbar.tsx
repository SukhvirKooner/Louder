import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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

  return (
    <>
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-blue-600">
              Sydney Events Hub
            </Link>
            <div className="flex items-center space-x-4">
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
        </div>
      </nav>

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