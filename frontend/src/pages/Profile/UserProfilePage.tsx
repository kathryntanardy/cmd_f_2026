import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Camera, MapPin, LogOut } from "lucide-react";
import "./UserProfilePage.css";

const mockCurrentUser = {
    name: "Alex",
    age: 28,
    city: "San Francisco",
    bio: "Love hiking, coffee, and good conversations.",
    lookingFor: "A meaningful connection",
    interests: ["hiking", "coffee", "music", "travel"],
    shareLocation: true,
    photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
};

const UserProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [shareLocation, setShareLocation] = useState(mockCurrentUser.shareLocation);

    const handleLogout = () => {
        const confirmed = window.confirm("Are you sure you want to log out?");
        if (confirmed) {
            navigate("/");
        }
    };

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
                            src={mockCurrentUser.photo}
                            alt={mockCurrentUser.name}
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
                                {mockCurrentUser.name}, {mockCurrentUser.age}
                            </h2>

                            <div className="profile-info-card__location">
                                <MapPin size={13} strokeWidth={2.2} />
                                <span>{mockCurrentUser.city}</span>
                            </div>
                        </div>

                        <div className="profile-info-card__section">
                            <h3 className="profile-info-card__label">About</h3>
                            <p className="profile-info-card__text">{mockCurrentUser.bio}</p>
                        </div>

                        <div className="profile-info-card__section">
                            <h3 className="profile-info-card__label">Looking For</h3>
                            <p className="profile-info-card__text">{mockCurrentUser.lookingFor}</p>
                        </div>

                        <div className="profile-info-card__section">
                            <h3 className="profile-info-card__label">Interests</h3>

                            <div className="profile-info-card__tags">
                                {mockCurrentUser.interests.map((interest) => (
                                    <span key={interest} className="profile-info-card__tag">
                                        {interest}
                                    </span>
                                ))}
                            </div>
                        </div>
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
        </div >
    );
};

export default UserProfilePage;