"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { supabase } from "./supabase"; // Import the connection!

// 1. A Helper Component to detect clicks
function MapClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    },
  });
  return null;
}

export default function Map() {
  const [cautions, setCautions] = useState<any[]>([]); // Store the pins
  const startPosition: LatLngExpression = [1.3483, 103.6831]; // NTU

  // 2. Fetch existing pins from Supabase when the map loads
  useEffect(() => {
    const fetchCautions = async () => {
      const { data, error } = await supabase.from('map_cautions').select('*');
      if (data) setCautions(data);
    };
    fetchCautions();
  }, []);

  // 3. Function to add a new pin
  const handleAddPin = async (e: any) => {
    const { lat, lng } = e.latlng;
    const description = prompt("What's the caution here? (e.g. Slippery Floor)");

    if (description) {
      // Save to Database
      const { data, error } = await supabase
        .from('map_cautions')
        .insert([
          { 
            location: `POINT(${lng} ${lat})`, // PostGIS format
            description: description,
            type: 'hazard' 
          }
        ])
        .select();

      if (data) {
        // Update the map instantly
        setCautions([...cautions, ...data]); 
      }
    }
  };

  return (
    <MapContainer 
      center={startPosition} 
      zoom={16} 
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      {/* This invisible component listens for clicks */}
      <MapClickHandler onMapClick={handleAddPin} />

      {/* Render all the cautions from the database */}
      {cautions.map((caution) => (
        // Note: You'll need to parse the POINT() string to [lat, lng]
        // For now, let's just log it to see if it works
        <Marker key={caution.id} position={startPosition}> 
          <Popup>{caution.description}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}