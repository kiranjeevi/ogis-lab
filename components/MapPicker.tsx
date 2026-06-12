"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LatLng, Station } from "@/lib/types";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function dotIcon(color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.6);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const stationIcon = dotIcon("#71717a", 12);
const selectedStationIcon = dotIcon("#f59e0b", 16);

interface MapPickerProps {
  position: LatLng;
  onChange: (position: LatLng) => void;
  stations?: Station[];
  selectedStationId?: string;
}

function ClickHandler({ onChange }: { onChange: (position: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

function RecenterOnChange({ position }: { position: LatLng }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView([position.lat, position.lon], map.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lon]);
  return null;
}

export default function MapPicker({
  position,
  onChange,
  stations = [],
  selectedStationId,
}: MapPickerProps) {
  return (
    <MapContainer
      center={[position.lat, position.lon]}
      zoom={11}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[position.lat, position.lon]} icon={markerIcon}>
        <Tooltip permanent direction="top" offset={[0, -38]}>
          Project location
        </Tooltip>
      </Marker>
      {stations.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={s.id === selectedStationId ? selectedStationIcon : stationIcon}
        >
          <Tooltip direction="top">
            {s.name} ({s.distanceMiles.toFixed(1)} mi)
          </Tooltip>
        </Marker>
      ))}
      <ClickHandler onChange={onChange} />
      <RecenterOnChange position={position} />
    </MapContainer>
  );
}
