import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/Auth";
import { API_BASE_URL } from "../../config";
import Navbar from "../../components/Navbar/Navbar";
import ApplicationCard from "../../components/Application Card/ApplicationCard";
import { useNavigate } from "react-router-dom";
import "./ApplicationHistory.css";

export default function ApplicationHistory() {
  const { token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchApps() {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setApplications(data.applications || []);
        } else {
          // 404 means no applications
          setApplications([]);
        }
      } catch (err) {
        console.error("Error fetching applications:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchApps();
  }, [token]);

  return (
    <div className="application-history-page">
      <Navbar />

      <div className="application-history-card">
        <h1 className="application-history-title">My Author Applications</h1>
        <div className="application-history-back-button">
          <button onClick={() => navigate("/profile")} className="back-button">
            Back to Profile
          </button>
        </div>

        {loading ? (
          <p className="loading">Loading your applications...</p>
        ) : applications.length === 0 ? (
          <p className="empty-state">
            You haven’t submitted any author applications yet.
          </p>
        ) : (
          <div className="applications-grid">
            {applications.map((app) => (
              <ApplicationCard key={app.id} app={app} mode="user" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
