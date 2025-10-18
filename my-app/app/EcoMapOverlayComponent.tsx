"use client";
import React, { useState } from "react";

export default function EcoMapOverlayComponent() {
  // State for managing open/closed menu
  type Overlay = "None" | "Air Quality" | "Carbon Footprint";
  const OVERLAYS: Overlay[] = ["None", "Air Quality", "Carbon Footprint"];

  const [isOpen, setIsOpen] = useState(false);

  // Functions to toggle the state
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const [selectedOverlay, setSelectedOverlay] = useState<Overlay>("None");

  const handleOverlayChange = (overlay: Overlay) => {
    // This function updates the state with the value of the button that was clicked
    setSelectedOverlay(overlay);
  };

  return (
    <div
      className={`
        bg-white shadow-lg w-200 mt-[20] ml-10 shadow-md 
        px-5 
        overflow-hidden
        ${
          isOpen
            ? "max-h-96 rounded-3xl py-3 pb-[1.2vw]"
            : "max-h-20 rounded-full py-3 pb-[.7vw]"
        }
      `}
    >
      <div className="flex items-center ">
        <div className="flex items-center space-x-2 pl-3">
          <img
            src="/logo.svg"
            alt="EcoMap's Logo"
            className="w-9 h-9 "
          />
          <h1 className="text-xl font-semibold text-[#25491B]">EcoMap</h1>
        </div>
        <p className="ml-3 text-[#25491B]">|</p>
        <div className="ml-3 text-[#25491B] text-lg">
          <input className="w-130 border-none focus:outline-none" placeholder="Search"/>
        </div>
        {/* <button onClick={toggleMenu}>
          <img
            src="/menu.svg"
            alt="EcoMap's Logo"
            className="w-5 h-5 mr-2"
          />
        </button> */}
      </div>

    </div>
  );
}