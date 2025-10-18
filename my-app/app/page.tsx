"use client";
import { Bot } from "lucide-react";
import AIChat from "./AIChat";
import { useState } from "react";
import dynamic from "next/dynamic";
import EcoMap from "./map";
import EcoMapOverlayComponent from "./EcoMapOverlayComponent";

type Overlay = "None" | "Air Quality" | "Carbon Footprint";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [selectedOverlay, setSelectedOverlay] = useState<Overlay>("None");

  const handleOverlayChange = (overlay: Overlay) => {
    setSelectedOverlay(overlay);
  };

  return (
    <div className="h-screen w-screen relative">
      <EcoMap selectedOverlay={selectedOverlay} />

      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed top-4 right-4 z-[1000] p-3 rounded-full bg-[#ABD2A9] text-white hover:bg-[#9BC299] shadow-lg transition-colors"
      >
        <Bot size={24} />
      </button>

      {/* Chat Overlay */}
      {isChatOpen && (
        <div className="fixed top-16 right-4 z-[1000] w-96 h-[600px] bg-white rounded-lg shadow-2xl overflow-hidden">
          <AIChat />
        </div>
      )}
      <div className="absolute top-4 left-4 z-99999">
        <EcoMapOverlayComponent
          selectedOverlay={selectedOverlay}
          onOverlayChange={handleOverlayChange}
        />
      </div>
    </div>
  );
}
