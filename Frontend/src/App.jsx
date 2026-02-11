import { Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup/Signup";
import Login from "./pages/Login/Login";
import './App.css'
import Me from "./pages/Me/Me";
import Home from "./pages/Home/Home";
import Profile from "./pages/Profile/Profile";
import UpdateProfile from "./pages/Update Profile/UpdateProfile";

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/me" element={<Me />} />
        <Route path="/" element={<Home />} />
        <Route path="/users/me" element={<Profile />} />
        <Route path="/profile/edit" element={<UpdateProfile />} />
      </Routes>
    </>
  )
}

export default App
