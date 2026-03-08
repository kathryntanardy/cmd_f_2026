import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import "./App.css";

import NavBar from "./components/NavBar/NavBar";
import { useLocationTracking } from "./hooks/useLocationTracking";

import LoginPage from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import UserProfilePage from "./pages/Profile/UserProfilePage";
import MatchMap from "./pages/MatchMap/MatchMap";
import EditProfilePage from "./pages/EditProfile/EditProfilePage";

function AppLayout() {
  useLocationTracking();
  return (
    <>
      <Outlet />
      <NavBar />
    </>
  );
}

function App() {
  return (
    <Routes>

      {/* Login page FIRST */}
      <Route path="/login" element={<LoginPage />} />

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Main app pages */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/match" element={<MatchMap />} />
      </Route>

    </Routes>
  );
}

export default App;