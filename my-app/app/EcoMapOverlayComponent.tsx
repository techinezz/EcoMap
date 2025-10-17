// Card
// Title + Icon
// Hamburger Icon for Menu
// Section with radio buttons
"use client";
import React, { useState } from "react";

export default function EcoMapOverlayComponent() {
  // State for managing open/closed menu
  const [isOpen, setIsOpen] = useState(false);

  // Functions to toggle the state
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    // The outer container:
    //  - bg-white: White background
    //  - rounded-xl: Large rounded corners
    //  - p-3: Padding inside
    //  - border: Border around the element
    //  - border-green-600: Green border color
    <div className="bg-white rounded-3xl p-4 border border-green-700 shadow-lg w-64">
      <div className="flex items-center justify-between">
        {/* flex: Makes children (logo/title and button) line up horizontally
                      items-center: Vertically centers them
                      justify-between: Pushes logo/title to the left and button to the right
                  */}

        <div className="flex items-center space-x-2">
          {/* space-x-2: Adds spacing between the logo and the title */}
          <span className="text-green-700 text-3xl">🌱</span>{" "}
          {/* Green text, larger size */}
          <h1 className="text-xl font-semibold text-green-800">EcoMap</h1>
        </div>

        <button className="text-2xl text-green-700" onClick={toggleMenu}>
          ☰
        </button>
      </div>

      {/* ... Open content logic would go here ... */}
    </div>
  );
}
