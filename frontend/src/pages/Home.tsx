import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from '../components/EventCard';
import { formatDate } from '../utils/dateUtils';

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  image_url: string;
  ticket_url: string;
}

interface HomeProps {
  searchTerm: string;
}

const Home: React.FC<HomeProps> = ({ searchTerm }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents(events);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(searchTermLower) ||
      event.venue.toLowerCase().includes(searchTermLower)
    );
    setFilteredEvents(filtered);
  }, [searchTerm, events]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('http://localhost:8000/events');
      const formattedEvents = response.data.map((event: any) => ({
        ...event,
        date: formatDate(event.date)
      }));
      setEvents(formattedEvents);
      setFilteredEvents(formattedEvents);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch events');
      setLoading(false);
      console.error('Error fetching events:', err);
    }
  };

  if (loading) return <div className="text-center py-8">Loading events...</div>;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-louder-purple to-louder-purple-dark text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Discover Sydney's Live Scene
            </h1>
            <p className="text-lg md:text-xl text-gray-100 mb-8">
              Find and book tickets for the best events happening in Sydney
            </p>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
        {filteredEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No events found matching your search.
          </div>
        )}
      </section>
    </div>
  );
};

export default Home; 