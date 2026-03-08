import React, { useEffect, useMemo, useState } from "react";
import "./Match.css";

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80";

const MATCH_WINDOW_MS = 30 * 60 * 1000;

type MatchPageProps = {
  /** Current user's display name (left side) */
  leftName?: string;
  /** Matched user's display name (right side) */
  rightName?: string;
  /** Current user's profile photo URL (left side) */
  leftImage?: string;
  /** Matched user's profile photo URL (right side) */
  rightImage?: string;
  initialSeconds?: number;
  /** When true, timer never runs out – animation plays until user dismisses (only used when no matchTimestamp) */
  noExpiry?: boolean;
  /** Called when "Make Your Move" is clicked (e.g. go to match map) */
  onMakeYourMove?: () => void;
  /** Match creation time (ISO string) – when set, shows 30‑min countdown synced with backend/map */
  matchTimestamp?: string;
};

const Match: React.FC<MatchPageProps> = ({
  leftName = "You",
  rightName = "Your match",
  leftImage = DEFAULT_AVATAR,
  rightImage = DEFAULT_AVATAR,
  initialSeconds = 30,
  noExpiry = false,
  onMakeYourMove,
  matchTimestamp,
}) => {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(initialSeconds);
  const [now, setNow] = useState(() => Date.now());

  const useSyncTimer = typeof matchTimestamp === "string" && matchTimestamp.length > 0;
  const matchStartMs = useSyncTimer ? new Date(matchTimestamp).getTime() : 0;
  const expiresAtMs = matchStartMs + MATCH_WINDOW_MS;
  const timeLeftMs = useSyncTimer ? Math.max(0, expiresAtMs - now) : timeLeftSeconds * 1000;
  const timeLeftSecondsSync = Math.floor(timeLeftMs / 1000);

  useEffect(() => {
    if (useSyncTimer) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
    if (noExpiry || timeLeftSeconds <= 0) return;
    const interval = setInterval(() => setTimeLeftSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [useSyncTimer, noExpiry, timeLeftSeconds]);

  const displaySeconds = useSyncTimer ? timeLeftSecondsSync : timeLeftSeconds;
  const totalSeconds = useSyncTimer ? MATCH_WINDOW_MS / 1000 : initialSeconds;
  const formattedTime = useMemo(() => {
    const mins = Math.floor(displaySeconds / 60);
    const secs = displaySeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [displaySeconds]);

  const progress = totalSeconds > 0 ? (displaySeconds / totalSeconds) * 100 : 0;
  const urgent = !noExpiry && displaySeconds <= 5 * 60 && displaySeconds > 0;
  const expired = !noExpiry && displaySeconds <= 0;

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

          <button
            type="button"
            className="move-button"
            disabled={expired}
            onClick={onMakeYourMove}
          >
            {expired ? "Match Ended" : "Make Your Move"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Match;