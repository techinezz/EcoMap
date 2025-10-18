'use client';

// ✅ 1. Import ZoomControl
import { MapContainer, TileLayer, FeatureGroup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet-draw';

// ... (Icon fix and DrawControl component remain the same) ...

/**
 * A "headless" React component that handles the native Leaflet-Draw logic.
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
  // ... (No changes here)
  const map = useMap();
  const drawInstanceRef = useRef<L.Draw.Polygon | null>(null);
  useEffect(() => {
    if (drawMode === 'polygon') {
      drawInstanceRef.current = new L.Draw.Polygon(map as any, {
        shapeOptions: {
          color: '#488a36ff',
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
  useEffect(() => {
    const handleCreated = (e: L.LeafletEvent) => {
      onLayerCreated(e.layer);
    };
    const handleDrawStop = () => {
      onDrawStop();
    };
    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.DRAWSTOP, handleDrawStop);
    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.DRAWSTOP, handleDrawStop);
    };
  }, [map, onLayerCreated, onDrawStop]);
  return null;
}

export default function EcoMap({ onCoordinatesFinished }: { onCoordinatesFinished?: (coordinates: any[]) => void }) {
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  
  // ... (All your handler functions remain the same) ...
  const handleToggleDrawing = () => {
    setDrawMode((prevMode) => (prevMode === 'polygon' ? null : 'polygon'));
  };
  const handleLayerCreated = (layer: L.Layer) => {
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
    console.log('Shape added');

    // Automatically send coordinates when shape is completed
    if (featureGroupRef.current) {
      const layers = featureGroupRef.current.getLayers();
      const allGeoJSON = layers.map((l) => (l as L.Polygon).toGeoJSON());
      const allCoordinates = allGeoJSON.map(geojson => geojson.geometry.coordinates);

      if (onCoordinatesFinished && allCoordinates.length > 0) {
        onCoordinatesFinished(allCoordinates);
      }
    }
  };
  const handleClearLayers = () => {
    if (featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
    }
    setDrawMode(null);
    console.log('All shapes cleared');
  };

  const baseButtonClass =
    'px-3 py-2 rounded-full border-none cursor-pointer transition-colors shadow-md';
  // ✅ 1. Add the new handler for "Finished Drawing"

    if (!featureGroupRef.current) {
      return;
    }

    const layers = featureGroupRef.current.getLayers();
    if (layers.length === 0) {
      console.log('No shapes were drawn.');
      return;
    }

    // Get GeoJSON for every layer
    const allGeoJSON = layers.map((layer) => {
      // We must cast the layer to access the toGeoJSON method
      return (layer as L.Polygon).toGeoJSON();
    });

    // Log the data
    console.log('✅ Finished Drawing! All shapes (GeoJSON):', allGeoJSON);

    // You can also log just the coordinates
    const allCoordinates = allGeoJSON.map(geojson => geojson.geometry.coordinates);
    console.log('Just the coordinates:', JSON.stringify(allCoordinates));

    // Send coordinates to parent component (which will pass to AI)
    if (onCoordinatesFinished) {
      onCoordinatesFinished(allCoordinates);
    }
  };

  return (
    <div className="relative h-screen w-full">
      {/* ... (Your buttons div remains the same) ... */}
      <div
        className="absolute top-[42px] left-[400px] z-[1000] flex flex-row gap-2 "
      >
        {drawMode === 'polygon' ? (
          <>
            <button
              onClick={handleToggleDrawing}
              className={`${baseButtonClass} bg-[rgba(171,210,169,0.44)] text-black hover:bg-[rgba(171,210,169,0.44)]  rounded-full h-[2.5vw] w-[2.5vw]`}
            >
              <img 
                src="/pen-tool.svg" 
                alt="Draw Area" 
                className="w-7 h-7 " 
              />
            </button>
            <div className='w-[300px] bg-white rounded-full shadow-md'>
              <button
                onClick={handleClearLayers}
                className={`${baseButtonClass} bg-white text-black hover:bg-gray-100 rounded-full h-[2.5vw] w-[2.5vw] shadow-none`}
              >
                <img 
                  src="/eraser.svg" 
                  alt="Clear All" 
                  className="w-7 h-7 " 
                />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleToggleDrawing}
            className={`${baseButtonClass} bg-white text-black hover:bg-gray-100 rounded-full h-[50] w-[50]`}
          >
            <img 
              src="/pen-tool.svg" 
              alt="Draw Area" 
              className="w-7 h-7 " 
            />
          </button>
        )}
      </div>

      {/* The Leaflet Map Container */}
      <MapContainer
        center={[40.7128, -74.0060]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false} // ✅ 2. Disable the default control
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

        {/* ✅ 3. Add the new control in the desired position */}
        <ZoomControl position="bottomright" />
      </MapContainer>
    </div>
  );
}