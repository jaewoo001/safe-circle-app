"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { supabase } from "./supabase";

// --- CUSTOM ICONS ---
const getIcon = (type: string) => {
  let emoji = "⚠️"; 
  if (type === "safe") emoji = "✅";
  if (type === "event") emoji = "🎉";
  if (type === "police") emoji = "👮";

  return L.divIcon({
    className: "custom-map-icon",
    html: `<div style="font-size: 24px;">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// --- HELPER 1: Handle Clicks ---
function MapClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  useMapEvents({
    click: (e) => onMapClick(e),
  });
  return null;
}

// --- HELPER 2: "Find Me" GPS Button ---
function LocateUserButton() {
  const map = useMap();

  const handleFindMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 18, { animate: true, duration: 1.5 });
      },
      () => alert("Unable to retrieve your location. Please allow GPS access.")
    );
  };

  return (
    <button
      onClick={handleFindMe}
      className="leaflet-bottom leaflet-right z-[1000] bg-white p-3 rounded-full shadow-xl hover:bg-gray-100 border-2 border-gray-300 mb-8 mr-4"
      title="Find My Location"
      style={{ pointerEvents: 'auto' }} 
    >
      <span className="text-xl">📍</span>
    </button>
  );
}

export default function Map() {
  const [cautions, setCautions] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPin, setNewPin] = useState<{lat: number, lng: number} | null>(null);
  const startPosition: [number, number] = [1.3483, 103.6831]; 

  // Fetch ALL pins (Community View)
  useEffect(() => {
    const fetchCautions = async () => {
      const { data } = await supabase.from('map_cautions_readable').select('*');
      if (data) setCautions(data);
    };
    fetchCautions();
    const interval = setInterval(fetchCautions, 30000); // Live refresh
    return () => clearInterval(interval);
  }, []);

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    if (!newPin) return;

    const formData = new FormData(e.target);
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const duration = parseInt(formData.get("duration") as string);

    // Save to Supabase (Publicly)
    const { error } = await supabase
      .from('map_cautions')
      .insert([{ 
        location: `POINT(${newPin.lng} ${newPin.lat})`, 
        description, 
        type, 
        duration_minutes: duration 
      }]);

    if (!error) {
      // Refresh list immediately
      const { data } = await supabase.from('map_cautions_readable').select('*');
      if (data) setCautions(data);
      setNewPin(null);
      setIsEditMode(false);
    }
  };

  const handleMapClick = (e: any) => {
    if (!isEditMode) return;
    setNewPin(e.latlng); 
  };

  return (
    <div className="relative h-full w-full">
      
      {/* Edit Mode Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => { setIsEditMode(!isEditMode); setNewPin(null); }}
          className={`px-4 py-2 rounded-lg font-bold shadow-lg transition-colors ${isEditMode ? "bg-red-500 text-white" : "bg-blue-600 text-white"}`}
        >
          {isEditMode ? "Cancel" : "➕ Add Pin"}
        </button>
      </div>

      {/* Popup Form */}
      {newPin && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-xl shadow-2xl z-[1001] w-80">
          <h3 className="font-bold text-lg mb-4">Add Community Pin</h3>
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
            <input name="description" placeholder="Description" required className="border p-2 rounded" />
            <select name="type" className="border p-2 rounded">
              <option value="hazard">⚠️ Hazard</option>
              <option value="safe">✅ Safe Zone</option>
              <option value="event">🎉 Event</option>
              <option value="police">👮 Security</option>
            </select>
            <select name="duration" className="border p-2 rounded">
              <option value="30">30 Mins</option>
              <option value="60">1 Hour</option>
              <option value="120">2 Hours</option>
              <option value="1440">1 Day</option>
            </select>
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setNewPin(null)} className="flex-1 bg-gray-300 p-2 rounded">Cancel</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white p-2 rounded">Save</button>
            </div>
          </form>
        </div>
      )}

      <MapContainer center={startPosition} zoom={16} style={{ height: "100%", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        
        <LocateUserButton />

        {isEditMode && <MapClickHandler onMapClick={handleMapClick} />}

        {cautions.map((caution) => (
          <Marker key={caution.id} position={[caution.lat, caution.lng]} icon={getIcon(caution.type)}>
            <Popup>
              <div className="text-center">
                <div className="text-2xl mb-1">{caution.type === 'safe' ? '✅' : caution.type === 'event' ? '🎉' : '⚠️'}</div>
                <strong>{caution.description}</strong>
                <div className="text-xs text-gray-500 mt-2">Expires in {caution.duration_minutes} mins</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}