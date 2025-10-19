"use client";
import { Bot } from "lucide-react";
import AIChat from "../AIChat";
import ChallengeChat from "../ChallengeChat";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import EcoMapOverlayComponent, {
  TargetLocation,
} from "../EcoMapOverlayComponent";
import { SimulationData } from "../map";

const EcoMap = dynamic(() => import("../map"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

type ChallengeMode = 'inactive' | 'simulating' | 'scored' | 'learning';

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('inactive');

  // Use ref to track challenge mode for immediate reads
  const challengeModeRef = useRef<ChallengeMode>('inactive');

  // Set up global window functions that map can call directly
  useEffect(() => {
    // Direct function calls instead of events
    (window as any).pageChallengeStart = () => {
      challengeModeRef.current = 'simulating';
      setChallengeMode('simulating');
      setIsChatOpen(true);
    };

    (window as any).pageChallengeEnd = () => {
      challengeModeRef.current = 'inactive';
      setChallengeMode('inactive');
      setIsChatOpen(false);
    };

    return () => {
      delete (window as any).pageChallengeStart;
      delete (window as any).pageChallengeEnd;
    };
  }, []);

  const handleCoordinatesUpdate = (coordinates: any[]) => {
    setMapCoordinates(coordinates);
    if (!isChatOpen) {
      setIsChatOpen(true);
    }
  };

  const handleSimulationDataChange = (data: SimulationData) => {
    setSimulationData(data);
  };

  return (
    <div className="relative h-screen w-screen">
      {/* Map */}
      <EcoMap
        onCoordinatesFinished={handleCoordinatesUpdate}
        onSimulationDataChange={handleSimulationDataChange}
        targetLocation={targetLocation}
      />

      {/* Chat Toggle Button */}
      <button
        onClick={() => {
          if (challengeMode === 'inactive') {
            setIsChatOpen(!isChatOpen);
          }
        }}
        className={`fixed top-10 right-10 z-[1000] p-3 rounded-full bg-[#25491B] text-white shadow-lg transition-colors ${
          challengeMode !== 'inactive' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#1a3513]'
        }`}
        disabled={challengeMode !== 'inactive'}
        title={challengeMode !== 'inactive' ? 'Chat cannot be closed during challenge' : ''}
      >
        {isChatOpen ? (
          <img src="/close.svg" alt="Close chat" className="w-6 h-6" />
        ) : (
          <Bot size={24} />
        )}
      </button>

      {/* Chat Overlay - Show different chat based on mode */}
      {isChatOpen && (
        <div className="fixed top-25 right-9 bottom-4 left-[60%] z-[1000] bg-white rounded-lg shadow-2xl overflow-hidden">
          {challengeMode !== 'inactive' ? (
            <ChallengeChat />
          ) : (
            <AIChat
              selectedCoordinates={mapCoordinates}
              simulationData={simulationData}
            />
          )}
        </div>
      )}

      <div className="absolute top-4 left-4 z-99999">
        <EcoMapOverlayComponent onLocationSelect={setTargetLocation} />
      </div>
    </div>
  );
}
