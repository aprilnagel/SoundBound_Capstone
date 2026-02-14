import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar/Navbar";
import AdminCard from "../../../components/AdminCard/AdminCard";
import { API_BASE_URL } from "../../../config";
import "./AdminAppList.css";

export default function AdminAppList() {
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${API_BASE_URL}/users/author-applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setApplications(data.applications || []);
      } catch (err) {
        console.error("Error fetching applications:", err);
      }
    };

    fetchApps();
  }, []);

  return (
    <div className="admin-app-list-page">
      <Navbar />
        <div className="admin-all-apps-container">

            <h1 className="admin-app-list-title">All Author Applications</h1>

            <div className="applications-grid">
                {applications.map(app => (
                <AdminCard key={app.id} application={app} />
                ))}
            </div>
        </div>
    </div>
  );
}