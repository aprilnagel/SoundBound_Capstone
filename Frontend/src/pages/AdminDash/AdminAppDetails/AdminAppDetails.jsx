import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import { API_BASE_URL } from "../../../config";
import "./AdminAppDetails.css";

export default function AdminAppDetails() {
  const { id } = useParams(); // application_id from URL
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${API_BASE_URL}/users/author-applications/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await res.json();
        setApplication(data);
      } catch (err) {
        console.error("Error fetching application:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/users/${application.user_id}/approve-author`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setPopupMessage("Application Approved!");
        setShowPopup(true);
      }
    } catch (err) {
      console.error("Error approving:", err);
    }
  };

  const handleReject = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/users/${application.user_id}/reject-author`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        setPopupMessage("Application Rejected.");
        setShowPopup(true);
      }
    } catch (err) {
      console.error("Error rejecting:", err);
    }
  };

  // -------------------------------
  // SAFE RENDERING
  // -------------------------------
  if (loading) {
    return (
      <div className="admin-app-details-page">
        <Navbar />
        <p>Loading...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="admin-app-details-page">
        <Navbar />
        <p>Application not found.</p>
      </div>
    );
  }

  // -------------------------------
  // MAIN RENDER
  // -------------------------------
  return (
    <div className="admin-app-details-page">
      <Navbar />

      <div className="admin-app-details-card">
        <div className="details-header">
          <span className={`status-badge ${application.status}`}>
            {application.status.toUpperCase()}
          </span>
        </div>

        <h1>Application #{application.application_id}</h1>

        <div className="details-section">
          <p>
            <strong>Name:</strong> {application.full_name}
          </p>
          <p>
            <strong>Username:</strong> {application.username}
          </p>
          <p>
            <strong>Email:</strong> {application.email}
          </p>
          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(application.submitted_at).toLocaleDateString()}
          </p>
        </div>

        <div className="details-section">
          <h3>Author Bio</h3>
          <p>{application.author_bio}</p>
        </div>

        <div className="details-section">
          <h3>Author Keys</h3>
          <p>{application.author_keys || "None provided"}</p>
        </div>

        <div className="details-section">
          <h3>Proof Links</h3>

          {Array.isArray(application.proof_links) ? (
            <ul>
              {application.proof_links.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.trim()}
                  </a>
                </li>
              ))}
            </ul>
          ) : application.proof_links ? (
            <ul>
              {application.proof_links.split(",").map((link, index) => (
                <li key={index}>
                  <a
                    href={link.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.trim()}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No proof links provided.</p>
          )}
        </div>

        <div className="details-actions">
          <button className="approve-btn" onClick={handleApprove}>
            Approve
          </button>

          <button className="reject-btn" onClick={handleReject}>
            Reject
          </button>
        </div>
      </div>

      {/* ------------------------------- */}
      {/* POPUP RENDER */}
      {/* ------------------------------- */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-card">
            {/* ICON */}
            <div
              className={`popup-icon ${
                popupMessage.includes("Approved") ? "approved" : "rejected"
              }`}
            >
              {popupMessage.includes("Approved") ? "✓" : "✕"}
            </div>

            {/* TITLE */}
            <h2>{popupMessage}</h2>

            {/* BUTTON */}
            <button onClick={() => navigate("/admin/apps/pending")}>
              Back to Pending Apps
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
