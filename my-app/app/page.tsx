'use client';

import { useState } from "react";
import { Bot } from "lucide-react";
import AIChat from "./AIChat";
import EcoMap from "./map";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="relative h-screen w-screen">
      {/* Map */}
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
    </div>
  );
}
