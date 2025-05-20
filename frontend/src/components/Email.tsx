import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Email: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Check if already subscribed
  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) {
      setEmail(userEmail);
      setSuccess(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Make the API call first
      const response = await axios.post('http://localhost:8000/submit-email', {
        email
      });

      // If API call is successful, save to localStorage
      try {
        localStorage.setItem('userEmail', email);
        console.log('Email saved to localStorage:', email); // Debug log
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError);
      }
      
      // Dispatch custom event for Navbar to update
      const event = new Event('emailSubmitted');
      window.dispatchEvent(event);
      console.log('Email submitted event dispatched'); // Debug log
      
      setSuccess(true);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to submit email. Please try again.');
      }
      console.error('Error submitting email:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Subscribe to Events</h1>
      {success ? (
        <div className="text-green-600 mb-4">
          Thank you for subscribing! You'll receive updates about upcoming events.
          <p className="text-sm text-gray-600 mt-2">Redirecting to home page...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>
          {error && (
            <div className="text-red-600 mb-4">{error}</div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Subscribe'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Email; 