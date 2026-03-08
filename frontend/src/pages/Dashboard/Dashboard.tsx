import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

import "./Dashboard.css";
import Card from "../../components/Card/Card";
import NavBar from "../../components/NavBar/NavBar";
import { API_BASE, getToken, clearAuth } from "../../utils/auth";

type ApiUser = {
    _id: string;
    user_id?: number;
    username: string;
    age: number;
    bio?: string;
    profilePhoto?: string;
    preferences?: { genderPreference?: string[] };
    distanceMeters?: number | null;
};

type OthersResponse = {
    users?: ApiUser[];
    locationRequired?: boolean;
    message?: string;
};

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80";

function formatDistance(meters: number | null | undefined): string {
    if (meters == null) return "—";
    if (meters < 1000) return `${Math.round(meters)} m away`;
    const km = meters / 1000;
    return km < 10 ? `${km.toFixed(1)} km away` : `${Math.round(km)} km away`;
}

const SWIPE_THRESHOLD = 110;
const LIKE_EFFECT_DELAY = 260;
const SWIPE_OUT_DURATION = 320;
const REFRESH_INTERVAL_MS = 5000;

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [locationRequired, setLocationRequired] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [flyDirection, setFlyDirection] = useState<"left" | "right" | "">("");
    const [showLikeEffect, setShowLikeEffect] = useState(false);
    const [mutualMatch, setMutualMatch] = useState<{ username: string } | null>(null);

    const startXRef = useRef(0);
    const intervalRef = useRef<number | null>(null);

    const handleUnauthorized = useCallback(() => {
        clearAuth();
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    }, [navigate]);

    const getCurrentCoordinates = useCallback((): Promise<[number, number]> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported in this browser."));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve([position.coords.longitude, position.coords.latitude]);
                },
                (geoError) => {
                    reject(new Error(geoError.message || "Unable to get your location."));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    }, []);

    const updateMyLocation = useCallback(async () => {
        const token = getToken();

        if (!token) {
            handleUnauthorized();
            throw new Error("Missing auth token");
        }

        const coordinates = await getCurrentCoordinates();

        const res = await fetch(`${API_BASE}/api/users/me/location`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ coordinates }),
        });

        if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Unauthorized");
        }

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data?.message || "Failed to update location");
        }

        return data;
    }, [getCurrentCoordinates, handleUnauthorized]);

    const fetchNearbyUsers = useCallback(async () => {
        const token = getToken();

        if (!token) {
            handleUnauthorized();
            throw new Error("Missing auth token");
        }

        const res = await fetch(`${API_BASE}/api/users/others`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.status === 401) {
            handleUnauthorized();
            throw new Error("Unauthorized");
        }

        const data: OthersResponse = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data?.message || "Failed to load users");
        }

        const nextUsers = Array.isArray(data?.users) ? data.users : [];
        setUsers(nextUsers);
        setLocationRequired(data?.locationRequired === true);

        setCurrentIndex((prev) => {
            if (nextUsers.length === 0) return 0;
            return prev >= nextUsers.length ? 0 : prev;
        });
    }, [handleUnauthorized]);

    const refreshNearbyUsers = useCallback(
        async (initialLoad = false) => {
            try {
                if (initialLoad) {
                    setLoading(true);
                }

                setError("");
                await updateMyLocation();
                await fetchNearbyUsers();
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : "Failed to refresh nearby users";
                if (message !== "Unauthorized") {
                    setError(message);
                }
            } finally {
                if (initialLoad) {
                    setLoading(false);
                }
            }
        },
        [fetchNearbyUsers, updateMyLocation]
    );

    useEffect(() => {
        refreshNearbyUsers(true);
    }, [refreshNearbyUsers]);

    useEffect(() => {
        intervalRef.current = window.setInterval(() => {
            refreshNearbyUsers(false);
        }, REFRESH_INTERVAL_MS);

        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, [refreshNearbyUsers]);

    useEffect(() => {
        const handleFocus = () => {
            refreshNearbyUsers(false);
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [refreshNearbyUsers]);

    const currentUser = users[currentIndex];

    const removeCurrentUserFromDeck = useCallback(() => {
        setUsers((prevUsers) => {
            if (prevUsers.length === 0) return prevUsers;

            const updatedUsers = prevUsers.filter((_, index) => index !== currentIndex);

            setCurrentIndex((prevIndex) => {
                if (updatedUsers.length === 0) return 0;
                if (prevIndex >= updatedUsers.length) return 0;
                return prevIndex;
            });

            return updatedUsers;
        });
    }, [currentIndex]);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isAnimatingOut || showLikeEffect || users.length === 0) return;
        startXRef.current = e.clientX;
        setIsDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || isAnimatingOut) return;

        const deltaX = e.clientX - startXRef.current;
        const clampedX = Math.max(-180, Math.min(deltaX, 180));
        setDragX(clampedX);
    };

    const resetCard = () => {
        setIsDragging(false);
        setDragX(0);
    };

    const finishSwipeOut = (direction: "left" | "right") => {
        setFlyDirection(direction);
        setIsAnimatingOut(true);

        setTimeout(() => {
            removeCurrentUserFromDeck();
            setDragX(0);
            setFlyDirection("");
            setIsAnimatingOut(false);
            setShowLikeEffect(false);
            refreshNearbyUsers(false);
        }, SWIPE_OUT_DURATION);
    };

    const completeSwipe = (direction: "left" | "right") => {
        setIsDragging(false);

        const targetUser = users[currentIndex];
        if (!targetUser?.user_id) {
            finishSwipeOut(direction);
            return;
        }

        if (direction === "right") {
            fetch(`${API_BASE}/api/users/me/matches`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ targetUserId: targetUser.user_id }),
            })
                .then(async (res) => {
                    if (res.status === 401) {
                        handleUnauthorized();
                        return null;
                    }
                    return res.json().catch(() => null);
                })
                .then((data) => {
                    if (data?.mutualMatch === true) {
                        setMutualMatch({ username: targetUser.username });
                    }
                })
                .catch(() => {});

            setShowLikeEffect(true);
            setTimeout(() => {
                finishSwipeOut("right");
            }, LIKE_EFFECT_DELAY);
            return;
        }

        fetch(`${API_BASE}/api/users/me/pings`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ targetUserId: targetUser.user_id }),
        }).catch(() => {});

        finishSwipeOut("left");
    };

    const handlePointerUp = () => {
        if (!isDragging || isAnimatingOut) return;

        if (dragX > SWIPE_THRESHOLD) {
            completeSwipe("right");
            return;
        }

        if (dragX < -SWIPE_THRESHOLD) {
            completeSwipe("left");
            return;
        }

        resetCard();
    };

    const handlePointerLeave = () => {
        if (!isDragging || isAnimatingOut) return;
        handlePointerUp();
    };

    const rotation = dragX * 0.05;
    const heartOpacity = showLikeEffect ? 1 : Math.max(0, Math.min(dragX / 120, 1));

    const style: React.CSSProperties = isAnimatingOut
        ? {}
        : {
              transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.25s ease",
          };

    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard__header">
                    <h1 className="dashboard__title">Discover</h1>
                    <p className="dashboard__subtitle">Loading…</p>
                </div>
                <NavBar />
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard">
                <div className="dashboard__header">
                    <h1 className="dashboard__title">Discover</h1>
                    <p className="dashboard__subtitle" style={{ color: "red" }}>
                        {error}
                    </p>
                </div>
                <NavBar />
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="dashboard">
                <div className="dashboard__header">
                    <h1 className="dashboard__title">Discover</h1>
                    <p className="dashboard__subtitle">
                        {locationRequired
                            ? "Enable location access to see nearby users within your radius."
                            : "No one to discover yet. Check back later!"}
                    </p>
                </div>
                <NavBar />
            </div>
        );
    }

    const cardUser = currentUser;
    const cardProps = {
        name: cardUser.username,
        age: cardUser.age,
        distance: formatDistance(cardUser.distanceMeters),
        description: cardUser.bio || "—",
        image: cardUser.profilePhoto || DEFAULT_IMAGE,
        tags: cardUser.preferences?.genderPreference ?? [],
    };

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <h1 className="dashboard__title">Discover</h1>
                <p className="dashboard__subtitle">Find your perfect match</p>
            </div>

            <div className="centerCard">
                <div
                    className={`dashboard__cardContainer ${
                        flyDirection ? `dashboard__cardContainer--${flyDirection}` : ""
                    } ${showLikeEffect ? "dashboard__cardContainer--liked" : ""}`}
                    style={style}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    onPointerCancel={handlePointerUp}
                >
                    <Card
                        name={cardProps.name}
                        age={cardProps.age}
                        distance={cardProps.distance}
                        description={cardProps.description}
                        image={cardProps.image}
                        tags={cardProps.tags}
                    />

                    <div
                        className={`dashboard__likeGlow ${
                            showLikeEffect ? "dashboard__likeGlow--active" : ""
                        }`}
                    />

                    <div
                        className={`dashboard__heartOverlay ${
                            showLikeEffect ? "dashboard__heartOverlay--active" : ""
                        }`}
                        style={{ opacity: heartOpacity }}
                    >
                        <Heart size={96} fill="currentColor" />
                    </div>
                </div>
            </div>

            {mutualMatch && (
                <div
                    className="dashboard__match-overlay"
                    role="alert"
                    aria-live="polite"
                >
                    <div className="dashboard__match-content">
                        <span className="dashboard__match-heart">♥</span>
                        <h2 className="dashboard__match-title">It&apos;s a match!</h2>
                        <p className="dashboard__match-name">
                            You and {mutualMatch.username} liked each other.
                        </p>
                        <button
                            type="button"
                            className="dashboard__match-dismiss"
                            onClick={() => {
                                setMutualMatch(null);
                                navigate("/match");
                            }}
                        >
                            View match
                        </button>
                    </div>
                </div>
            )}

            <NavBar />
        </div>
    );
};

export default Dashboard;