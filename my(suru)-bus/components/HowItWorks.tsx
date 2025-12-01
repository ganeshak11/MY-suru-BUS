import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Download, UserCheck, Bus, Smile } from 'lucide-react';
import { StepProps } from '../types';

gsap.registerPlugin(ScrollTrigger);

const StepCard: React.FC<StepProps> = ({ number, title, description, icon }) => (
  <div className="step-card w-[85vw] md:w-[600px] h-[70vh] flex-shrink-0 bg-white rounded-[3rem] p-10 md:p-16 flex flex-col justify-center border border-slate-200 shadow-2xl mx-4 md:mx-10 relative overflow-hidden">
    <div className="absolute top-0 right-0 p-10 opacity-5">
      {/* Big Number Background */}
      <span className="text-[20rem] font-black leading-none">{number}</span>
    </div>
    
    <div className="relative z-10">
      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mb-10">
        {icon}
      </div>
      <h3 className="text-4xl md:text-6xl font-bold text-slate-900 mb-8">{title}</h3>
      <p className="text-xl md:text-2xl text-slate-600 leading-relaxed">{description}</p>
    </div>
  </div>
);

export const HowItWorks: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Calculate total width needed
      const sections = gsap.utils.toArray('.step-card');
      const totalWidth = 100 * (sections.length - 1); // rough estimate logic for demo

      gsap.to(sections, {
        xPercent: -100 * (sections.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          snap: 1 / (sections.length - 1),
          end: () => "+=" + containerRef.current!.offsetWidth,
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bg-blue-600 overflow-hidden relative">
      <div className="absolute top-10 left-10 text-white z-20">
        <h2 className="text-3xl font-bold">How It Works</h2>
      </div>
      
      <div ref={containerRef} className="h-screen flex items-center pl-10 md:pl-32">
        <StepCard 
          number="1"
          title="Download App"
          description="Get the MY(suru) BUS app from the Google Play Store. It's free and lightweight."
          icon={<Download size={48} />}
        />
        <StepCard 
          number="2"
          title="Select Route"
          description="Choose your destination or find the nearest bus stop on the interactive map."
          icon={<Bus size={48} />}
        />
        <StepCard 
          number="3"
          title="Track & Ride"
          description="Watch your bus arrive in real-time. Board with confidence and enjoy the ride."
          icon={<Smile size={48} />}
        />
         <StepCard 
          number="4"
          title="Share Feedback"
          description="Help us improve the transport system by rating your ride and driver."
          icon={<UserCheck size={48} />}
        />
      </div>
    </section>
  );
};
