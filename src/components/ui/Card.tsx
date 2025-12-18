import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-dark-surface/80 backdrop-blur-sm border border-white/5 rounded-2xl shadow-xl overflow-hidden ${onClick ? 'cursor-pointer hover:border-white/10 hover:shadow-2xl transition-all duration-300' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
