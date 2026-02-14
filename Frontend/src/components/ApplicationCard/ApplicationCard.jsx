import { useState, useEffect } from "react";
import "./ApplicationCard.css";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

export default function ApplicationCard({ app, mode = "user", onReview }) {
  const navigate = useNavigate();

  const [reviewerName, setReviewerName] = useState(null);

  useEffect(() => {
    async function fetchReviewer() {
      if (app.reviewed_by) {
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE_URL}/users/${app.reviewed_by}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            console.log("Reviewer data:", data);
            setReviewerName(data.username);
          }
        } catch (err) {
          console.error("Error fetching reviewer name:", err);
        }
      }
    }

    fetchReviewer();
  }, [app.reviewed_by]);

  return (
    <div className={`application-card ${mode === "user" ? "compact" : ""}`}>
      {/* STATUS BADGE */}
      <div className="application-header">
        <span className={`status-badge ${app.status}`}>
          {app.status.toUpperCase()}
        </span>
      </div>

      {/* MAIN BODY */}
      <div className="application-body">
        <p>
          <strong>App ID:</strong> {app.id}
        </p>
        <p>
          <strong>Submitted:</strong>{" "}
          {new Date(app.submitted_at).toLocaleDateString()}
        </p>
        <p>
          <strong>Reviewed by:</strong> {app.reviewed_by_username || "—"}
        </p>
          <p><strong>Closed:</strong>{" "}
          {app.reviewed_at
            ? new Date(app.reviewed_at).toLocaleDateString()
            : "—"}
        </p>

        {mode === "admin" && (
          <>
            <p>
              <strong>User:</strong> {app.user?.username}
            </p>
            <p>
              <strong>Bio:</strong> {app.author_bio?.slice(0, 60)}...
            </p>
          </>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="application-footer">
        {mode === "admin" && (
          <button
            className="review-button"
            onClick={() => navigate(`/admin/application-review?id=${app.id}`)}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
