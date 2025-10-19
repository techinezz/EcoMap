"use client";
import { Bot } from "lucide-react";
import AIChat from "./AIChat";
import ChallengeChat from "./ChallengeChat";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import EcoMapOverlayComponent, {
  TargetLocation,
} from "./EcoMapOverlayComponent";
import LandingPage from "./landing-page";
import { SimulationData } from "./map";

const EcoMap = dynamic(() => import("./map"), {
  ssr: false, // This is the most important part
  loading: () => <p>Loading map...</p>, // Optional: Show a message while it loads
});

type ChallengeMode = 'inactive' | 'simulating' | 'scored' | 'learning';

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<any[]>([]);
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('inactive');

  // Use ref to track challenge mode for immediate reads
  const challengeModeRef = useRef<ChallengeMode>('inactive');

  // Store ref to map handlers for challenge actions
  const mapRetryRef = useRef<(() => void) | null>(null);
  const mapPlayAgainRef = useRef<(() => void) | null>(null);

  // Set up global window functions that map can call directly
  useEffect(() => {
    (window as any).pageChallengeStart = () => {
      challengeModeRef.current = 'simulating';
      setChallengeMode('simulating');
      setIsChatOpen(true);
    };

    (window as any).pageChallengeEnd = () => {
      challengeModeRef.current = 'inactive';
      setChallengeMode('inactive');
    };

    (window as any).pageChallengePlayAgain = () => {
      setChallengeMode('inactive');
      setSimulationData(null);

      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).mapChallengePlayAgain) {
          (window as any).mapChallengePlayAgain();
        }
      }, 100);
    };

    return () => {
      delete (window as any).pageChallengeStart;
      delete (window as any).pageChallengeEnd;
      delete (window as any).pageChallengePlayAgain;
    };
  }, []);

  const handleCoordinatesUpdate = (coordinates: any[]) => {
    setMapCoordinates(coordinates);
    // Automatically open chat when coordinates are received (but don't override if already open)
    if (!isChatOpen) {
      setIsChatOpen(true);
    }
  };

  const handleSimulationDataChange = (data: SimulationData) => {
    setSimulationData(data);
  };

  const handleChallengeStart = () => {
    console.log('🎮🎮🎮 CHALLENGE START CALLED (via callback) 🎮🎮🎮');
    challengeModeRef.current = 'simulating';
    setChallengeMode('simulating');
    setIsChatOpen(true);
    console.log('✅ State set to simulating via callback');
  };

  const handleChallengeEnd = () => {
    console.log('🛑 Challenge End Called');
    challengeModeRef.current = 'inactive';
    setChallengeMode('inactive');
    setSimulationData(null);
  };

  const handleChallengeRetry = () => {
    console.log('🔄 Challenge Retry Called');
    // Clear simulations but keep the same coordinates
    setSimulationData(null);
    challengeModeRef.current = 'simulating';
    setChallengeMode('simulating');

    // Trigger map to clear simulations using window callback
    if (typeof window !== 'undefined' && (window as any).mapChallengeRetry) {
      (window as any).mapChallengeRetry();
    }
  };

  const handleChallengePlayAgain = () => {
    // Generate new coordinates and restart
    setSimulationData(null);
    setChallengeMode('inactive');

    // Trigger map to generate new challenge using window callback
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).mapChallengePlayAgain) {
        (window as any).mapChallengePlayAgain();
      }
    }, 100);
  };

  return (
    <div className="relative h-screen w-screen">
        <LandingPage/>
      {/* Map */}
      <EcoMap
        onCoordinatesFinished={handleCoordinatesUpdate}
        targetLocation={targetLocation}
        onSimulationDataChange={handleSimulationDataChange}
        onChallengeStart={handleChallengeStart}
        onChallengeEnd={handleChallengeEnd}
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
        <div className="fixed top-25 right-9 bottom-4 left-[30%] z-[1000] bg-white rounded-lg shadow-2xl overflow-hidden">
          {challengeMode !== 'inactive' ? (
            <ChallengeChat />
          ) : (
            <AIChat
              selectedCoordinates={mapCoordinates}
              simulationData={simulationData}
              challengeMode={challengeMode}
              onChallengeRetry={handleChallengeRetry}
              onChallengePlayAgain={handleChallengePlayAgain}
              onChallengeEnd={handleChallengeEnd}
            />
          )}
        </div>
      )}


    </div>
  );
}
