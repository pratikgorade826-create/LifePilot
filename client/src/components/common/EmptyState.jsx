import React from 'react';
import { Sparkles } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Sparkles,
  title = 'No items found',
  description = 'Get started by creating your first record with LifePilot AI.',
  action = null
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-[#111827]/60 border border-dashed border-slate-800 rounded-xl my-4">
      <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
        <Icon size={24} />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-5">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

