import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import "./EditProfilePage.css";

const mockCurrentUser = {
    name: "Alex",
    age: 28,
    city: "San Francisco",
    bio: "Love hiking, coffee, and good conversations.",
    lookingFor: "A meaningful connection",
    interests: ["hiking", "coffee", "music", "travel"],
    photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
};

const EditProfilePage: React.FC = () => {
    const navigate = useNavigate();

    const [name, setName] = useState(mockCurrentUser.name);
    const [age, setAge] = useState(String(mockCurrentUser.age));
    const [city, setCity] = useState(mockCurrentUser.city);
    const [bio, setBio] = useState(mockCurrentUser.bio);
    const [lookingFor, setLookingFor] = useState(mockCurrentUser.lookingFor);
    const [interests, setInterests] = useState(mockCurrentUser.interests.join(", "));

    const handleSave = () => {
        console.log({
            name,
            age,
            city,
            bio,
            lookingFor,
            interests: interests
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
        });

        navigate("/profile");
    };

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
                            src={mockCurrentUser.photo}
                            alt={name}
                            className="edit-profile-photo-card__image"
                        />

                        <button
                            type="button"
                            className="edit-profile-photo-card__camera-button"
                            aria-label="Change profile photo"
                        >
                            <Camera size={18} strokeWidth={2.2} />
                        </button>
                    </div>

                    <div className="edit-profile-form-card">
                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="name">
                                Name
                            </label>
                            <input
                                id="name"
                                className="edit-profile-field__input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
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
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="city">
                                City
                            </label>

                            <div className="edit-profile-field__input-wrap">
                                <MapPin size={15} strokeWidth={2.2} className="edit-profile-field__icon" />
                                <input
                                    id="city"
                                    className="edit-profile-field__input edit-profile-field__input--with-icon"
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                            </div>
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
                            <label className="edit-profile-field__label" htmlFor="lookingFor">
                                Looking For
                            </label>
                            <input
                                id="lookingFor"
                                className="edit-profile-field__input"
                                type="text"
                                value={lookingFor}
                                onChange={(e) => setLookingFor(e.target.value)}
                            />
                        </div>

                        <div className="edit-profile-field">
                            <label className="edit-profile-field__label" htmlFor="interests">
                                Interests
                            </label>
                            <textarea
                                id="interests"
                                className="edit-profile-field__textarea"
                                value={interests}
                                onChange={(e) => setInterests(e.target.value)}
                                rows={3}
                                placeholder="hiking, coffee, music, travel"
                            />
                            <p className="edit-profile-field__hint">Separate interests with commas</p>
                        </div>
                    </div>

                    <div className="edit-profile-page__actions">
                        <button
                            type="button"
                            className="edit-profile-page__secondary-button"
                            onClick={() => navigate("/profile")}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="edit-profile-page__primary-button"
                            onClick={handleSave}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfilePage;