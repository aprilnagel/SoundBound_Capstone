import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";
import { useContext } from "react";
import { AuthContext } from "../../contexts/Auth";

export default function Navbar() {
  const { user } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <NavLink to="/" className="navbar-brand">
          SOUNDBOUND
        </NavLink>
      </div>

      <div className="navbar-right">
        <NavLink to="/library">Library</NavLink>
        <NavLink to="/book-search">Search Books</NavLink>
        <NavLink to="/playlists">Playlists</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        {user?.role === "admin" && (
          <NavLink to="/admin/apps">Admin</NavLink>
        )}


        <div className="user-role">
          User Role: {user?.role || "Unknown"}
          {/* Display user role here */}
        </div>
      </div>
    </nav>
  );
}
