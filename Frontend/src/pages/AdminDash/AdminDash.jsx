import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/Auth";
import { API_BASE_URL } from "../../config";
import "./AdminDash.css";

export default function AdminDash() {
  const { user } = useContext(AuthContext);

  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch ALL applications
        const allRes = await fetch(`${API_BASE_URL}/users/author-applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allData = await allRes.json();
        setTotalCount(allData.applications?.length || 0);

        // Fetch PENDING applications
        const pendingRes = await fetch(
          `${API_BASE_URL}/users/author-applications/pending`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const pendingData = await pendingRes.json();
        setPendingCount(pendingData.pending_applications?.length || 0);
      } catch (err) {
        console.error("Error fetching admin counts:", err);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="admin-dash-page">
      <Navbar />

      <div className="admin-dash-container">
        <h1 className="admin-dash-title">
          Welcome, {user?.name || "Admin"}!
        </h1>

        <p className="admin-dash-subtitle">
          Manage author applications and oversee the platform's content.
        </p>

        <div className="admin-dash-cards">
          <Link to="/admin/apps/all" className="admin-dash-card">
            <h2>All Applications</h2>
            <p>{totalCount} total</p> 
            
          </Link>

          <Link to="/admin/apps/pending" className="admin-dash-card">
            <h2>Pending</h2>
            <p>{pendingCount} awaiting review</p>
          </Link>
        </div>
      </div>
    </div>
  );
}