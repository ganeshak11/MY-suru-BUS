import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-2xl font-bold text-white tracking-tighter">
          MY(suru) <span className="text-blue-500">BUS</span>
        </div>
        
        <div className="flex gap-8 text-sm font-medium">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Support</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
        
        <div className="text-sm">
          © {new Date().getFullYear()} MY(suru) BUS. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
