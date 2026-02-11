import Navbar from "../../components/Navbar/Navbar";
import "./Profile.css";
import { useAuth } from "../../contexts/Auth";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

export default function Profile() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    }

    if (token) {
      fetchProfileData();
    }
  }, [token]);

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-card">
        <h1 className="profile-title">Account</h1>

        {profileData ? (
          <div className="profile-grid">
            {/* LEFT COLUMN */}
            <div className="profile-left">
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">Pen Name:</span>
                  <span className="value">{profileData.username}</span>
                </div>

                <div className="info-row">
                  <span className="label">First Name:</span>
                  <span className="value">{profileData.first_name}</span>
                </div>

                <div className="info-row">
                  <span className="label">Last Name:</span>
                  <span className="value">{profileData.last_name}</span>
                </div>

                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{profileData.email}</span>
                </div>

                <div className="info-row">
                  <span className="label">Character:</span>
                  <span className="value">{profileData.role}</span>
                </div>

                {profileData.role === "author" && (
                  <>
                    <div className="info-row">
                      <span className="label">Author Key:</span>
                      <span className="value">{profileData.author_key}</span>
                    </div>

                    <div className="info-row">
                      <span className="label">Author Bio:</span>
                      <span className="value">{profileData.author_bio}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — always exists */}
            <div className="profile-right">
              {profileData.role !== "author" && (
                <Link to="/apply-author" className="apply-author-button">
                  Apply for Author!
                </Link>
              )}
              <button className="spotify">Coming soon! Sync to Spotify</button>
            </div>
          </div>
        ) : (
          <p>Loading profile data...</p>
        )}

        <div className="profile-actions">
          <button onClick={() => navigate("/profile/edit")} className="edit-profile-button">
            Edit Profile
          </button>

          <button
            onClick={() => {
              logout();
              navigate("/auth/login");
            }}
            className="logout-button"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
