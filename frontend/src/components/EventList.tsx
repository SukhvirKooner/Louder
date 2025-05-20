import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;  // Changed to string since MongoDB date is serialized
  venue: string;
  image_url: string;
  ticket_url: string;
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('http://localhost:8000/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        console.log('Received events data:', data); // Debug log
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      // Handle relative dates (e.g., "Tomorrow at 12:00 PM")
      if (dateString.toLowerCase().includes('tomorrow') || 
          dateString.toLowerCase().includes('today') ||
          dateString.toLowerCase().includes('saturday') ||
          dateString.toLowerCase().includes('friday')) {
        return dateString;
      }

      // Handle absolute dates (e.g., "Wed, May 28, 8:30 AM")
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'Invalid date';
      }

      return date.toLocaleString('en-AU', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      console.error('Error formatting date:', err, 'Date string:', dateString);
      return 'Date format error';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <Link
          key={event.id}
          to={`/event/${event.id}`}
          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
        >
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
            <p className="text-gray-600 mb-2">{event.venue}</p>
            <p className="text-gray-500">
              {formatDate(event.date)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default EventList; 