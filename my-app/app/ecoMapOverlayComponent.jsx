// Card
// Title + Icon
// Hamburger Icon for Menu
// Section with radio buttons

import React, { useState } from "react";

const ecoMapOverlayComponent = () => {
  // State for managing open/clsoed menu
  const [isOpen, setIsOpen] = userState(false);

  // Functions to toggle the state
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
};

// Render the closed UI
return (
  // The outer container:
  //  - bg-white: White background
  //  - rounded-xl: Large rounded corners
  //  - p-3: Padding inside
  //  - border: Border around the element
  //  - border-green-600: Green border color

  <div className="bg-white rounded-xl p-3 border border-green-700 shadow-lg inline-block">
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

export default ecoMapOverlayComponent.jsx;
