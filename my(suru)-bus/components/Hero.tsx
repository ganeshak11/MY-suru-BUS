import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowDown, Smartphone, Bus } from 'lucide-react';
import { ThreeBusScene } from './ThreeBusScene';

export const Hero: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(titleRef.current, {
        y: 100,
        opacity: 0,
        duration: 1.2,
        delay: 0.5,
      })
      .from(subtitleRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
      }, "-=0.8")
      .from(buttonsRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.8,
      }, "-=0.6");

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
      <ThreeBusScene />

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-[-5vh]">
        <div className="mb-4 flex justify-center space-x-2">
            <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider uppercase backdrop-blur-md">
                Public Transport Reimagined
            </span>
        </div>
        <h1 ref={titleRef} className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
          Introducing <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">MY(suru) BUS</span>
        </h1>
        <p ref={subtitleRef} className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto mb-10 font-light">
          Track buses in real-time. Navigate the city with ease. The smartest way to travel in Mysore.
        </p>
        
        <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button className="group relative px-8 py-4 bg-blue-600 rounded-full text-white font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30">
            <span className="relative z-10 flex items-center gap-2">
              <Smartphone size={20} />
              Passenger App
            </span>
            <div className="absolute inset-0 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </button>
          
          <button className="group relative px-8 py-4 bg-slate-800 border border-slate-700 rounded-full text-white font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:bg-slate-700">
             <span className="relative z-10 flex items-center gap-2">
              <Bus size={20} />
              Driver App
            </span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50">
        <ArrowDown size={32} className="text-white" />
      </div>
    </section>
  );
};
