import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/Auth";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Navbar from "../../components/Navbar/Navbar";
import "./UpdateProfile.css";

export default function UpdateProfile() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    author_bio: "",
    role: "",
  });

  const [loading, setLoading] = useState(true);
  const [errorPopup, setErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successPopup, setSuccessPopup] = useState(false);

  // Fetch current profile data
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setFormData({
            username: data.username || "",
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            password: "",
            author_bio: data.author_bio || "",
            role: data.role,
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [token]);

  // Handle input changes
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  // Submit updates
  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      username: formData.username,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
    };

    if (formData.password.trim() !== "") {
      payload.password = formData.password;
    }

    if (formData.role === "author") {
      payload.author_bio = formData.author_bio;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessPopup(true);
      } else {
        const errData = await response.json();
        setErrorMessage(errData.error || "Failed to update profile.");
        setErrorPopup(true);
      }
    } catch (err) {
      console.error("Update error:", err);
      setErrorMessage("Something went wrong.");
      setErrorPopup(true);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="update-profile-page">
      <Navbar />

      {/* SUCCESS POPUP */}
      {successPopup && (
        <div className="success-popup">
          <div className="success-box">
            <div className="success-icon">✓</div>
            <h2>Profile Updated!</h2>
            <p>Your changes have been saved successfully.</p>

            <button onClick={() => navigate("/profile")}>
              Back to Profile
            </button>
          </div>
        </div>
      )}

      {/* ERROR POPUP */}
      {errorPopup && (
        <div className="error-popup">
          <div className="error-box">
            <div className="error-icon">✕</div>
            <h2>Update Failed</h2>
            <p>{errorMessage}</p>

            <button onClick={() => setErrorPopup(false)}>
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="update-profile-card">
        <h1>Edit Profile</h1>

        <form onSubmit={handleSubmit} className="update-form">

          <label>Pen Name</label>
          <input
            name="username"
            value={formData.username}
            onChange={handleChange}
          />

          <label>First Name</label>
          <input
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
          />

          <label>Last Name</label>
          <input
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
          />

          <label>Email</label>
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
          />

          <label>New Password (optional)</label>
          <input
            name="password"
            type="password"
            placeholder="Leave blank to keep current password"
            value={formData.password}
            onChange={handleChange}
          />

          {formData.role === "author" && (
            <>
              <label>Author Bio</label>
              <textarea
                name="author_bio"
                value={formData.author_bio}
                onChange={handleChange}
              />
            </>
          )}

          <button type="submit" className="save-button">
            Save Changes
          </button>

          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}