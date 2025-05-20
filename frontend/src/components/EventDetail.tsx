import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDate } from '../utils/dateUtils';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  image_url: string;
  ticket_url: string;
  source_id: string;
}

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem('userEmail') || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/events/${id}`);
        setEvent(response.data);
      } catch (err) {
        setError('Failed to load event details');
        console.error('Error fetching event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setIsSubmitting(true);

    try {
      const response = await axios.post('http://localhost:8000/submit-email', {
        email
      });
      
      // Save email to localStorage
      localStorage.setItem('userEmail', email);
      // Dispatch custom event for Navbar to update
      window.dispatchEvent(new Event('emailSubmitted'));
      setShowEmailModal(false);
      
      // Redirect to the ticket URL after successful submission
      if (event?.ticket_url) {
        window.location.href = event.ticket_url;
      }
    } catch (err: any) {
      if (err.response?.data?.detail) {
        setEmailError(err.response.data.detail);
      } else {
        setEmailError('Failed to submit email. Please try again.');
      }
      console.error('Error submitting email:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetTickets = async () => {
    if (email) {
      // If we already have the email, submit directly
      try {
        const response = await axios.post('http://localhost:8000/submit-email', {
          email
        });
        
        // Dispatch custom event for Navbar to update
        window.dispatchEvent(new Event('emailSubmitted'));
        
        if (event?.ticket_url) {
          window.location.href = event.ticket_url;
        }
      } catch (err: any) {
        if (err.response?.data?.detail) {
          setEmailError(err.response.data.detail);
          setShowEmailModal(true); // Show modal if there's an error
        } else {
          setEmailError('Failed to submit email. Please try again.');
          setShowEmailModal(true);
        }
        console.error('Error submitting email:', err);
      }
    } else {
      // If no email is stored, show the modal
      setShowEmailModal(true);
    }
  };

  if (loading) return <div className="text-center py-8">Loading event details...</div>;
  if (error || !event) return <div className="text-center py-8 text-red-600">{error || 'Event not found'}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-blue-600 hover:text-blue-800"
      >
        ← Back to Events
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-64 object-cover"
        />
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
          <div className="space-y-2 mb-6">
            <p className="text-gray-700">
              <span className="font-semibold">Date:</span>{' '}
              {formatDate(event.date)}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Venue:</span> {event.venue}
            </p>
          </div>
          <button
            onClick={handleGetTickets}
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
          >
            Get Tickets
          </button>
        </div>
      </div>

      {/* Email Subscription Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Get Event Updates</h2>
            <p className="text-gray-600 mb-4">
              Enter your email to receive updates about this event and be redirected to the ticket page.
            </p>
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full p-2 border rounded mb-4"
                required
              />
              {emailError && (
                <p className="text-red-500 mb-4">{emailError}</p>
              )}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Subscribe & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail; 