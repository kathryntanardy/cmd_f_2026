import { Routes, Route, Outlet } from 'react-router-dom'
import './App.css'
import NavBar from './components/NavBar/NavBar'
import Dashboard from './pages/Dashboard/Dashboard'
import UserProfilePage from './pages/Profile/UserProfilePage'
import EditProfilePage from "./pages/EditProfile/EditProfilePage";
import Login from "./pages/Login/Login";


function AppLayout() {
  return (
    <>
      <Outlet />
      <NavBar />
    </>
  )
}

function App() {
  return (
    <Routes>

    <Route path="/" element={<Login />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        {/* <Route path="/match" element={<Match />} /> */}
      </Route>
    </Routes>
  )
}

export default App
