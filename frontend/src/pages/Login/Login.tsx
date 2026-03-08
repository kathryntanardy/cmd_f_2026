import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { setAuth, getToken, API_BASE } from "../../utils/auth";
import "./Login.css";

type LoginResponse = {
  message?: string;
  token?: string;
  user?: {
    id: string;
    user_id?: number;
    username: string;
    email: string;
    age?: number;
    bio?: string;
    profilePhoto?: string;
    location?: {
      type: "Point";
      coordinates: [number, number];
    };
    preferences?: {
      genderPreference: string[];
      ageMin: number;
      ageMax: number;
      maxDistanceMeters: number;
    };
    matchLock?: {
      isLocked: boolean;
      lockedUntil: string | null;
    };
  };
  error?: string;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingUser = localStorage.getItem("user");
    const token = getToken();

    if (existingUser && token) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (existingUser && !token) {
      localStorage.removeItem("user");
    }
  }, [navigate]);

  const updateUserLocation = async (token: string) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser");
      return;
    }

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          console.log("📍 Browser detected location:");
          console.log("Latitude:", latitude);
          console.log("Longitude:", longitude);

          try {
            const res = await fetch(`${API_BASE}/api/users/me/location`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                latitude,
                longitude,
              }),
            });

            const data = await res.json();

            console.log("📡 Backend location response:", data);
          } catch (err) {
            console.error("Failed to update location:", err);
          }

          resolve();
        },
        (geoError) => {
          console.error("Geolocation error:", geoError);
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const rawText = await response.text();
      console.log("Login status:", response.status);
      console.log("Raw server response:", rawText);

      let data: LoginResponse = {};

      try {
        data = JSON.parse(rawText) as LoginResponse;
      } catch {
        setError(`Server returned non-JSON:\n${rawText || "[empty response]"}`);
        return;
      }

      if (!response.ok) {
        setError(data.message || data.error || "Login failed");
        return;
      }

      if (!data.user) {
        setError("No user returned from server");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.token) {
        setAuth(data.token, {
          user_id: data.user.user_id ?? 0,
          username: data.user.username,
          email: data.user.email,
        });

        console.log("🔐 Auth token saved");

        await updateUserLocation(data.token);
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="icon-circle">
          <span className="heart-icon">♡</span>
        </div>

        <h1>Welcome Back</h1>
        <p>Sign in to continue your journey</p>
      </div>

      <div className="login-card">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p
              className="login-error"
              style={{ color: "red", whiteSpace: "pre-wrap" }}
            >
              {error}
            </p>
          )}

          <button type="submit" className="sign-in-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="signup-text">
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;