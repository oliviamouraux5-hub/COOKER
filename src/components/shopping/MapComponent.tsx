'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'


function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 15)
    // Force Leaflet to recalculate size when container becomes active
    map.invalidateSize()
  }, [lat, lng, map])
  return null
}

interface MapProps {
  center: { lat: number; lng: number }
  stores: any[]
}

export default function MapComponent({ center, stores }: MapProps) {
  // Fix for default marker icon (move inside component to prevent SSR execution crash)
  const customIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px rgba(37, 99, 235, 0.5); position: relative;">
            <div style="position: absolute; inset: -8px; background-color: rgba(37, 99, 235, 0.2); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
           </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })

  const storeIcon = L.divIcon({
    className: 'store-icon',
    html: `<div style="background-color: #f97316; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(249, 115, 22, 0.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })

  return (
    <MapContainer 
      key="shopping-map"
      center={[center.lat, center.lng]} 
      zoom={15} 
      style={{ height: '584px', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap lat={center.lat} lng={center.lng} />
      
      {/* User Location Marker */}
      <Marker position={[center.lat, center.lng]} icon={customIcon}>
        <Popup>Your Location</Popup>
      </Marker>
      
      {/* Store Markers */}
      {stores.map((store, i) => (
        <Marker key={i} position={[store.lat, store.lng]} icon={storeIcon}>
          <Popup>
            <div className="font-bold">{store.name}</div>
            <div className="text-xs text-muted-foreground">{store.address}</div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
