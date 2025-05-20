import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  image_url: string;
  ticket_url: string;
  description: string;
}

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/events/${id}`);
      setEvent({
        ...response.data,
        date: formatDate(response.data.date)
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch event details');
      setLoading(false);
      console.error('Error fetching event:', err);
    }
  };

  const handleGetTickets = () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      setShowEmailModal(true);
    } else {
      window.location.href = event?.ticket_url || '';
    }
  };

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
      setShowEmailModal(false);
      if (event?.ticket_url) {
        window.location.href = event.ticket_url;
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to submit email. Please try again.');
    }
  };

  if (loading) return <div className="text-center py-8">Loading event details...</div>;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;
  if (!event) return <div className="text-center py-8">Event not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative h-96">
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-gray-600">{event.description}</p>
              </div>

              <div className="mt-8">
                <button
                  onClick={handleGetTickets}
                  className="w-full bg-louder-purple hover:bg-louder-purple-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Get Tickets
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                className="w-full bg-louder-purple text-white py-2 px-4 rounded-md hover:bg-louder-purple-dark transition-colors disabled:bg-blue-400"
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe & Continue'}
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
    </div>
  );
};

export default EventDetail; 