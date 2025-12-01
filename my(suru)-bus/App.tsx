import React from 'react';
import { ReactLenis } from '@studio-freight/react-lenis';
import { Hero } from './components/Hero';
import { PassengerFeatures } from './components/PassengerFeatures';
import { DriverFeatures } from './components/DriverFeatures';
import { HowItWorks } from './components/HowItWorks';
import { DownloadSection } from './components/DownloadSection';
import { Footer } from './components/Footer';

function App() {
  return (
    <ReactLenis root>
      <main className="w-full min-h-screen bg-slate-50 selection:bg-blue-500 selection:text-white">
        <Hero />
        <PassengerFeatures />
        <DriverFeatures />
        <HowItWorks />
        <DownloadSection />
        <Footer />
      </main>
    </ReactLenis>
  );
}

export default App;
