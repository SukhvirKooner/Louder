import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-gray-800">
            Sydney Events Hub
          </Link>
          <div className="flex space-x-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Events
            </Link>
            <Link to="/email" className="text-gray-600 hover:text-gray-900">
              Subscribe
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 