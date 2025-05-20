import React from 'react';
import EventCard from '../components/EventCard';

const Home: React.FC = () => {
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
          {/* Event cards will be mapped here */}
        </div>
      </section>
    </div>
  );
};

export default Home; 