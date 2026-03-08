import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

import "./Dashboard.css";
import Card from "../../components/Card/Card";
import NavBar from "../../components/NavBar/NavBar";
import Match from "../Match/Match";
import { API_BASE, getToken, clearAuth, getStoredUser } from "../../utils/auth";

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

type PingOrMatchResponse = {
    message?: string;
    mutualMatch?: boolean;
    matchedUser?: {
        user_id?: number;
        username?: string;
        profilePhoto?: string;
    };
    match?: {
        targetUserId?: number;
        timestamp?: string;
        otherUserLocation?: number[] | null;
    };
};

type MutualMatchInfo = {
    username: string;
    profilePhoto?: string;
    user_id?: number;
    matchTimestamp?: string;
};

type DailyMatchStats = {
    matchesUsedToday: number;
    maxPerDay: number;
};

const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80";

function getCurrentUserDisplayName(): string {
    const stored = getStoredUser();
    if (stored?.username) return stored.username;
    try {
        const raw = localStorage.getItem("user");
        const u = raw ? (JSON.parse(raw) as { username?: string }) : null;
        return u?.username ?? "You";
    } catch {
        return "You";
    }
}

function getCurrentUserPhoto(): string {
    try {
        const raw = localStorage.getItem("user");
        const u = raw ? (JSON.parse(raw) as { profilePhoto?: string }) : null;
        return u?.profilePhoto ?? DEFAULT_IMAGE;
    } catch {
        return DEFAULT_IMAGE;
    }
}

const SWIPE_THRESHOLD = 110;
const LIKE_EFFECT_DELAY = 260;
const SWIPE_OUT_DURATION = 320;

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
    const [mutualMatch, setMutualMatch] = useState<MutualMatchInfo | null>(null);
    const [dailyMatchStats, setDailyMatchStats] = useState<DailyMatchStats | null>(null);

    const startXRef = useRef(0);
    const hadUsersRef = useRef(false);
    const lookAgainSessionRef = useRef(false);

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

    const fetchNearbyUsers = useCallback(async (lookAgain = false) => {
        const token = getToken();

        if (!token) {
            handleUnauthorized();
            throw new Error("Missing auth token");
        }

        const url = `${API_BASE}/api/users/others${lookAgain ? "?lookAgain=true" : ""}`;
        const res = await fetch(url, {
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

    const fetchDailyMatchStats = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/users/me/daily-match-stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) return;
            const data: DailyMatchStats = await res.json();
            setDailyMatchStats(data);
        } catch {
            // ignore
        }
    }, [handleUnauthorized]);

    const refreshNearbyUsers = useCallback(
        async (initialLoad = false, lookAgain = false) => {
            try {
                if (initialLoad) {
                    setLoading(true);
                }

                setError("");
                await updateMyLocation();
                await fetchNearbyUsers(lookAgain);
                await fetchDailyMatchStats();
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
        [fetchNearbyUsers, updateMyLocation, fetchDailyMatchStats]
    );

    useEffect(() => {
        refreshNearbyUsers(true);
    }, [refreshNearbyUsers]);

    /* No auto-refresh interval: deck stays still and only changes when user swipes or clicks "Look again". */

    useEffect(() => {
        if (users.length > 0) hadUsersRef.current = true;
    }, [users.length]);

    useEffect(() => {
        if (users.length === 0) lookAgainSessionRef.current = false;
    }, [users.length]);

    const currentUser = users[currentIndex];
    const deckExhausted = users.length === 0 && hadUsersRef.current && !locationRequired;

    const removeCurrentUserFromDeck = useCallback(() => {
        setUsers((prevUsers) => {
            if (prevUsers.length === 0) return prevUsers;

            const updatedUsers = prevUsers.filter((_, index) => index !== currentIndex);
            const nextIndex =
                updatedUsers.length === 0 ? 0 : Math.min(currentIndex, updatedUsers.length - 1);

            window.setTimeout(() => setCurrentIndex(nextIndex), 0);

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

                    const data: PingOrMatchResponse | null = await res.json().catch(() => null);
                    if (res.status === 403 && data?.message) {
                        setError(data.message);
                    }
                    return data;
                })
                .then((data) => {
                    if (data?.mutualMatch === true) {
                        setMutualMatch({
                            username: data.matchedUser?.username ?? targetUser.username,
                            profilePhoto: data.matchedUser?.profilePhoto ?? targetUser.profilePhoto,
                            user_id: data.matchedUser?.user_id ?? targetUser.user_id,
                            matchTimestamp: data.match?.timestamp,
                        });
                        fetchDailyMatchStats();
                    }
                })
                .catch((err) => {
                    console.error("Right swipe request failed:", err);
                });

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
        })
            .then(async (res) => {
                if (res.status === 401) {
                    handleUnauthorized();
                    return null;
                }

                const data: PingOrMatchResponse | null = await res.json().catch(() => null);
                console.log("Ping response:", data);
                return data;
            })
            .then((data) => {
                if (data?.mutualMatch === true) {
                    setMutualMatch({
                        username: data.matchedUser?.username ?? targetUser.username,
                        profilePhoto: data.matchedUser?.profilePhoto ?? targetUser.profilePhoto,
                        user_id: data.matchedUser?.user_id ?? targetUser.user_id,
                    });
                }
            })
            .catch((err) => {
                console.error("Left swipe ping request failed:", err);
            });

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
                    {dailyMatchStats != null && (
                        <p className="dashboard__matches-left">
                            {dailyMatchStats.matchesUsedToday} of {dailyMatchStats.maxPerDay} matches used today
                        </p>
                    )}
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
                    {dailyMatchStats != null && (
                        <p className="dashboard__matches-left">
                            {dailyMatchStats.matchesUsedToday} of {dailyMatchStats.maxPerDay} matches used today
                        </p>
                    )}
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
                    <p className={`dashboard__subtitle ${deckExhausted && !locationRequired ? "dashboard__subtitle--accent" : ""}`}>
                        {locationRequired
                            ? "Enable location access to see nearby users within your radius."
                            : deckExhausted
                            ? "Find your perfect match"
                            : "No one to discover yet. Check back later!"}
                    </p>
                    {dailyMatchStats != null && (
                        <p className="dashboard__matches-left">
                            {dailyMatchStats.matchesUsedToday} of {dailyMatchStats.maxPerDay} matches used today
                        </p>
                    )}
                </div>
                <div className="dashboard__empty-deck">
                    {deckExhausted && (
                        <>
                            <p className="dashboard__empty-deck-text">Did you miss anyone?</p>
                            <p className="dashboard__empty-deck-hint">
                                Look through the list again to see who&apos;s nearby.
                            </p>
                        </>
                    )}
                    <button
                        type="button"
                        className="dashboard__reload-button"
                        onClick={async () => {
                            lookAgainSessionRef.current = true;
                            setLoading(true);
                            try {
                                await refreshNearbyUsers(false, true);
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        Look again
                    </button>
                </div>
                <NavBar />
            </div>
        );
    }

    const cardUser = currentUser;
    const cardProps = {
        name: cardUser.username,
        age: cardUser.age,
        description: cardUser.bio || "—",
        image: cardUser.profilePhoto || DEFAULT_IMAGE,
        tags: cardUser.preferences?.genderPreference ?? [],
    };

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <h1 className="dashboard__title">Discover</h1>
                <p className="dashboard__subtitle dashboard__subtitle--accent">Find your perfect match</p>
                {dailyMatchStats != null && (
                    <p className="dashboard__matches-left">
                        {dailyMatchStats.matchesUsedToday} of {dailyMatchStats.maxPerDay} matches used today
                    </p>
                )}
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
                    aria-label="It's a match!"
                >
                    <div className="dashboard__match-content dashboard__match-content--fullscreen">
                        <Match
                            key={`match-${mutualMatch.user_id ?? mutualMatch.username}`}
                            leftName={getCurrentUserDisplayName()}
                            rightName={mutualMatch.username || "Your match"}
                            leftImage={getCurrentUserPhoto()}
                            rightImage={mutualMatch.profilePhoto || DEFAULT_IMAGE}
                            initialSeconds={30 * 60}
                            matchTimestamp={mutualMatch.matchTimestamp}
                            onMakeYourMove={() => {
                                setMutualMatch(null);
                                navigate("/match");
                            }}
                        />
                        <button
                            type="button"
                            className="dashboard__match-dismiss dashboard__match-dismiss--below"
                            onClick={() => {
                                setMutualMatch(null);
                                navigate("/match");
                            }}
                        >
                            Go to Match Map
                        </button>
                    </div>
                </div>
            )}

            <NavBar />
        </div>
    );
};

export default Dashboard;