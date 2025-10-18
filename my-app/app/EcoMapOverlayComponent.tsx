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
        bg-white shadow-lg w-82 mt-[20] ml-10 shadow-md 
        px-5 
        overflow-hidden
        ${
          isOpen
            ? "max-h-96 rounded-3xl py-3 pb-[1.2vw]"
            : "max-h-20 rounded-full py-3 pb-[.7vw]"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 pl-3">
          <img
            src="/logo.svg"
            alt="EcoMap's Logo"
            className="w-9 h-9 "
          />
          <h1 className="text-xl font-semibold text-green-800">EcoMap</h1>
        </div>

        <button className="text-2xl text-green-700" onClick={toggleMenu}>
          <img
            src="/menu.svg"
            alt="EcoMap's Logo"
            className="w-5 h-5 mr-2"
          />
        </button>
      </div>

      {isOpen && (
        <div className="pt-4 mt-[-7px] border-gray-200 text-[#25491B] ml-1">
          <h2 className="text-md font-bold mb-2 ">Overlays</h2>

          {/* 2. The radio buttons are visible when open */}
          <div className="space-y-2 text-sm ">
            {OVERLAYS.map((overlay) => (
              <label
                key={overlay} // Important for React list performance
                className="flex items-center cursor-pointer"
              >
                {/* ✅ 1. The REAL radio button is hidden but still functional.
                    - 'sr-only' hides it visually but keeps it for accessibility.
                    - 'peer' tells Tailwind to watch its state.
                */}
                <input
                  type="radio"
                  name="overlay-selection" // Groups all buttons so only one can be selected
                  value={overlay}
                  // 🌟 The Selection Logic: Is the current overlay the one stored in state?
                  checked={selectedOverlay === overlay}
                  // 🌟 The Update Logic: Call the handler with this button's value when clicked
                  onChange={() => handleOverlayChange(overlay)}
                  // Tailwind form styling (requires @tailwindcss/forms plugin)
                  className="sr-only peer"
                />

                {/* ✅ 2. This 'span' is our NEW VISUAL radio button.
                    - It's styled as an empty, bordered circle by default.
                */}
                <span
                  className="
                    h-4 w-4 
                    rounded-full 
                    border-2 border-[#25491B]
                    bg-white
                    transition-colors 
                    duration-150
                    
                    peer-checked:bg-[#25491B]
                    peer-checked:border-[#25491B]
                  "
                ></span>

                {/* 3. The label text */}
                <span className="ml-2 text-[#25491B]">{overlay}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}