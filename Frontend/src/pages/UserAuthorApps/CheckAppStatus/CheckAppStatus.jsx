import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import { API_BASE_URL } from "../../../config";
import "./CheckAppStatus.css";

export default function CheckAppStatus() {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE_URL}/users/me/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 404) {
          setError("You have not submitted any author applications.");
          setLoading(false);
          return;
        }

        const data = await res.json();

        // Use the most recent application
        const latest = data.applications[data.applications.length - 1];
        setApplication(latest);
      } catch (err) {
        console.error("Error fetching application status:", err);
        setError("Unable to load your application status.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="author-status-page">
        <Navbar />
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="author-status-page">
        <Navbar />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="author-status-page">
      <Navbar />

      <div className="author-status-card">
        <h1>Pending Author Application</h1>

        <div className="app-details">
          
          <div className="status-row">
            <span className={`status-badge ${application.status}`}>
              {application.status.toUpperCase()}
            </span>
          </div>
          <p className="app-id">
            <strong>Application ID:</strong> #{application.id}
          </p>

          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(application.submitted_at).toLocaleDateString()}
          </p>

          {application.notes && (
            <p>
              <strong>Notes:</strong> {application.notes}
            </p>
          )}

          {application.status === "rejected" && (
            <p className="reapply-note">
              Your application was not approved. You may reapply at any time.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
