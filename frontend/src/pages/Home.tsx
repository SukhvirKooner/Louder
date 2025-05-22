import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from '../components/EventCard';
import { formatDate } from '../utils/dateUtils';
import { ShootingStars } from "../components/ui/shooting-stars";
import { StarsBackground } from "../components/ui/stars-background";
import { ParallaxScroll} from "../components/ui/parallax-scroll"
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
  onShowEmailModalRequest: (ticketUrl: string) => void;
}

const Home: React.FC<HomeProps> = ({ searchTerm, onShowEmailModalRequest }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const EVENTS_PER_PAGE = 30;
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEvents(events);
      setCurrentPage(1); // Reset to first page on new search
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = events.filter(event => 
      event.title.toLowerCase().includes(searchTermLower) ||
      event.venue.toLowerCase().includes(searchTermLower)
    );
    setFilteredEvents(filtered);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchTerm, events]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API_URL}/events`);
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

  // Pagination logic
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const startIdx = (currentPage - 1) * EVENTS_PER_PAGE;
  const endIdx = startIdx + EVENTS_PER_PAGE;
  const currentEvents = filteredEvents.slice(startIdx, endIdx);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mb-6"></div>
      <p className="text-white text-sm opacity-70">This may take a few seconds to load events...</p>
    </div>
  );
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section  className="bg-black text-white py-28 pb-0 mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Discover Sydney's Live Scene
            </h1>
            <p className="text-lg md:text-xl text-gray-700 mb-8">
              Find and book tickets for the best events happening in Sydney
            </p>
            <div className="absolute inset-0 pointer-events-none">
              <ShootingStars />
              <StarsBackground />
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="container mx-auto  px-1 pt-12">

          <ParallaxScroll>
        {currentEvents.map((event) => (
        <EventCard
         key={event.id}
           event={event}
           onShowEmailModalRequest={onShowEmailModalRequest}
          />
          ))}
          </ParallaxScroll>
        {filteredEvents.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No events found matching your search.
          </div>
        )}
      </section>
      {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="relative z-10 flex justify-center items-center space-x-4 mb-8">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${
                currentPage === 1
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              Previous
            </button>
            <span className="text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${
                currentPage === totalPages
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200'
              }`}
            >
              Next
            </button>
          </div>
        )}
    </div>
  );
};

export default Home; 