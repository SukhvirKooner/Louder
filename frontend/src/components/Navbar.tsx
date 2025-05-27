import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Navbar as ResizableNavbar,
  NavBody,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from './ui/resizable-navbar';

export interface NavbarProps {
  onSearchChange: (term: string) => void;
  showEmailModal: boolean;
  onShowEmailModal: () => void;
  onCloseEmailModal: () => void;
  redirectTicketUrl: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Navbar: React.FC<NavbarProps> = ({ onSearchChange, showEmailModal, onShowEmailModal, onCloseEmailModal, redirectTicketUrl }) => {
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const checkSubscription = () => {
    const userEmail = localStorage.getItem('userEmail');
    setHasSubscribed(!!userEmail);
  };

  useEffect(() => {
    checkSubscription();
    const onStorage = (e: StorageEvent) => e.key === 'userEmail' && checkSubscription();
    const onEmailSubmitted = () => checkSubscription();
    window.addEventListener('storage', onStorage);
    window.addEventListener('emailSubmitted', onEmailSubmitted);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('emailSubmitted', onEmailSubmitted);
    };
  }, []);

  useEffect(() => {
    if (showEmailModal) {
      setEmail('');
      setStatus('idle');
      setMessage('');
    }
  }, [showEmailModal]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearchChange(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    // If already logged in, call /submit-email
    if (localStorage.getItem('userEmail')) {
      try {
        const res = await fetch(`${API_URL}/submit-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage('You are already subscribed!');
          setStatus('success');
          setTimeout(() => {
            onCloseEmailModal();
            window.open(redirectTicketUrl, '_blank');
          }, 1000);
        } else {
          setMessage(data.detail || 'Failed to subscribe');
          setStatus('error');
        }
      } catch (err) {
        setMessage('Failed to subscribe');
        setStatus('error');
      }
      return;
    }

    // Not logged in, send OTP
    try {
      const res = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('OTP sent to your email!');
        setShowOtpInput(true);
        setStatus('idle');
      } else {
        setMessage(data.detail || 'Failed to send OTP');
        setStatus('error');
      }
    } catch (err) {
      setMessage('Failed to send OTP');
      setStatus('error');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('OTP verified successfully!');
        setStatus('success');
        localStorage.setItem('userEmail', email);
        setTimeout(() => {
          onCloseEmailModal();
          window.open(redirectTicketUrl, '_blank');
        }, 1000);
      } else {
        setMessage(data.detail || 'Invalid OTP');
        setStatus('error');
      }
    } catch (err) {
      setMessage('Failed to verify OTP');
      setStatus('error');
    }
  };

  return (
    <>
      <ResizableNavbar>
        <NavBody>
          <div className="flex items-center mb-4 md:mb-0">
            <Link to="/" className="text-3xl md:text-4xl font-bold font-poppins text-white">
              <span className="text-white">LOUDER</span>
            </Link>
            <span className="hidden md:inline-block ml-2 text-sm text-gray-400">SYDNEY</span>
          </div>

          <div className="relative w-96">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search events or venues..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-96 pl-10 pr-4 py-2 rounded-full border border-gray-700 bg-black text-white focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          <div className="flex items-center">
            {!hasSubscribed && (
              <NavbarButton variant="primary" onClick={onShowEmailModal}>
                Subscribe
              </NavbarButton>
            )}
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <div className="flex items-center mb-4 md:mb-0">
            <Link to="/" className="text-3xl md:text-4xl font-bold font-poppins text-white">
              <span className="text-white">LOUDER</span>
            </Link>
            <span className="hidden md:inline-block ml-2 text-sm text-gray-400">SYDNEY</span>
          </div>
            <MobileNavToggle isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(open => !open)} />
          </MobileNavHeader>

          <MobileNavMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)}>
            <div className="px-4 items-center">
              <input
                type="text"
                placeholder="Search events or venues..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-700 bg-black text-white focus:outline-none focus:ring-2 focus:ring-white mb-4"
              />
              {!hasSubscribed && (
                <NavbarButton variant="primary" className="w-full" onClick={() => { setIsMobileMenuOpen(false); onShowEmailModal(); }}>
                  Subscribe
                </NavbarButton>
              )}
            </div>
          </MobileNavMenu>
        </MobileNav>
      </ResizableNavbar>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-black rounded-lg p-6 max-w-md w-full text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Subscribe to Events</h2>
              <button onClick={onCloseEmailModal} className="text-gray-400 hover:text-gray-200">✕</button>
            </div>
            {!showOtpInput ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="block w-full rounded-md border-gray-700 bg-black text-white focus:border-white focus:ring-white"
                />
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="bg-white text-black py-2 px-10 rounded-full hover:bg-gray-200 disabled:bg-gray-400 font-semibold"
                  >
                    {status === 'loading' ? 'Sending...' : 'Subscribe & Continue'}
                  </button>
                </div>
                {message && (
                  <p className={`text-center ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
                )}
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  required
                  className="block w-full rounded-md border-gray-700 bg-black text-white focus:border-white focus:ring-white"
                />
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="bg-white text-black py-2 px-10 rounded-full hover:bg-gray-200 disabled:bg-gray-400 font-semibold"
                  >
                    {status === 'loading' ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
                {message && (
                  <p className={`text-center ${status === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;