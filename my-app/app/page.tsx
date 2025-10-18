"use client";
import { Bot } from "lucide-react";
import AIChat from "./AIChat";
import { useState } from "react";
import dynamic from "next/dynamic";
import EcoMap from "./map";
import EcoMapOverlayComponent from "./EcoMapOverlayComponent";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<any[]>([]);

  const handleCoordinatesUpdate = (coordinates: any[]) => {
    setMapCoordinates(coordinates);
    // Automatically open chat when coordinates are received
    setIsChatOpen(true);
  };

  return (
<<<<<<< HEAD
    <div className="relative h-screen w-screen">
      {/* Map */}
      <EcoMap onCoordinatesFinished={handleCoordinatesUpdate} />

=======
    <div className="h-screen w-screen relative">
      <EcoMap />
      
>>>>>>> 613aabbe3eb18dabb124048d5e80ced3d8ffc71b
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed top-4 right-4 z-[1000] p-3 rounded-full bg-[#ABD2A9] text-white hover:bg-[#9BC299] shadow-lg transition-colors"
      >
        <Bot size={24} />
      </button>

      {/* Chat Overlay */}
      {isChatOpen && (
        <div className="fixed top-16 right-4 bottom-4 left-[40%] z-[1000] bg-white rounded-lg shadow-2xl overflow-hidden">
          <AIChat selectedCoordinates={mapCoordinates} />
        </div>
      )}
      <div className="absolute top-4 left-4 z-99999">
        <EcoMapOverlayComponent />
      </div>
    </div>
  );
}
