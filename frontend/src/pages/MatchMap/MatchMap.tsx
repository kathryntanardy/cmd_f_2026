import {
    APIProvider,
    Map,
    AdvancedMarker,
    AdvancedMarkerAnchorPoint,
  } from "@vis.gl/react-google-maps";
  import { useEffect, useState } from "react";
  import point from "../../assets/points.png";
  import "./MatchMap.css";
  
  type LatLng = {
    lat: number;
    lng: number;
  };
  
  type MatchPin = {
    id: number;
    position: LatLng;
    expiresAt: number;
  };
  
  const center: LatLng = {
    lat: 49.2827,
    lng: -123.1207,
  };
  
  const initialMatches: MatchPin[] = [
    {
      id: 1,
      position: { lat: 49.2827, lng: -123.1207 },
      expiresAt: Date.now() + 30 * 60 * 1000,
    },
    {
      id: 2,
      position: { lat: 49.2767, lng: -123.1300 },
      expiresAt: Date.now() + 24 * 60 * 1000,
    },
    {
      id: 3,
      position: { lat: 49.27, lng: -123.1 },
      expiresAt: Date.now() + 18 * 60 * 1000,
    },
    {
      id: 4,
      position: { lat: 49.295, lng: -123.12 },
      expiresAt: Date.now() + 12 * 60 * 1000,
    },
    {
      id: 5,
      position: { lat: 49.25, lng: -123.11 },
      expiresAt: Date.now() + 6 * 60 * 1000,
    },
  ];
  
  function formatTimeLeft(msLeft: number) {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  
  const MatchMap: React.FC = () => {
    const [matches, setMatches] = useState<MatchPin[]>(initialMatches);
    const [now, setNow] = useState(Date.now());
  
    useEffect(() => {
      const interval = setInterval(() => {
        const currentTime = Date.now();
        setNow(currentTime);
  
        setMatches((prev) =>
          prev.filter((match) => match.expiresAt > currentTime)
        );
      }, 1000);
  
      return () => clearInterval(interval);
    }, []);
  
    return (
      <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
        <div className="matchmap-page">
          <div className="matchmap-shell">
            <div className="matchmap-header">
              <p className="matchmap-eyebrow">Nearby matches</p>
              <h1 className="matchmap-title">Meet before the timer runs out</h1>
              <p className="matchmap-subtitle">
                Once you match nearby, you get a limited window to meet in person.
              </p>
            </div>
  
            <div className="map-card">
              <div className="map-card-top">  
                <div className="map-badge">
                  {matches.length} Active Matches
                </div>
              </div>
  
              <div className="map-frame">
                <Map defaultCenter={center} defaultZoom={12} mapId="DEMO_MAP_ID">
                  {matches.map((match) => {
                    const msLeft = match.expiresAt - now;
                    const isUrgent = msLeft <= 5 * 60 * 1000;
  
                    return (
                      <AdvancedMarker
                        key={match.id}
                        position={match.position}
                        anchorPoint={AdvancedMarkerAnchorPoint.BOTTOM_CENTER}
                      >
                        <div className="marker-wrapper">
                          <div
                            className={`timer-bubble ${isUrgent ? "urgent" : ""}`}
                          >
                            {formatTimeLeft(msLeft)}
                          </div>
  
                          <img
                            src={point}
                            alt="marker"
                            className="marker-icon"
                          />
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </div>
            </div>
          </div>
        </div>
      </APIProvider>
    );
  };
  
  export default MatchMap;