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
    name: string;
    age: number;
    bio: string;
    interests: string[];
    image: string;
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
        name: "Sophie",
        age: 22,
        bio: "Love matcha, sunset walks, and trying new cafés.",
        interests: ["Matcha", "Cafés", "Photography"],
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
        position: { lat: 49.2827, lng: -123.1207 },
        expiresAt: Date.now() + 30 * 60 * 1000,
    },
    {
        id: 2,
        name: "Maya",
        age: 24,
        bio: "Gym, brunch, and spontaneous adventures.",
        interests: ["Fitness", "Brunch", "Travel"],
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=500&q=80",
        position: { lat: 49.2767, lng: -123.13 },
        expiresAt: Date.now() + 24 * 60 * 1000,
    },
    {
        id: 3,
        name: "Emma",
        age: 21,
        bio: "Big into music, night drives, and deep talks.",
        interests: ["Music", "Night drives", "Books"],
        image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80",
        position: { lat: 49.27, lng: -123.1 },
        expiresAt: Date.now() + 18 * 60 * 1000,
    },
    {
        id: 4,
        name: "Ava",
        age: 23,
        bio: "Always down for dessert runs and beach days.",
        interests: ["Desserts", "Beach", "Movies"],
        image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=500&q=80",
        position: { lat: 49.295, lng: -123.12 },
        expiresAt: Date.now() + 12 * 60 * 1000,
    },
    {
        id: 5,
        name: "Chloe",
        age: 25,
        bio: "Dog lover, foodie, and always planning the next trip.",
        interests: ["Dogs", "Food", "Travel"],
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80",
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
    const [selectedMatch, setSelectedMatch] = useState<MatchPin | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const currentTime = Date.now();
            setNow(currentTime);

            setMatches((prev) => {
                const filtered = prev.filter(
                    (match) => match.expiresAt > currentTime
                );

                if (
                    selectedMatch &&
                    !filtered.some((match) => match.id === selectedMatch.id)
                ) {
                    setSelectedMatch(null);
                }

                return filtered;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedMatch]);

    return (
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <div className="matchmap-page">
                <div className="matchmap-shell">
                    <div className="matchmap-header">
                        <p className="matchmap-eyebrow">Nearby matches</p>
                        <h1 className="matchmap-title">
                            Meet before the timer runs out
                        </h1>
                        <p className="matchmap-subtitle">
                            Once you match nearby, you get a limited window to
                            meet in person.
                        </p>
                    </div>

                    <div className="map-card">
                        <div className="map-card-top">
                            <div className="map-badge">
                                {matches.length} Active Matches
                            </div>
                        </div>

                        <div className="map-frame">
                            <Map
                                defaultCenter={center}
                                defaultZoom={12}
                                mapId="DEMO_MAP_ID"
                            >
                                {matches.map((match) => {
                                    const msLeft = match.expiresAt - now;
                                    const isUrgent = msLeft <= 5 * 60 * 1000;

                                    return (
                                        <AdvancedMarker
                                            key={match.id}
                                            position={match.position}
                                            anchorPoint={
                                                AdvancedMarkerAnchorPoint.BOTTOM_CENTER
                                            }
                                        >
                                            <div
                                                className="marker-wrapper clickable-marker"
                                                onClick={() =>
                                                    setSelectedMatch(match)
                                                }
                                            >
                                                <div
                                                    className={`timer-bubble ${
                                                        isUrgent ? "urgent" : ""
                                                    }`}
                                                >
                                                    {formatTimeLeft(msLeft)}
                                                </div>

                                                <img
                                                    src={point}
                                                    alt={`${match.name} marker`}
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

                {selectedMatch && (
                    <div
                        className="match-popup-overlay"
                        onClick={() => setSelectedMatch(null)}
                    >
<div
  className="match-popup-pulse-wrap"
  onClick={(e) => e.stopPropagation()}
>
  <span className="match-popup-ring ring-1"></span>
  <span className="match-popup-ring ring-2"></span>
  <span className="match-popup-ring ring-3"></span>

  <div className="match-popup">
    <img
      src={selectedMatch.image}
      alt={selectedMatch.name}
      className="match-popup-image"
    />

    <div className="match-popup-content">
      <h2 className="match-popup-name">
        {selectedMatch.name}, {selectedMatch.age}
      </h2>

      <p className="match-popup-bio">{selectedMatch.bio}</p>

      <div className="match-popup-tags">
        {selectedMatch.interests.map((interest) => (
          <span key={interest} className="match-tag">
            {interest}
          </span>
        ))}
      </div>

      <p className="match-popup-timer">
        Time left: {formatTimeLeft(selectedMatch.expiresAt - now)}
      </p>

      <button
        className="match-popup-button"
        onClick={() => setSelectedMatch(null)}
      >
        Close
      </button>
    </div>
  </div>
</div>
                    </div>
                )}
            </div>
        </APIProvider>
    );
};

export default MatchMap;
