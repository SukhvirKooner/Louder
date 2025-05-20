import React from 'react';
import { CalendarCheck } from 'lucide-react';

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
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md hover-scale">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={event.image_url} 
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-bold font-poppins mb-2 line-clamp-2">{event.title}</h3>
        
        <div className="flex items-center text-gray-500 mb-2">
          <CalendarCheck size={16} className="mr-2 text-louder-purple" />
          <p className="text-sm">{event.date}</p>
        </div>
        
        <p className="text-sm text-gray-500 mb-4">{event.venue}</p>
        
        <a 
          href={event.ticket_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block w-full bg-louder-purple hover:bg-louder-purple-dark text-white text-center py-2 px-4 rounded-md font-medium transition-all duration-300"
        >
          Get Tickets
        </a>
      </div>
    </div>
  );
};

export default EventCard; 