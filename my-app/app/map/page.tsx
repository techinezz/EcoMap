"use client";
import { Bot } from "lucide-react";
import AIChat from "../AIChat";
import { useState } from "react";
import dynamic from "next/dynamic";
import EcoMapOverlayComponent, {
  TargetLocation,
} from "../EcoMapOverlayComponent";
import { SimulationData } from "../map";

const EcoMap = dynamic(() => import("../map"), {
  ssr: false,
  loading: () => <p>Loading map...</p>,
});

export default function MapPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mapCoordinates, setMapCoordinates] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [targetLocation, setTargetLocation] = useState<TargetLocation | null>(
    null
  );
  const [isChallengeMode, setIsChallengeMode] = useState(false);
  const [challengeCoordinates, setChallengeCoordinates] = useState<any[]>([]);

  const handleCoordinatesUpdate = (coordinates: any[]) => {
    setMapCoordinates(coordinates);
    setIsChatOpen(true);
  };

  const handleSimulationDataChange = (data: SimulationData) => {
    setSimulationData(data);
  };

  const handleChallengeStart = (coords: any[]) => {
    setIsChallengeMode(true);
    setChallengeCoordinates(coords);
    setIsChatOpen(true); // Auto-open chat
  };

  const handleChallengeEnd = () => {
    setIsChallengeMode(false);
    setChallengeCoordinates([]);
    setIsChatOpen(false); // Close chat when challenge ends
  };

  return (
    <div className="relative h-screen w-screen">
      {/* Map */}
      <EcoMap
        onCoordinatesFinished={handleCoordinatesUpdate}
        onSimulationDataChange={handleSimulationDataChange}
        targetLocation={targetLocation}
        onChallengeStart={handleChallengeStart}
        isChallengeMode={isChallengeMode}
      />

      {/* Chat Toggle Button - Hidden or disabled during challenge */}
      {!isChallengeMode && (
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
      )}

      {/* Chat Overlay */}
      {isChatOpen && (
        <div className="fixed top-25 right-9 bottom-4 left-[40%] z-[1000] bg-white rounded-lg shadow-2xl overflow-hidden">
          <AIChat
            selectedCoordinates={isChallengeMode ? challengeCoordinates : mapCoordinates}
            simulationData={simulationData}
            isChallengeMode={isChallengeMode}
            onChallengeEnd={handleChallengeEnd}
          />
        </div>
      )}

      <div className="absolute top-4 left-4 z-99999">
        <EcoMapOverlayComponent onLocationSelect={setTargetLocation} />
      </div>
    </div>
  );
}
