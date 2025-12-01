import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, PlayCircle, MapPin, Users, LifeBuoy } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export const DriverFeatures: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>('.driver-feature-row');
      
      rows.forEach((row, i) => {
        gsap.from(row, {
          scrollTrigger: {
            trigger: row,
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse',
          },
          x: i % 2 === 0 ? -100 : 100,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    { title: "Secure Login & Verification", desc: "Enterprise-grade security ensuring only authorized drivers can access fleet controls.", icon: <ShieldCheck size={32} /> },
    { title: "Trip Management", desc: "One-tap start and stop trip controls. Effortless scheduling and route assignment.", icon: <PlayCircle size={32} /> },
    { title: "Auto-Location Sync", desc: "Background GPS tracking sends precise location data without draining battery.", icon: <MapPin size={32} /> },
    { title: "Load Analytics", desc: "Report passenger density to help optimizing fleet distribution in real-time.", icon: <Users size={32} /> },
    { title: "SOS & Support", desc: "Instant access to emergency services and depot support directly from the dashboard.", icon: <LifeBuoy size={32} /> },
  ];

  return (
    <section ref={sectionRef} className="py-32 bg-slate-900 text-white overflow-hidden">
      <div className="container mx-auto px-6">
         <div className="mb-20">
          <h2 className="text-blue-400 font-semibold tracking-wide uppercase text-sm mb-3">For Captains</h2>
          <h3 className="text-4xl md:text-5xl font-bold mb-6">Empowering Drivers</h3>
          <p className="text-slate-400 max-w-xl text-lg">
            Built for efficiency and ease. The Driver App simplifies daily operations so you can focus on the road.
          </p>
        </div>

        <div ref={rowsRef} className="space-y-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`driver-feature-row flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 transition-colors ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
            >
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
                {feature.icon}
              </div>
              <div className={`flex-1 ${index % 2 !== 0 ? 'md:text-right' : ''}`}>
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
