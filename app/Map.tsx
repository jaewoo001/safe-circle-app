"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { supabase } from "./supabase";

// Helper component to handle clicks
function MapClickHandler({ onMapClick }: { onMapClick: (e: any) => void }) {
  useMapEvents({
    click: (e) => onMapClick(e),
  });
  return null;
}

export default function Map() {
  const [cautions, setCautions] = useState<any[]>([]);
  const startPosition: LatLngExpression = [1.3483, 103.6831]; // NTU

  // 1. Fetch from our new "Readable" View
  useEffect(() => {
    const fetchCautions = async () => {
      // NOTE: We are fetching from 'map_cautions_readable' now!
      const { data, error } = await supabase
        .from('map_cautions_readable')
        .select('*');
      
      if (error) console.error("Error:", error);
      else {
        console.log("Clean Data:", data); // Check console!
        setCautions(data || []);
      }
    };
    fetchCautions();
  }, []);

  // 2. Add new pin (Still inserts into the ORIGINAL table)
  const handleAddPin = async (e: any) => {
    const { lat, lng } = e.latlng;
    const description = prompt("What's the caution here?");

    if (description) {
      // We insert into the MAIN table
      const { error } = await supabase
        .from('map_cautions')
        .insert([
          { 
            location: `POINT(${lng} ${lat})`, 
            description: description,
            type: 'hazard' 
          }
        ]);

      if (!error) {
        // Optimistically add the pin to the map immediately
        // (So we don't have to wait for a refresh)
        setCautions([...cautions, { 
          id: Date.now(), 
          lat: lat, 
          lng: lng, 
          description: description 
        }]); 
      }
    }
  };

  return (
    <MapContainer 
      center={startPosition} 
      zoom={16} 
      scrollWheelZoom={true} 
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <MapClickHandler onMapClick={handleAddPin} />

      {cautions.map((caution) => (
        <Marker 
          key={caution.id} 
          // Use the clean 'lat' and 'lng' from the database view
          position={[caution.lat, caution.lng]}
        >
          <Popup>
            <strong>Caution!</strong> <br/>
            {caution.description}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}