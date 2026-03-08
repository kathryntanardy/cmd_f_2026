import { Routes, Route, Outlet } from 'react-router-dom'
import './App.css'
import NavBar from './components/NavBar/NavBar'
import Dashboard from './pages/Dashboard/Dashboard'
import UserProfilePage from './pages/Profile/UserProfilePage'
import EditProfilePage from "./pages/EditProfile/EditProfilePage"
import MatchMap from './pages/MatchMap/MatchMap'


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
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/edit-profile" element={<EditProfilePage />} />
        <Route path="/match" element={<MatchMap />} />
      </Route>
    </Routes>
  )
}

export default App
