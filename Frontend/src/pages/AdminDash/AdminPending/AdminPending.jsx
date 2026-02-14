import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar/Navbar";
import { API_BASE_URL } from "../../../config";
import "./AdminPending.css";
import AdminCard from "../../../components/AdminCard/AdminCard";

export default function AdminPending() {
  const [pendingApps, setPendingApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${API_BASE_URL}/users/author-applications/pending`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await res.json();
        setPendingApps(data.pending_applications || []);
      } catch (err) {
        console.error("Error fetching pending apps:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPending();
  }, []);

  if (loading) {
    return (
      <div className="admin-pending-page">
        <Navbar />
        <p>Loading pending applications...</p>
      </div>
    );
  }

  return (
    <div className="admin-pending-page">
      <Navbar />

      <div className="pending-container">
        <h1>Pending Author Applications</h1>

        <div className="pending-grid">
          {pendingApps.length === 0 ? (
            <p>No pending applications.</p>
          ) : (
            pendingApps.map((app) => (
              <AdminCard key={app.id} application={app} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
