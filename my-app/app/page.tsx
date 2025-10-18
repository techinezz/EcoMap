"use client";
import { Bot } from "lucide-react";
import AIChat from "./AIChat";
import { useState } from "react";
import dynamic from "next/dynamic";
import EcoMapOverlayComponent, {
  TargetLocation,
} from "./EcoMapOverlayComponent";
import LandingPage from "./landing-page";

const EcoMap = dynamic(() => import("./map"), {
  ssr: false, // This is the most important part
  loading: () => <p>Loading map...</p>, // Optional: Show a message while it loads
});

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<any[]>([]);

  // --- 1. ADD THIS STATE ---
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(
    null
  );

  const handleCoordinatesUpdate = (coordinates: any[]) => {
    setMapCoordinates(coordinates);
    // Automatically open chat when coordinates are received
    setIsChatOpen(true);
  };

  return (
    <div className="relative h-screen w-screen">
        <LandingPage/>
      {/* Map */}
      {/* --- 2. PASS THE 'targetLocation' PROP HERE --- */}
      <EcoMap
        onCoordinatesFinished={handleCoordinatesUpdate}
        targetLocation={targetLocation}
      />

      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed top-10 right-10 z-[1000] p-3 rounded-full bg-[#25491B] text-white hover:bg-[#25491B] shadow-lg transition-colors cursor-pointer"
      >
        {isChatOpen ? (
          <img src="/close.svg" alt="Close chat" className="w-6 h-6" />
        ) : (
          <Bot size={24} />
        )}
      </button>

      {/* Chat Overlay */}
      {isChatOpen && (
        <div className="fixed top-25 right-9 bottom-4 left-[70%] z-[1000] bg-white rounded-lg shadow-2xl overflow-hidden">
          <AIChat selectedCoordinates={mapCoordinates} />
        </div>
      )}

    </div>
  );
}
