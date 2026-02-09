"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet"; // Import Leaflet for custom icons
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { supabase } from "./supabase";

// --- 1. ICON SYSTEM ---
// We use Emojis as icons because they are easy and lightweight!
const getIcon = (type: string) => {
  let emoji = "⚠️"; // Default
  if (type === "safe") emoji = "✅";
  if (type === "event") emoji = "🎉";
  if (type === "police") emoji = "👮";

  return L.divIcon({
    className: "custom-map-icon", // We will style this in globals.css later
    html: `<div style="font-size: 24px;">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

function MapClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  useMapEvents({
    click: (e) => onMapClick(e),
  });
  return null;
}

export default function Map() {
  const [cautions, setCautions] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // New State for the "Form Popup"
  const [newPin, setNewPin] = useState<{lat: number, lng: number} | null>(null);

  const startPosition: [number, number] = [1.3483, 103.6831]; 

  useEffect(() => {
    const fetchCautions = async () => {
      const { data } = await supabase.from('map_cautions_readable').select('*');
      if (data) setCautions(data);
    };
    fetchCautions();
    
    // Auto-refresh every 30 seconds to remove expired pins
    const interval = setInterval(fetchCautions, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (e: any) => {
    if (!isEditMode) return;
    // Instead of saving immediately, we open the FORM
    setNewPin(e.latlng); 
  };

  const handleFormSubmit = async (e: any) => {
    e.preventDefault(); // Stop page reload
    if (!newPin) return;

    const formData = new FormData(e.target);
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const duration = parseInt(formData.get("duration") as string);

    // Save to Supabase
    const { error } = await supabase
      .from('map_cautions')
      .insert([
        { 
          location: `POINT(${newPin.lng} ${newPin.lat})`, 
          description: description,
          type: type,
          duration_minutes: duration 
        }
      ]);

    if (!error) {
      // Refresh pins and close form
      const { data } = await supabase.from('map_cautions_readable').select('*');
      if (data) setCautions(data);
      setNewPin(null); // Close the form
      setIsEditMode(false); // Exit edit mode
    }
  };

  return (
    <div className="relative h-full w-full">
      
      {/* --- MODE TOGGLE BUTTON --- */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            setNewPin(null); // Close form if toggling off
          }}
          className={`
            px-4 py-2 rounded-lg font-bold shadow-lg transition-colors
            ${isEditMode ? "bg-red-500 text-white" : "bg-blue-600 text-white"}
          `}
        >
          {isEditMode ? "Cancel Editing" : "➕ Add Pin"}
        </button>
      </div>

      {/* --- THE POPUP FORM (Only visible when you click map in Edit Mode) --- */}
      {newPin && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl z-[1001] w-80">
          <h3 className="font-bold text-lg mb-4">Add New Pin</h3>
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
            
            <input name="description" placeholder="Description (e.g. Slippery)" required className="border p-2 rounded" />
            
            <select name="type" className="border p-2 rounded">
              <option value="hazard">⚠️ Hazard</option>
              <option value="safe">✅ Safe Zone</option>
              <option value="event">🎉 Event</option>
              <option value="police">👮 Security</option>
            </select>

            <select name="duration" className="border p-2 rounded">
              <option value="30">Lasts 30 Minutes</option>
              <option value="60">Lasts 1 Hour</option>
              <option value="120">Lasts 2 Hours</option>
              <option value="1440">Lasts 1 Day</option>
            </select>

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setNewPin(null)} className="flex-1 bg-gray-300 p-2 rounded">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded">Save Pin</button>
            </div>
          </form>
        </div>
      )}

      {/* --- THE MAP --- */}
      <MapContainer 
        center={startPosition} 
        zoom={16} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {isEditMode && <MapClickHandler onMapClick={handleMapClick} />}

        {cautions.map((caution) => (
          <Marker 
            key={caution.id} 
            position={[caution.lat, caution.lng]}
            icon={getIcon(caution.type)} // <--- USE THE CUSTOM ICON
          >
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-1">
                  {caution.type === 'safe' ? '✅' : caution.type === 'event' ? '🎉' : '⚠️'}
                </div>
                <strong>{caution.description}</strong>
                <div className="text-xs text-gray-500 mt-2">
                  Vanishes in: {caution.duration_minutes} mins
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}