import React, { useRef, useState } from "react";
import { Heart } from "lucide-react";

import "./Dashboard.css";
import Card from "../../components/Card/Card";
import NavBar from "../../components/NavBar/NavBar";

const users = [
    {
        id: 1,
        name: "Sarah",
        age: 26,
        distance: "1 mile away",
        description: "Artist and dog lover. Always up for an adventure.",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
        tags: ["art", "dogs", "hiking"],
    },
    {
        id: 2,
        name: "Emma",
        age: 24,
        distance: "3 miles away",
        description: "Coffee addict and weekend traveler.",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
        tags: ["coffee", "travel", "music"],
    },
    {
        id: 3,
        name: "Olivia",
        age: 27,
        distance: "2 miles away",
        description: "Photographer and nature lover.",
        image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=80",
        tags: ["photography", "nature", "hiking"],
    },
];

const SWIPE_THRESHOLD = 110;
const LIKE_EFFECT_DELAY = 260;
const SWIPE_OUT_DURATION = 320;

const Dashboard: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    const [flyDirection, setFlyDirection] = useState<"left" | "right" | "">("");
    const [showLikeEffect, setShowLikeEffect] = useState(false);

    const startXRef = useRef(0);

    const currentUser = users[currentIndex];

    const nextProfile = () => {
        setCurrentIndex((prev) => (prev + 1) % users.length);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isAnimatingOut || showLikeEffect) return;
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
            nextProfile();
            setDragX(0);
            setFlyDirection("");
            setIsAnimatingOut(false);
            setShowLikeEffect(false);
        }, SWIPE_OUT_DURATION);
    };

    const completeSwipe = (direction: "left" | "right") => {
        setIsDragging(false);

        if (direction === "right") {
            setShowLikeEffect(true);

            setTimeout(() => {
                finishSwipeOut("right");
            }, LIKE_EFFECT_DELAY);

            return;
        }

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
    const heartOpacity = showLikeEffect
        ? 1
        : Math.max(0, Math.min(dragX / 120, 1));

    const style: React.CSSProperties = isAnimatingOut
        ? {}
        : {
              transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.25s ease",
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
                        name={currentUser.name}
                        age={currentUser.age}
                        distance={currentUser.distance}
                        description={currentUser.description}
                        image={currentUser.image}
                        tags={currentUser.tags}
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

            <NavBar />
        </div>
    );
};

export default Dashboard;