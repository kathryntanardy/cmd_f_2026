import React, { useEffect, useMemo, useState } from "react";
import "./Match.css";

type MatchPageProps = {
  leftName?: string;
  rightName?: string;
  leftImage?: string;
  rightImage?: string;
  initialSeconds?: number;
};

const Match: React.FC<MatchPageProps> = ({
  leftName = "Ava",
  rightName = "Noah",
  leftImage = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop",
  rightImage = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop",
  initialSeconds = 30,
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [timeLeft]);

  const progress = (timeLeft / initialSeconds) * 100;
  const urgent = timeLeft <= 10 && timeLeft > 0;
  const expired = timeLeft <= 0;

  return (
    <div className={`match-page ${urgent ? "urgent" : ""} ${expired ? "expired" : ""}`}>
      <div className="background-heart">♥</div>

      <div className="match-content">
        <p className="match-tag">Nearby match detected</p>
        <h1 className="match-heading">You matched.</h1>
        <p className="match-subheading">
          You’re both here right now. Make a move before the timer runs out.
        </p>

        <div className="collision-zone">
          <div className={`profile-orbit profile-left ${expired ? "separate-left" : ""}`}>
            <div className="profile-avatar-wrap">
              <img src={leftImage} alt={leftName} className="profile-avatar" />
            </div>
            <p className="profile-name">{leftName}</p>
          </div>

          <div className="heart-core">
            {!expired && (
              <>
                <div className="pulse-ring pulse-ring-1" />
                <div className="pulse-ring pulse-ring-2" />
                <div className="pulse-ring pulse-ring-3" />
              </>
            )}

            <div className="heart-center">♥</div>
          </div>

          <div className={`profile-orbit profile-right ${expired ? "separate-right" : ""}`}>
            <div className="profile-avatar-wrap">
              <img src={rightImage} alt={rightName} className="profile-avatar" />
            </div>
            <p className="profile-name">{rightName}</p>
          </div>
        </div>

        <div className="timer-panel">
          <p className="timer-label">Time left to make your move</p>
          <div className="timer-value">{formattedTime}</div>

          <div className="timer-bar">
            <div
              className="timer-fill"
              style={{ width: `${Math.max(progress, 0)}%` }}
            />
          </div>

          <p className="timer-caption">
            {expired
              ? "The moment passed."
              : urgent
              ? "Hurry — this match is about to expire."
              : "The connection disappears when the timer ends."}
          </p>

          <button className="move-button" disabled={expired}>
            {expired ? "Match Ended" : "Make Your Move"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Match;