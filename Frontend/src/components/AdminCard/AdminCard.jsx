import { Link } from "react-router-dom";
import "./AdminCard.css";

export default function AdminCard({ application }) {
  return (
    <div className="admin-card">
      <div className="admin-card-status">
        <span className={`status-badge ${application.status}`}>
          {application.status.toUpperCase()}
        </span>
      </div>

      <div className="admin-card-body">
        <p><strong>App ID:</strong> {application.application_id}</p>
        <p><strong>User:</strong> {application.username}</p>
        <p><strong>Name:</strong> {application.first_name} {application.last_name}</p>
        <p><strong>Submitted:</strong> {new Date(application.submitted_at).toLocaleDateString()}</p>

        {application.author_bio && (
          <p className="admin-card-bio">
            {application.author_bio.length > 80
              ? application.author_bio.slice(0, 80) + "..."
              : application.author_bio}
          </p>
        )}
      </div>

      <div className="admin-card-footer">
        <Link
          to={`/admin/apps/${application.application_id}`}
          className="admin-card-button"
        >
          Review App
        </Link>
      </div>
    </div>
  );
}
