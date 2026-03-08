import React from "react";
import { NavLink } from "react-router-dom";
import { Heart, User, MapPinned } from "lucide-react";
import "./NavBar.css";

const navItems = [
    { label: "Discover", path: "/dashboard", icon: <Heart size={34} strokeWidth={2.2} /> },
    { label: "Profile", path: "/profile", icon: <User size={34} strokeWidth={2.2} /> },
    { label: "Your Match", path: "/match", icon: <MapPinned size={34} strokeWidth={2.2} /> },
] as const;

const NavBar: React.FC = () => {
    return (
        <nav className="navbar">
            <div className="navbar__items">
                {navItems.map(({ label, path, icon }) => (
                    <NavLink
                        key={label}
                        to={path}
                        className={({ isActive }) =>
                            `navbar__item ${isActive ? "active" : ""}`
                        }
                        end={path === "/dashboard"}
                    >
                        <span className="navbar__icon">{icon}</span>
                        <span className="navbar__label">{label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default NavBar;