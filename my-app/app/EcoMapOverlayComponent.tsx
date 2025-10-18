"use client";
import React, { useState } from "react";

export default function EcoMapOverlayComponent() {

  return (
    <div
      className={`
        bg-white shadow-lg w-200 mt-[20] ml-10 shadow-md 
        px-5 
        overflow-hidden max-h-20 rounded-full py-3 pb-[.7vw]

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
      </div>

    </div>
  );
}