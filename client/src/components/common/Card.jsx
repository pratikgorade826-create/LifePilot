import React from 'react';

export const Card = ({ children, className = '', hover = false, onClick = null }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-sm transition-all duration-200 ${
        hover ? 'hover:border-indigo-500/40 hover:shadow-md hover:shadow-indigo-500/5 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

