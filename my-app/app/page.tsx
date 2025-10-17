"use client";
import { Bot } from "lucide-react";
import AIChat from "./AIChat";
import { useState } from "react";
import dynamic from "next/dynamic";
import EcoMap from "./map";
import EcoMapOverlayComponent from "./EcoMapOverlayComponent";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="h-screen w-screen relative">
      <EcoMap />
      
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
        <EcoMapOverlayComponent />
      </div>
    </div>
  );
}
