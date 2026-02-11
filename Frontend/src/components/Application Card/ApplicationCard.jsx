import "./ApplicationCard.css";
import { useNavigate } from "react-router-dom";

export default function ApplicationCard({ app, mode = "user", onReview }) {
  const navigate = useNavigate();

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
        <p><strong>App ID:</strong> {app.id}</p>
        <p><strong>Submitted:</strong> {new Date(app.submitted_at).toLocaleDateString()}</p>

        {mode === "admin" && (
          <>
            <p><strong>User:</strong> {app.user?.username}</p>
            <p><strong>Bio:</strong> {app.author_bio?.slice(0, 60)}...</p>
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