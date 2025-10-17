"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import EcoMap from "./map";
import EcoMapOverlayComponent from "./EcoMapOverlayComponent";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="h-screen w-screen relative">
      <EcoMap />
      <div className="absolute top-4 left-4 z-99999">
        <EcoMapOverlayComponent />
      </div>
    </div>
  );
}
