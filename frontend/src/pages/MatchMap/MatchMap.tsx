import {
    APIProvider,
    Map,
    AdvancedMarker,
    AdvancedMarkerAnchorPoint,
} from "@vis.gl/react-google-maps";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import point from "../../assets/points.png";
import { API_BASE, getToken } from "../../utils/auth";
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
    image: string;
    position: LatLng;
    expiresAt: number;
    timestamp: string;
};

type ApiMatch = {
    targetUserId: number;
    timestamp: string;
    otherUserLocation: [number, number];
};

type ApiUser = {
    user_id: number;
    username: string;
    age: number;
    bio?: string;
    profilePhoto?: string;
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=500&q=80";

const MATCH_WINDOW_MS = 30 * 60 * 1000;

function getExpiresAtFromMatchTimestamp(timestamp: string): number {
    return new Date(timestamp).getTime() + MATCH_WINDOW_MS;
}

/** Alias for getExpiresAtFromMatchTimestamp so legacy/cached references to getExpiresAt still work. */
const getExpiresAt = getExpiresAtFromMatchTimestamp;

const center: LatLng = {
    lat: 49.2827,
    lng: -123.1207,
};

function formatTimeLeft(msLeft: number) {
    const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const MatchMap: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [matches, setMatches] = useState<MatchPin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [now, setNow] = useState(Date.now());
    const [selectedMatch, setSelectedMatch] = useState<MatchPin | null>(null);

    const fetchMatches = useCallback(() => {
        const token = getToken();
        if (!token) {
            navigate("/", { replace: true });
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        fetch(`${API_BASE}/api/users/me/matches`, { headers })
            .then((res) => {
                if (res.status === 401) {
                    navigate("/", { replace: true });
                    return null;
                }
                if (!res.ok) throw new Error("Failed to load matches");
                return res.json();
            })
            .then(async (data: { matches?: ApiMatch[] }) => {
                const apiMatches = data?.matches ?? [];
                const pins: MatchPin[] = [];

                for (const m of apiMatches) {
                    if (!m.otherUserLocation || m.otherUserLocation.length < 2) continue;
                    const userRes = await fetch(
                        `${API_BASE}/api/users/${m.targetUserId}`,
                        { headers }
                    );
                    if (!userRes.ok) continue;

                    const user = (await userRes.json()) as ApiUser;
                    const [lng, lat] = m.otherUserLocation;

                    pins.push({
                        id: m.targetUserId,
                        name: user.username,
                        age: user.age,
                        bio: user.bio ?? "—",
                        image: user.profilePhoto || DEFAULT_IMAGE,
                        position: { lat, lng },
                        expiresAt: getExpiresAt(m.timestamp),
                        timestamp: m.timestamp,
                    });
                }

                setMatches(pins);
            })
            .catch((err) => setError(err.message || "Failed to load matches"))
            .finally(() => setLoading(false));
    }, [navigate]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches, location.pathname]);

    // Poll for new matches so the other user sees mutual matches in real time
    useEffect(() => {
        const pollInterval = setInterval(fetchMatches, 5_000);
        return () => clearInterval(pollInterval);
    }, [fetchMatches]);

    useEffect(() => {
        const token = getToken();
        const interval = setInterval(() => {
            const currentTime = Date.now();
            setNow(currentTime);

            setMatches((prev) => {
                const expired = prev.filter(
                    (match) => match.expiresAt <= currentTime
                );
                const filtered = prev.filter(
                    (match) => match.expiresAt > currentTime
                );

                if (token) {
                    expired.forEach((match) => {
                        fetch(`${API_BASE}/api/users/me/matches`, {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                targetUserId: match.id,
                                timestamp: match.timestamp,
                            }),
                        }).catch(() => { });
                    });
                }

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

    if (loading) {
        return (
            <div className="matchmap-page">
                <div className="matchmap-shell">
                    <p className="matchmap-eyebrow">Loading…</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="matchmap-page">
                <div className="matchmap-shell">
                    <p className="matchmap-eyebrow" style={{ color: "red" }}>{error}</p>
                </div>
            </div>
        );
    }

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
                                                    className={`timer-bubble ${isUrgent ? "urgent" : ""
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
                                <div className="match-popup-image-wrap">
                                    <img
                                        src={selectedMatch.image}
                                        alt={selectedMatch.name}
                                        className="match-popup-image"
                                    />
                                    <div className="match-popup-image-gradient" aria-hidden />
                                </div>

                                <div className="match-popup-content">
                                    <h2 className="match-popup-name">
                                        {selectedMatch.name}, {selectedMatch.age}
                                    </h2>

                                    <p className="match-popup-bio">{selectedMatch.bio}</p>

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
