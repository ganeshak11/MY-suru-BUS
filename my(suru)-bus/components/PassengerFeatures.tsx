import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Map, Clock, Navigation, Bell } from 'lucide-react';
import { FeatureCardProps } from '../types';

gsap.registerPlugin(ScrollTrigger);

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => (
  <div className="feature-card bg-white p-8 rounded-3xl border border-slate-100 shadow-xl hover:shadow-2xl transition-shadow duration-300 relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
    <div className="relative z-10">
      <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  </div>
);

export const PassengerFeatures: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.feature-card');
      
      gsap.from(cards, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
        },
        y: 100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="py-32 bg-slate-50 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <h2 className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-3">For Commuters</h2>
          <h3 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Commute with Confidence</h3>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            No more waiting in uncertainty. The MY(suru) BUS passenger app puts the entire city's transit network in your pocket.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard 
            title="Real-time Tracking" 
            description="See exactly where your bus is on the map. Live updates every few seconds ensure you never miss a ride."
            icon={<Map size={28} />} 
          />
          <FeatureCard 
            title="Accurate ETAs" 
            description="Know exactly when to leave your home. Get stop-wise estimated arrival times powered by smart algorithms."
            icon={<Clock size={28} />} 
          />
          <FeatureCard 
            title="Route Discovery" 
            description="New to the city? Find the best bus routes from A to B with intuitive map previews and stop listings."
            icon={<Navigation size={28} />} 
          />
          <FeatureCard 
            title="Smart Alerts" 
            description="Stay informed about delays, diversions, or schedule changes with instant push notifications."
            icon={<Bell size={28} />} 
          />
        </div>
        
        {/* Abstract UI representation */}
        <div className="mt-24 flex justify-center">
            <div className="relative w-full max-w-4xl h-[400px] md:h-[600px] bg-slate-200 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img src="https://picsum.photos/1200/800" alt="Map UI Placeholder" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent flex items-end justify-center pb-10">
                    <div className="bg-white/90 backdrop-blur-md px-8 py-4 rounded-full text-slate-900 font-bold shadow-lg">
                        Live Map View
                    </div>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};
