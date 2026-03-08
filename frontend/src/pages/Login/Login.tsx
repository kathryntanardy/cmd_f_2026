import React from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const LoginPage: React.FC = () => {

    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // For demo purposes, we'll just navigate to the dashboard
        navigate("/dashboard");
    }

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
        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="sign-in-btn">
            Sign In
          </button>
        </form>

        <p className="signup-text">
          Don't have an account? <a href="/signup">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;