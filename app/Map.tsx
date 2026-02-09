"use client";
// @ts-ignore
import { HeatmapLayer } from "react-leaflet-heatmap-layer-v3";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { supabase } from "./supabase";

// --- 1. HELPERS & STYLES ---

// Helper to calculate the ticking countdown
const calculateTimeLeft = (createdAt: string, durationMinutes: number) => {
  const expiryTime = new Date(createdAt).getTime() + durationMinutes * 60000;
  const now = new Date().getTime();
  const diff = expiryTime - now;

  if (diff <= 0) return "Expired";

  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  return `${mins}m ${secs}s left`;
};

// Custom Icons using Emojis
const getIcon = (type: string) => {
  let emoji = type === "safe" ? "✅" : type === "event" ? "🎉" : "⚠️";
  return L.divIcon({
    className: "custom-map-icon",
    html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// --- 2. SUB-COMPONENTS ---

function LocateUserButton() {
  const map = useMap();
  const handleFindMe = () => {
    if (!navigator.geolocation) return alert("GPS not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 18, { animate: true }),
      () => alert("Please allow GPS access")
    );
  };
  return (
    <button 
      onClick={handleFindMe} 
      className="absolute bottom-8 right-4 z-[1000] bg-white p-3 rounded-full shadow-2xl hover:bg-gray-100 border-2 border-blue-500 transition-all active:scale-95"
    >
      <span className="text-xl">📍</span>
    </button>
  );
}

function MapEventsHandler({ onMapClick }: { onMapClick: (latlng: any) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// --- 3. MAIN COMPONENT ---

export default function Map() {
  const [cautions, setCautions] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPin, setNewPin] = useState<{lat: number, lng: number} | null>(null);
  const [ticker, setTicker] = useState(Date.now()); // Forces real-time UI update

  const startPosition: [number, number] = [1.3483, 103.6831]; // NTU Campus

  // Fetch from the "Readable" view we created in SQL
  const fetchCautions = async () => {
    const { data, error } = await supabase.from('map_cautions_readable').select('*');
    if (!error && data) setCautions(data);
  };

  useEffect(() => {
    fetchCautions();
    // Refresh data every 10 seconds from DB
    const dataInterval = setInterval(fetchCautions, 10000);
    // Refresh UI every 1 second for the countdown clock
    const uiInterval = setInterval(() => setTicker(Date.now()), 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(uiInterval);
    };
  }, []);

  const handleVerify = async (id: number) => {
    const { error } = await supabase.rpc('verify_caution', { caution_id: id });
    if (!error) fetchCautions();
  };

  const handleFormSubmit = async (e: any) => {
    e.preventDefault();
    if (!newPin) return;
    const formData = new FormData(e.target);
    
    const { error } = await supabase.from('map_cautions').insert([{ 
      location: `POINT(${newPin.lng} ${newPin.lat})`, 
      description: formData.get("description"), 
      type: formData.get("type"), 
      duration_minutes: parseInt(formData.get("duration") as string) 
    }]);

    if (!error) {
      fetchCautions();
      setNewPin(null);
      setIsEditMode(false);
    }
  };

  return (
    <div className="relative h-screen w-full font-sans">
      
      {/* HEADER OVERLAY */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
        <h1 className="text-2xl font-black text-blue-900 bg-white/80 backdrop-blur px-4 py-2 rounded-xl shadow-lg border-l-4 border-blue-600">
          SafeCircle <span className="text-sm font-normal text-gray-500 ml-2">NTU Edition</span>
        </h1>
      </div>

      {/* EDIT MODE TOGGLE */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button 
          onClick={() => { setIsEditMode(!isEditMode); setNewPin(null); }}
          className={`px-6 py-3 rounded-full font-bold shadow-xl transition-all active:scale-95 ${
            isEditMode ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isEditMode ? "✖ Cancel" : "➕ Report Hazard"}
        </button>
      </div>

      {/* NEW PIN FORM */}
      {newPin && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)] z-[1001] w-80 border border-gray-100">
          <h3 className="font-bold text-xl mb-4 text-gray-800 text-center">New Report</h3>
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <input 
              name="description" 
              placeholder="What's happening?" 
              autoFocus
              required 
              className="border-2 border-gray-100 p-3 rounded-xl focus:border-blue-400 outline-none transition-all text-black" 
            />
            <select name="type" className="border-2 border-gray-100 p-3 rounded-xl text-black">
              <option value="hazard">⚠️ Hazard</option>
              <option value="safe">✅ Safe Zone</option>
              <option value="event">🎉 Event</option>
            </select>
            <select name="duration" className="border-2 border-gray-100 p-3 rounded-xl text-black">
              <option value="5">5 Minutes (Test)</option>
              <option value="30">30 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="180">3 Hours</option>
            </select>
            <button type="submit" className="bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all">
              Confirm Location
            </button>
          </form>
        </div>
      )}

      {/* THE MAP */}
      <MapContainer 
        center={startPosition} 
        zoom={16} 
        zoomControl={false} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* HEATMAP - Visual density of hazards */}
        <HeatmapLayer
          points={cautions}
          longitudeExtractor={(m: any) => m.lng}
          latitudeExtractor={(m: any) => m.lat}
          intensityExtractor={(m: any) => 1}
          radius={35}
          blur={20}
        />

        <LocateUserButton />
        <MapEventsHandler onMapClick={(latlng) => isEditMode && setNewPin(latlng)} />

        {/* PIN MARKERS */}
        {cautions.map((caution) => (
          <Marker 
            key={caution.id} 
            position={[caution.lat, caution.lng]} 
            icon={getIcon(caution.type)}
          >
            <Popup className="custom-popup">
              <div className="text-center p-2 min-w-[160px] text-black">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{caution.type}</span>
                <strong className="block text-xl mt-1 text-gray-800">{caution.description}</strong>
                
                <div className="my-4 p-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 mb-2">
                    Verified by {caution.votes || 0} People
                  </p>
                  <button 
                    onClick={() => handleVerify(caution.id)} 
                    className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95"
                  >
                    👍 Still Here
                  </button>
                </div>

                {/* THE COUNTDOWN */}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full font-mono text-xs font-black ring-1 ring-red-200">
                  <span>⏳</span>
                  {calculateTimeLeft(caution.created_at, caution.duration_minutes)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}