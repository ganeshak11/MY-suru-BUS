import React from 'react';
import { Smartphone, Bus } from 'lucide-react';

export const DownloadSection: React.FC = () => {
  return (
    <section className="py-32 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-4">Ready to Ride?</h2>
          <p className="text-xl text-slate-600">Choose your app and get started today.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch max-w-4xl mx-auto">
          {/* Passenger App Card */}
          <div className="flex-1 bg-white rounded-3xl p-10 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Smartphone size={32} />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-2">Passenger App</h3>
            <p className="text-slate-500 mb-8 h-12">Plan journeys, track buses, and travel smarter.</p>
            
            <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold mb-3 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
               <span>Download for Android</span>
            </button>
             <button className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl font-semibold cursor-not-allowed flex items-center justify-center gap-2">
               <span>iOS Coming Soon</span>
            </button>
          </div>

          {/* Driver App Card */}
          <div className="flex-1 bg-slate-900 rounded-3xl p-10 shadow-xl border border-slate-800 hover:shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 transform hover:-translate-y-2 group">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Bus size={32} />
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Driver App</h3>
            <p className="text-slate-400 mb-8 h-12">Manage trips, view schedules, and track earnings.</p>
            
            <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold mb-3 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
               <span>Download for Android</span>
            </button>
             <button className="w-full py-4 bg-slate-800 text-slate-500 rounded-xl font-semibold cursor-not-allowed flex items-center justify-center gap-2">
               <span>iOS Coming Soon</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
