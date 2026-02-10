import { Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup/Signup";
import Login from "./pages/Login/Login";
import './App.css'

function App() {
 

  return (
    <>
      <Routes>
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/login" element={<Login />} />
        {/* Add more routes here */}
      </Routes>
    </>
  )
}

export default App
