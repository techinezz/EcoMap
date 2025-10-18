// Card
// Title + Icon
// Hamburger Icon for Menu
// Section with radio buttons
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

    // NOTE: You might add logic here later, like:
    // if (overlay === "Air Quality") { // show air quality data on the map }
  };

  return (
    // The outer container:
    //  - bg-white: White background
    //  - rounded-xl: Large rounded corners
    //  - p-3: Padding inside
    //  - border: Border around the element
    //  - border-green-600: Green border color
    <div className="bg-white rounded-3xl p-5 py-6 border border-green-700 shadow-lg w-72">
      <div className="flex items-center justify-between">
        {/* flex: Makes children (logo/title and button) line up horizontally
                      items-center: Vertically centers them
                      justify-between: Pushes logo/title to the left and button to the right
                  */}

        <div className="flex items-center space-x-2">
          <span className="text-green-700 text-3xl">🌱</span>{" "}
          {/* Green text, larger size */}
          <h1 className="text-xl font-semibold text-green-800">EcoMap</h1>
        </div>

        <button className="text-2xl text-green-700" onClick={toggleMenu}>
          {isOpen ? "x" : "☰"}
        </button>
      </div>

      {isOpen && (
        <div className="pt-4 mt-2 border-gray-200">
          <h2 className="text-lg font-medium mb-3">Overlays</h2>

          {/* 2. The radio buttons are visible when open */}
          <div className="space-y-2 text-sm">
            {OVERLAYS.map((overlay) => (
              <label
                key={overlay} // Important for React list performance
                className="flex items-center cursor-pointer"
              >
                <input
                  type="radio"
                  name="overlay-selection" // Groups all buttons so only one can be selected
                  value={overlay}
                  // 🌟 The Selection Logic: Is the current overlay the one stored in state?
                  checked={selectedOverlay === overlay}
                  // 🌟 The Update Logic: Call the handler with this button's value when clicked
                  onChange={() => handleOverlayChange(overlay)}
                  // Tailwind form styling (requires @tailwindcss/forms plugin)
                  className="form-radio h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <span className="ml-2 text-gray-700">{overlay}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
