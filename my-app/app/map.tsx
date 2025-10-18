"use client";

import { MapContainer, TileLayer, FeatureGroup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { useEffect, useState, useRef, FC } from "react";
import { useMap } from "react-leaflet";
import "leaflet-draw";

// Props interface for heatmap
interface EcoMapProps {
  // Define the prop the component expects
  selectedOverlay: "None" | "Air Quality" | "Carbon Footprint";
}

// Fix Leaflet’s default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * A component that handles the programmatic drawing logic.
 */
function DrawControl({
  drawMode,
  onDrawStop,
  onLayerCreated,
}: {
  drawMode: string | null;
  onDrawStop: () => void;
  onLayerCreated: (layer: L.Layer) => void;
}) {
  const map = useMap();
  const drawInstanceRef = useRef<L.Draw.Polygon | null>(null);

  // Effect to handle draw instance (creation/deletion)
  useEffect(() => {
    if (drawMode === "polygon") {
      drawInstanceRef.current = new L.Draw.Polygon(map, {
        shapeOptions: {
          color: "#3388ff",
        },
      });
      drawInstanceRef.current.enable();
    } else {
      if (drawInstanceRef.current) {
        drawInstanceRef.current.disable();
        drawInstanceRef.current = null;
      }
    }
    return () => {
      if (drawInstanceRef.current) {
        drawInstanceRef.current.disable();
        drawInstanceRef.current = null;
      }
    };
  }, [drawMode, map]);

  // Effect to listen for Leaflet-Draw events
  useEffect(() => {
    const handleCreated = (e: L.LeafletEvent) => {
      // ✅ This is the key change:
      // We no longer stop drawing. We just add the layer.
      onLayerCreated(e.layer);
    };

    const handleDrawStop = () => {
      // Fired when 'esc' is pressed or drawing is cancelled
      onDrawStop();
    };

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DRAWSTOP, handleDrawStop);

    // Cleanup
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DRAWSTOP, handleDrawStop);
    };
  }, [map, onLayerCreated, onDrawStop]);

  return null; // This component doesn't render anything
}

const EcoMap: FC<EcoMapProps> = ({ selectedOverlay }) => {
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  // ✅ This button is now a toggle
  const handleToggleDrawing = () => {
    setDrawMode((prevMode) => (prevMode === "polygon" ? null : "polygon"));
  };

  const handleLayerCreated = (layer: L.Layer) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
    console.log("Shape added");
  };

  const handleClearLayers = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    console.log("All shapes cleared");
  };

  // ✅ 1. Add the new handler for "Finished Drawing"
  const handleFinishedDrawing = () => {
    if (drawMode === "polygon") {
      // Exit drawing mode
      setDrawMode(null);
    }

    if (!featureGroupRef.current) {
      return;
    }

    const layers = featureGroupRef.current.getLayers();
    if (layers.length === 0) {
      console.log("No shapes were drawn.");
      return;
    }

    // Get GeoJSON for every layer
    const allGeoJSON = layers.map((layer) => {
      // We must cast the layer to access the toGeoJSON method
      return (layer as L.Polygon).toGeoJSON();
    });

    // Log the data
    console.log("✅ Finished Drawing! All shapes (GeoJSON):", allGeoJSON);

    // You can also log just the coordinates
    const allCoordinates = allGeoJSON.map(
      (geojson) => geojson.geometry.coordinates
    );
    console.log("Just the coordinates:", JSON.stringify(allCoordinates));
  };

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      {/* Button Container */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "50px",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* ✅ 2. Updated Draw Button (Toggle) */}
        <button
          onClick={handleToggleDrawing}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            border: "none",
            borderRadius: "4px",
            backgroundColor: drawMode === "polygon" ? "#ffc107" : "white",
          }}
        >
          {drawMode === "polygon" ? "Stop Drawing" : "Draw Area"}
        </button>

        {/* ✅ 3. The new "Finished Drawing" button */}
        <button
          onClick={handleFinishedDrawing}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            backgroundColor: "#4CAF50", // Green
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Finished Drawing
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClearLayers}
          style={{
            padding: "8px 12px",
            cursor: "pointer",
            backgroundColor: "#f44336", // Red
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Clear Everything
        </button>
      </div>

      {/* The Map */}
      <MapContainer
        center={[40.7128, -74.006]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup ref={featureGroupRef} />
        <DrawControl
          drawMode={drawMode}
          onDrawStop={() => setDrawMode(null)}
          onLayerCreated={handleLayerCreated}
        />
      </MapContainer>
    </div>

    // here
  );
};

export default EcoMap;
