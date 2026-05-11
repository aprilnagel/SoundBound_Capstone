import Navbar from "../../components/Navbar/Navbar";
import "./Profile.css";
import { useAuth } from "../../contexts/Auth";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

export default function Profile() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    }

    async function fetchApplications() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setApplications(data.applications || []);
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      }
    }

    if (token) {
      fetchProfileData();
      fetchApplications();
    }
  }, [token]);

  const hasPending = applications.some((app) => app.status === "pending");
  const hasHistory = applications.length > 0;

  // 🔥 NEW: Delete handler no longer uses window.confirm()
  const handleDeleteAccount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setProfileData(null);
        logout();
        navigate("/signup");
      } else {
        console.error("Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-card">
        <h1 className="profile-title">Account</h1>
        <div className="library-title-underline"></div>

        {profileData ? (
          <div className="profile-grid">
            {/* LEFT COLUMN */}
            <div className="profile-left">
              <span className="pro-label">Pen Name:</span>
              <span className="value">{profileData.username}</span>

              <span className="pro-label">First Name:</span>
              <span className="value">{profileData.first_name}</span>

              <span className="pro-label">Last Name:</span>
              <span className="value">{profileData.last_name}</span>

              <span className="pro-label">Email:</span>
              <span className="value">{profileData.email}</span>

              <span className="pro-label">Role:</span>
              <span className="value">{profileData.role}</span>

              {profileData.role === "author" && (
                <>
                  <span className="pro-label">Author Keys:</span>
                  <span className="value">
                    {Array.isArray(profileData.author_keys)
                      ? profileData.author_keys.join(", ")
                      : profileData.author_keys}
                  </span>

                  <span className="pro-label">Author Bio:</span>
                  <span className="value">{profileData.author_bio}</span>
                </>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="profile-right">
              {profileData.role === "reader" && (
                <>
                  {hasPending ? (
                    <button
                      style={{
                        background: "#ffa18f",
                        width: "100%",
                        fontSize: "20px",
                        color: "white",
                        fontFamily: "Manjari, system-ui",
                      }}
                      onClick={() => navigate("/application-status")}
                      className="apply-author-button"
                    >
                      Check Application Status
                    </button>
                  ) : (
                    <button
                      style={{ width: "100%" }}
                      onClick={() => navigate("/apply-for-author")}
                      className="apply-author-button"
                    >
                      Apply for Author
                    </button>
                  )}

                  {hasHistory && (
                    <button
                      style={{
                        background: "#ffa18f",
                        width: "100%",
                        color: "white",
                        fontFamily: "Manjari, system-ui",
                      }}
                      onClick={() => navigate("/application-history")}
                      className="history-button"
                    >
                      View Application History
                    </button>
                  )}
                </>
              )}

              {profileData.role === "author" && (
                <Link
                  style={{ background: "#ffa18f" }}
                  to="/application-history"
                  className="my-apps"
                >
                  My Applications
                </Link>
              )}

              <button className="spotify-btn">Sync to Spotify</button>
            </div>
          </div>
        ) : (
          <p>Loading profile data...</p>
        )}

        {/* ACTION BUTTONS */}
        <div className="profile-actions">
          <button
            onClick={() => navigate("/profile/edit")}
            className="edit-profile-button"
          >
            Edit Profile
          </button>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="logout-button"
          >
            Logout
          </button>

          {/* 🔥 DELETE BUTTON OPENS POPUP */}
          <button
            onClick={() => setShowDeletePopup(true)}
            className="delete-account-button"
          >
            Delete Account
          </button>

          {/* 🔥 POPUP (kept inside profile-actions, but fixed-position overlay) */}
          {showDeletePopup && (
            <div className="delete-popup">
              <div className="delete-box">
                <div className="delete-icon">⚠️</div>
                <h2>Delete Account?</h2>
                <p>This action cannot be undone.</p>

                <div className="delete-buttons">
                  <button
                    className="delete-cancel"
                    onClick={() => setShowDeletePopup(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="delete-confirm"
                    onClick={handleDeleteAccount}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
