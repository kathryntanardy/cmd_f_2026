import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Camera, MapPin, LogOut } from "lucide-react";
import { API_BASE, getToken, clearAuth } from "../../utils/auth";
import "./UserProfilePage.css";

export type ProfileUser = {
    _id?: string;
    id?: string;
    user_id?: number;
    username: string;
    email: string;
    age: number;
    bio?: string;
    profilePhoto?: string;
    location?: {
        type: string;
        coordinates: [number, number];
    };
    preferences?: {
        genderPreference?: string[];
        ageMin?: number;
        ageMax?: number;
        maxDistanceMeters?: number;
    };
    "hideProfile"?: boolean;
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80";

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [shareLocation, setShareLocation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();

    if (!token) {
      clearAuth();
      localStorage.removeItem("user");
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

        fetch(`${API_BASE}/api/users/me`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
                if (cancelled) return;
                if (res.status === 401) {
                    clearAuth();
                    localStorage.removeItem("user");
                    navigate("/", { replace: true });
                    return;
                }
                if (!res.ok) {
                    setError("Failed to load profile");
                    setLoading(false);
                    return;
                }
                return res.json();
            })
            .then((data) => {
                if (cancelled || !data) return;
                setUser(data as ProfileUser);
                setShareLocation(!(data as ProfileUser)["hideProfile"]);
            })
            .catch(() => {
                if (!cancelled) {
                    setError("Failed to load profile");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleToggleShareLocation = async () => {
    const token = getToken();

    if (!token) {
      clearAuth();
      localStorage.removeItem("user");
      navigate("/", { replace: true });
      return;
    }

    const newShareLocation = !shareLocation;
    const newHideProfile = !newShareLocation;

        try {
            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ "hideProfile": newHideProfile }),
            });

            if (res.ok) {
                setShareLocation(newShareLocation);
                setUser((prev) => (prev ? { ...prev, "hideProfile": newHideProfile } : null));
            } else {
                setError("Failed to update location sharing");
            }
        } catch {
            setError("Failed to update location sharing");
        }
    };

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    setUser(null);
    setShareLocation(true);
    setError("");
    setLoading(false);

    clearAuth();
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-page__container">
          <p className="profile-page__loading">Loading…</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-page">
        <div className="profile-page__container">
          <p className="profile-page__loading">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-page__container">
          <p className="profile-page__loading">No profile found.</p>
        </div>
      </div>
    );
  }

  const photo = user.profilePhoto || DEFAULT_IMAGE;

  const locationLabel =
    user.location?.coordinates?.length === 2
      ? `${user.location.coordinates[1].toFixed(4)}°, ${user.location.coordinates[0].toFixed(4)}°`
      : "—";

  const interests = user.preferences?.genderPreference ?? [];

  return (
    <div className="profile-page">
      <div className="profile-page__container">
        <div className="profile-page__header">
          <h1 className="profile-page__title">My Profile</h1>

          <button
            type="button"
            className="profile-page__icon-button"
            onClick={() => navigate("/preferences")}
            aria-label="Open preferences"
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        </div>

        <div className="profile-page__content">
          <div className="profile-photo-card">
            <img
              src={photo}
              alt={user.username}
              className="profile-photo-card__image"
            />

            <button
              type="button"
              className="profile-photo-card__camera-button"
              aria-label="Change profile photo"
            >
              <Camera size={28} strokeWidth={2} />
            </button>
          </div>

          <div className="profile-info-card">
            <div className="profile-info-card__top">
              <h2 className="profile-info-card__name">
                {user.username}, {user.age}
              </h2>

              <div className="profile-info-card__location">
                <MapPin size={13} strokeWidth={2.2} />
                <span>{locationLabel}</span>
              </div>
            </div>

            <div className="profile-info-card__section">
              <h3 className="profile-info-card__label">About</h3>
              <p className="profile-info-card__text">{user.bio || "—"}</p>
            </div>

            {interests.length > 0 && (
              <div className="profile-info-card__section">
                <h3 className="profile-info-card__label">Interests</h3>
                <div className="profile-info-card__tags">
                  {interests.map((interest) => (
                    <span key={interest} className="profile-info-card__tag">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="profile-setting-card">
            <div className="profile-setting-card__left">
              <div className="profile-setting-card__icon-wrap">
                <MapPin size={14} strokeWidth={2.2} />
              </div>
              <div className="profile-setting-card__text-wrap">
                <p className="profile-setting-card__title">Share Location</p>
                <p className="profile-setting-card__subtitle">
                  Help others find matches near you
                </p>
              </div>
            </div>

            <button
              type="button"
              className={`profile-switch ${shareLocation ? "profile-switch--on" : ""}`}
              aria-label="Toggle location sharing"
              aria-pressed={shareLocation}
              onClick={handleToggleShareLocation}
            >
              <span className="profile-switch__thumb" />
            </button>
          </div>

          <button
            type="button"
            className="profile-page__primary-button"
            onClick={() => navigate("/edit-profile")}
          >
            Edit Profile
          </button>

          <button
            type="button"
            className="profile-page__secondary-button"
            onClick={handleLogout}
          >
            <LogOut size={16} strokeWidth={2.2} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;