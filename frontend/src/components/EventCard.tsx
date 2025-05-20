import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  image_url: string;
  ticket_url: string;
}

interface EventCardProps {
  event: Event;
  onShowEmailModalRequest: (ticketUrl: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onShowEmailModalRequest }) => {

  const handleGetTickets = () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      onShowEmailModalRequest(event.ticket_url);
    } else {
      window.location.href = event.ticket_url;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover-scale transition-transform duration-200">
      <Link to={`/events/${event.id}`}>
        <div className="relative h-48">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      </Link>
      <div className="p-4">
        <Link to={`/events/${event.id}`} className="block">
          <h3 className="text-xl font-semibold mb-2 hover:text-louder-purple transition-colors">
            {event.title}
          </h3>
        </Link>
        <div className="space-y-2 text-gray-600 text-sm mb-4">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{event.venue}</span>
          </div>
        </div>
        <button
          onClick={handleGetTickets}
          className="w-full bg-louder-purple hover:bg-louder-purple-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Get Tickets
        </button>
      </div>
    </div>
  );
};

export default EventCard; 