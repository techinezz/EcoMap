"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Map, Zap } from "lucide-react";
import { Globe } from "@/components/magicui/globe";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/map");
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Globe Background */}
      <div className="absolute inset-0 flex items-center justify-center z-0 mt-[-30px]">
        <Globe
          className="opacity-60"
          config={{
            devicePixelRatio: 2,
            phi: 0,
            theta: 0.3,
            dark: 0,
            diffuse: 0.4,
            mapSamples: 16000,
            mapBrightness: 1.2,
            baseColor: [1, 1, 1] as [number, number, number], // White land/borders
            markerColor: [0.2, 0.8, 0.3] as [number, number, number], // Green dots
            glowColor: [0, 0, 0] as [number, number, number], // Black outer glow/border
            markers: [
              // Major cities around the world
              { location: [40.7128, -74.006] as [number, number], size: 0.08 }, // New York
              { location: [51.5074, -0.1278] as [number, number], size: 0.07 }, // London
              { location: [48.8566, 2.3522] as [number, number], size: 0.07 }, // Paris
              { location: [35.6762, 139.6503] as [number, number], size: 0.08 }, // Tokyo
              { location: [-33.8688, 151.2093] as [number, number], size: 0.07 }, // Sydney
              { location: [19.076, 72.8777] as [number, number], size: 0.08 }, // Mumbai
              { location: [39.9042, 116.4074] as [number, number], size: 0.09 }, // Beijing
              { location: [55.7558, 37.6173] as [number, number], size: 0.07 }, // Moscow
              { location: [-23.5505, -46.6333] as [number, number], size: 0.08 }, // São Paulo
              { location: [19.4326, -99.1332] as [number, number], size: 0.08 }, // Mexico City
              { location: [30.0444, 31.2357] as [number, number], size: 0.07 }, // Cairo
              { location: [1.3521, 103.8198] as [number, number], size: 0.06 }, // Singapore
              { location: [25.2048, 55.2708] as [number, number], size: 0.06 }, // Dubai
              { location: [34.0522, -118.2437] as [number, number], size: 0.07 }, // Los Angeles
              { location: [37.7749, -122.4194] as [number, number], size: 0.06 }, // San Francisco
              { location: [41.9028, 12.4964] as [number, number], size: 0.06 }, // Rome
              { location: [52.52, 13.405] as [number, number], size: 0.06 }, // Berlin
              { location: [59.9139, 10.7522] as [number, number], size: 0.05 }, // Oslo
              { location: [-1.2921, 36.8219] as [number, number], size: 0.06 }, // Nairobi
              { location: [6.5244, 3.3792] as [number, number], size: 0.07 }, // Lagos
              { location: [23.8103, 90.4125] as [number, number], size: 0.06 }, // Dhaka
              { location: [28.6139, 77.209] as [number, number], size: 0.08 }, // Delhi
              { location: [13.7563, 100.5018] as [number, number], size: 0.06 }, // Bangkok
              { location: [14.5995, 120.9842] as [number, number], size: 0.07 }, // Manila
              { location: [-26.2041, 28.0473] as [number, number], size: 0.06 }, // Johannesburg
              { location: [41.0082, 28.9784] as [number, number], size: 0.06 }, // Istanbul
              { location: [50.1109, 8.6821] as [number, number], size: 0.05 }, // Frankfurt
              { location: [43.6532, -79.3832] as [number, number], size: 0.06 }, // Toronto
              { location: [45.5017, -73.5673] as [number, number], size: 0.05 }, // Montreal
              { location: [49.2827, -123.1207] as [number, number], size: 0.05 }, // Vancouver
              // 10 additional cities
              { location: [31.2304, 121.4737] as [number, number], size: 0.08 }, // Shanghai
              { location: [22.3193, 114.1694] as [number, number], size: 0.07 }, // Hong Kong
              { location: [37.5665, 126.978] as [number, number], size: 0.07 }, // Seoul
              { location: [-34.6037, -58.3816] as [number, number], size: 0.07 }, // Buenos Aires
              { location: [33.8688, 151.2093] as [number, number], size: 0.05 }, // Wellington
              { location: [40.4168, -3.7038] as [number, number], size: 0.06 }, // Madrid
              { location: [60.1699, 24.9384] as [number, number], size: 0.05 }, // Helsinki
              { location: [-4.4419, 15.2663] as [number, number], size: 0.05 }, // Kinshasa
              { location: [33.3152, 44.3661] as [number, number], size: 0.06 }, // Baghdad
              { location: [-12.0464, -77.0428] as [number, number], size: 0.06 }, // Lima
              // 5 more African cities
              { location: [33.5731, -7.5898] as [number, number], size: 0.06 }, // Casablanca, Morocco
              { location: [15.5007, 32.5599] as [number, number], size: 0.05 }, // Khartoum, Sudan
              { location: [9.0579, 7.4951] as [number, number], size: 0.07 }, // Abuja, Nigeria
              { location: [-6.1659, 106.8651] as [number, number], size: 0.05 }, // Luanda, Angola
              { location: [5.6037, -0.1870] as [number, number], size: 0.06 }, // Accra, Ghana
              // 5 more South American cities
              { location: [4.7110, -74.0721] as [number, number], size: 0.07 }, // Bogotá, Colombia
              { location: [-33.4489, -70.6693] as [number, number], size: 0.06 }, // Santiago, Chile
              { location: [10.4806, -66.9036] as [number, number], size: 0.06 }, // Caracas, Venezuela
              { location: [-0.1807, -78.4678] as [number, number], size: 0.05 }, // Quito, Ecuador
              { location: [-25.2637, -57.5759] as [number, number], size: 0.05 }, // Asunción, Paraguay
            ],
            onRender: () => {},
            width: 1500,
            height: 1500,
          }}
        />
      </div>

      {/* Gradient Overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E8F5E9]/70 via-white/60 to-[#C8E6C9]/70 pointer-events-none z-[5]" />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="absolute top-0 w-full px-8 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="EcoMap Logo" width={40} height={40} />
          <span className="text-2xl font-bold text-[#25491B]">EcoMap</span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 text-center">
        {/* Floating Badge */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-[#25491B]/10">
          <Zap className="text-[#25491B]" size={16} />
          <span className="text-sm font-medium text-[#25491B]">
            AI-Powered Sustainability Analysis
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-[#25491B] mb-6 max-w-4xl leading-tight">
          Transform Your City's
          <span className="block bg-gradient-to-r from-[#488a36] to-[#25491B] bg-clip-text text-transparent">
            Environmental Future
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl sm:text-2xl text-gray-700 mb-12 max-w-2xl leading-relaxed">
          Visualize, simulate, and analyze sustainability interventions with
          AI-powered insights for smarter urban planning.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleGetStarted}
          className="group relative px-8 py-4 bg-[#25491B] text-white rounded-full text-lg font-semibold shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-3"
        >
          <Map size={24} />
          Start Mapping
          <ArrowRight
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </main>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-[#ABD2A9]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#9BC299]/20 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
