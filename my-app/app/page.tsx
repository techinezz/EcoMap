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
  console.log('🏠🏠🏠 HOME COMPONENT RENDERING');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<any[]>([]);
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('inactive');
  console.log('🏠 HOME STATE - challengeMode:', challengeMode, 'isChatOpen:', isChatOpen);

  // Use ref to track challenge mode for immediate reads
  const challengeModeRef = useRef<ChallengeMode>('inactive');

  // Store ref to map handlers for challenge actions
  const mapRetryRef = useRef<(() => void) | null>(null);
  const mapPlayAgainRef = useRef<(() => void) | null>(null);

  // Debug: Log whenever challengeMode changes
  useEffect(() => {
    console.log('🔄 challengeMode STATE CHANGED TO:', challengeMode);
  }, [challengeMode]);

  // Set up global window functions that map can call directly
  useEffect(() => {
    console.log('🏠 Setting up global window functions for challenge control');

    // Direct function calls instead of events
    (window as any).pageChallengeStart = () => {
      console.log('🎧🎧🎧 Page: pageChallengeStart CALLED DIRECTLY');
      console.log('Before state change - challengeMode:', challengeMode);
      challengeModeRef.current = 'simulating';
      setChallengeMode('simulating');
      setIsChatOpen(true);
      console.log('✅✅✅ Page: Challenge mode SET TO SIMULATING');
    };

    (window as any).pageChallengeEnd = () => {
      console.log('🎧 Page: pageChallengeEnd called');
      challengeModeRef.current = 'inactive';
      setChallengeMode('inactive');
    };

    (window as any).pageChallengePlayAgain = () => {
      console.log('🎧 Page: pageChallengePlayAgain called');
      setChallengeMode('inactive');
      setSimulationData(null);

      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).mapChallengePlayAgain) {
          (window as any).mapChallengePlayAgain();
        }
      }, 100);
    };

    console.log('✅✅✅ Page: Global window functions registered:', {
      pageChallengeStart: !!(window as any).pageChallengeStart,
      pageChallengeEnd: !!(window as any).pageChallengeEnd,
      pageChallengePlayAgain: !!(window as any).pageChallengePlayAgain,
    });

    return () => {
      console.log('🗑️ Page: Cleaning up global functions');
      delete (window as any).pageChallengeStart;
      delete (window as any).pageChallengeEnd;
      delete (window as any).pageChallengePlayAgain;
    };
  }, []);

  const handleCoordinatesUpdate = (coordinates: any[]) => {
    console.log('📍 Coordinates updated, challenge mode:', challengeMode);
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
        {/* Debug Panel - Shows current challenge state */}
        <div className="fixed top-2 left-2 z-[9999] bg-purple-900 text-white p-3 text-sm rounded shadow-lg font-mono">
          <div><strong>🔍 Page Debug:</strong></div>
          <div>challengeMode: <span className="text-yellow-300 font-bold">{challengeMode}</span></div>
          <div>isChatOpen: <span className="text-yellow-300 font-bold">{isChatOpen ? 'true' : 'false'}</span></div>
          <div>Rendering: <span className="text-green-300 font-bold">{challengeMode !== 'inactive' ? 'ChallengeChat' : 'AIChat'}</span></div>
        </div>

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
