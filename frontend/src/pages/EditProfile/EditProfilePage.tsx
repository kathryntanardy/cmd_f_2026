import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import { API_BASE, getToken, clearAuth } from "../../utils/auth";
import "./EditProfilePage.css";

type ProfileUser = {
    user_id?: number;
    username: string;
    email?: string;
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
    hideProfile?: boolean;
};

const EditProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<ProfileUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [username, setUsername] = useState("");
    const [age, setAge] = useState("");
    const [bio, setBio] = useState("");
    const [profilePhoto, setProfilePhoto] = useState("");
    const [lat, setLat] = useState("");
    const [lng, setLng] = useState("");
    const [ageMin, setAgeMin] = useState("");
    const [ageMax, setAgeMax] = useState("");
    const [maxDistanceMeters, setMaxDistanceMeters] = useState("");
    const [genderPreference, setGenderPreference] = useState("");
    const [hideProfile, setHideProfile] = useState(false);

    useEffect(() => {
        const token = getToken();
        if (!token) {
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
                const u = data as ProfileUser;
                setUser(u);
                setUsername(u.username ?? "");
                setAge(String(u.age ?? ""));
                setBio(u.bio ?? "");
                setProfilePhoto(u.profilePhoto ?? "");
                const coords = u.location?.coordinates;
                setLat(coords?.length === 2 ? String(coords[1]) : "");
                setLng(coords?.length === 2 ? String(coords[0]) : "");
                const prefs = u.preferences ?? {};
                setAgeMin(String(prefs.ageMin ?? ""));
                setAgeMax(String(prefs.ageMax ?? ""));
                setMaxDistanceMeters(String(prefs.maxDistanceMeters ?? ""));
                setGenderPreference((prefs.genderPreference ?? []).join(", "));
                setHideProfile(u.hideProfile ?? false);
            })
            .catch(() => {
                if (!cancelled) setError("Failed to load profile");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const handleSave = async () => {
        const token = getToken();
        if (!token) {
            navigate("/", { replace: true });
            return;
        }

        setSaving(true);
        setError("");

        const updates: Record<string, unknown> = {};

        if (username.trim()) updates.username = username.trim();
        const ageNum = parseInt(age, 10);
        if (!Number.isNaN(ageNum)) updates.age = ageNum;
        updates.bio = bio.trim();
        if (profilePhoto.trim()) updates.profilePhoto = profilePhoto.trim();

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
            updates.location = {
                type: "Point",
                coordinates: [lngNum, latNum],
            };
        }

        const ageMinNum = parseInt(ageMin, 10);
        const ageMaxNum = parseInt(ageMax, 10);
        const maxDistNum = parseInt(maxDistanceMeters, 10);
        const genders = genderPreference
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        const prefs = user?.preferences ?? {};

        updates.preferences = {
            genderPreference: genders.length > 0 ? genders : (prefs.genderPreference ?? []),
            ageMin: !Number.isNaN(ageMinNum) ? ageMinNum : (prefs.ageMin ?? 18),
            ageMax: !Number.isNaN(ageMaxNum) ? ageMaxNum : (prefs.ageMax ?? 100),
            maxDistanceMeters: !Number.isNaN(maxDistNum) ? maxDistNum : (prefs.maxDistanceMeters ?? 50),
        };

        updates.hideProfile = hideProfile;

        try {
            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Failed to update profile");
                setSaving(false);
                return;
            }

            navigate("/profile");
        } catch {
            setError("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="edit-profile-page">
                <div className="edit-profile-page__container">
                    <p className="edit-profile-page__loading">{error || "Loading…"}</p>
                </div>
            </div>
        );
    }

    const photo =
        profilePhoto ||
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80";

    return (
        <div className="edit-profile-page">
            <div className="edit-profile-page__container">
                <div className="edit-profile-page__header">
                    <button
                        type="button"
                        className="edit-profile-page__icon-button"
                        onClick={() => navigate("/profile")}
                        aria-label="Go back"
                    >
                        <ArrowLeft size={18} strokeWidth={2.2} />
                    </button>

                    <h1 className="edit-profile-page__title">Edit Profile</h1>

                    <div className="edit-profile-page__header-spacer" />
                </div>

                <div className="edit-profile-page__content">
                    <div className="edit-profile-photo-card">
                        <img
                            src={photo}
                            alt={username}
                            className="edit-profile-photo-card__image"
                        />

                        <button
                            type="button"
                            className="edit-profile-photo-card__camera-button"
                            aria-label="Change profile photo"
                            onClick={() => {
                                const url = prompt("Enter profile photo URL:", profilePhoto);
                                if (url != null) setProfilePhoto(url);
                            }}
                        >
                            <Camera size={18} strokeWidth={2.2} />
                        </button>
                    </div>

                    <div className="edit-profile-form-card">
                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="username">
                                Username
                            </label>
                            <input
                                id="username"
                                className="edit-profile-field__input"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="age">
                                Age
                            </label>
                            <input
                                id="age"
                                className="edit-profile-field__input"
                                type="number"
                                min={18}
                                max={120}
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="bio">
                                About
                            </label>
                            <textarea
                                id="bio"
                                className="edit-profile-field__textarea"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="profilePhoto">
                                Profile Photo URL
                            </label>
                            <input
                                id="profilePhoto"
                                className="edit-profile-field__input"
                                type="url"
                                placeholder="https://..."
                                value={profilePhoto}
                                onChange={(e) => setProfilePhoto(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label">
                                <MapPin size={14} strokeWidth={2.2} style={{ verticalAlign: "middle", marginRight: 6 }} />
                                Location
                            </label>
                            <div className="edit-profile-field__location-row">
                                <input
                                    className="edit-profile-field__input"
                                    type="text"
                                    placeholder="Latitude"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                />
                                <input
                                    className="edit-profile-field__input"
                                    type="text"
                                    placeholder="Longitude"
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                />
                            </div>
                            <p className="edit-profile-field__hint">Latitude and longitude (e.g. 49.25, -123.1)</p>
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="ageMin">
                                Age Min
                            </label>
                            <input
                                id="ageMin"
                                className="edit-profile-field__input"
                                type="number"
                                min={18}
                                value={ageMin}
                                onChange={(e) => setAgeMin(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="ageMax">
                                Age Max
                            </label>
                            <input
                                id="ageMax"
                                className="edit-profile-field__input"
                                type="number"
                                min={18}
                                value={ageMax}
                                onChange={(e) => setAgeMax(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="maxDistance">
                                Max Distance (meters)
                            </label>
                            <input
                                id="maxDistance"
                                className="edit-profile-field__input"
                                type="number"
                                min={0}
                                value={maxDistanceMeters}
                                onChange={(e) => setMaxDistanceMeters(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="genderPreference">
                                Interests
                            </label>
                            <textarea
                                id="genderPreference"
                                className="edit-profile-field__textarea"
                                value={genderPreference}
                                onChange={(e) => setGenderPreference(e.target.value)}
                                rows={2}
                                placeholder="male, female, non-binary"
                            />
                            <p className="edit-profile-field__hint">Separate with commas</p>
                        </div>

                        <div className="edit-profile-field edit-profile-field--row">
                            <label className="edit-profile-field__label" htmlFor="hideProfile">
                                Hide profile from others
                            </label>
                            <button
                                type="button"
                                className={`edit-profile-switch ${hideProfile ? "edit-profile-switch--on" : ""}`}
                                aria-label="Toggle hide profile"
                                aria-pressed={hideProfile}
                                onClick={() => setHideProfile(!hideProfile)}
                            >
                                <span className="edit-profile-switch__thumb" />
                            </button>
                        </div>
                    </div>

                    {error && <p className="edit-profile-page__error">{error}</p>}

                    <div className="edit-profile-page__actions">
                        <button
                            type="button"
                            className="edit-profile-page__secondary-button"
                            onClick={() => navigate("/profile")}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="edit-profile-page__primary-button"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfilePage;
