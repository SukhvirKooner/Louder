import React from 'react';

const Header: React.FC = () => {
  return (
    <header className=" shadow">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Sydney Events Hub
        </h1>
        <p className="mt-2 text-gray-600">
          Discover the best events in Sydney
        </p>
      </div>
    </header>
  );
};

export default Header; 