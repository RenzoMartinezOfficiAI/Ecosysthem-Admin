import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold text-cyber-blue-500 uppercase tracking-widest mb-2">
          {label}
        </label>
      )}
      <input 
        className={`w-full bg-black-matte border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyber-blue-500/50 focus:ring-1 focus:ring-cyber-blue-500/50 transition-all ${error ? 'border-neon-red-500/50' : ''} ${className}`}
        {...props} 
      />
      {error && <p className="mt-1 text-xs text-neon-red-500">{error}</p>}
    </div>
  );
};
