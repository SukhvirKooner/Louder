import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  image_url: string;
  ticket_url: string;
}

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`http://localhost:8000/events/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch event details');
        }
        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">Loading event details...</div>;
  }

  if (error || !event) {
    return (
      <div className="text-center py-8 text-red-600">
        {error || 'Event not found'}
      </div>
    );
  }

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
          <p className="text-gray-600 mb-4">{event.description}</p>
          <div className="space-y-2 mb-6">
            <p className="text-gray-700">
              <span className="font-semibold">Date:</span>{' '}
              {new Date(event.date).toLocaleDateString()}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Venue:</span> {event.venue}
            </p>
          </div>
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
          >
            Get Tickets
          </a>
        </div>
      </div>
    </div>
  );
};

export default EventDetail; 