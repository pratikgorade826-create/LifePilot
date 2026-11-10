import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = 'Loading...', size = 'default' }) => {
  const sizeMap = {
    small: 'w-4 h-4',
    default: 'w-7 h-7',
    large: 'w-10 h-10'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
      <Loader2 className={`${sizeMap[size] || sizeMap.default} animate-spin text-indigo-500`} />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
};

