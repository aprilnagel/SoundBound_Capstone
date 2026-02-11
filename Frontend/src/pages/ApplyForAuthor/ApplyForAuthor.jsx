import { useState } from "react";
import { useAuth } from "../../contexts/Auth";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import Navbar from "../../components/Navbar/Navbar";
import "./ApplyForAuthor.css";

export default function ApplyForAuthor() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [authorBio, setAuthorBio] = useState("");
  const [proofLinks, setProofLinks] = useState([""]);
  const [authorKeys, setAuthorKeys] = useState([""]);
  const [notes, setNotes] = useState("");

  const [successPopup, setSuccessPopup] = useState(false);
  const [errorPopup, setErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Handle proof links
  function handleProofLinkChange(index, value) {
    const updated = [...proofLinks];
    updated[index] = value;
    setProofLinks(updated);
  }

  function addProofLink() {
    setProofLinks([...proofLinks, ""]);
  }

  // Handle author keys
  function handleAuthorKeyChange(index, value) {
    const updated = [...authorKeys];
    updated[index] = value;
    setAuthorKeys(updated);
  }

  function addAuthorKey() {
    setAuthorKeys([...authorKeys, ""]);
  }

  // Submit application
  async function handleSubmit(e) {
    e.preventDefault();

    // VALIDATION — all required except notes
    if (authorBio.trim().length < 10) {
      setErrorMessage("Author bio must be at least 10 characters.");
      setErrorPopup(true);
      return;
    }

    const cleanedProofLinks = proofLinks.filter(link => link.trim() !== "");
    if (cleanedProofLinks.length === 0) {
      setErrorMessage("At least one proof link is required.");
      setErrorPopup(true);
      return;
    }

    const cleanedAuthorKeys = authorKeys.filter(key => key.trim() !== "");
    if (cleanedAuthorKeys.length === 0) {
      setErrorMessage("At least one author key is required.");
      setErrorPopup(true);
      return;
    }

    const payload = {
      author_bio: authorBio,
      proof_links: cleanedProofLinks,
      author_keys: cleanedAuthorKeys,
      notes: notes.trim() || null,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/users/apply-author`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccessPopup(true);
        return;
      }

      // --- FIXED ERROR HANDLING ---
      let errData = {};

      try {
        errData = await response.json();
      } catch {
        errData = { message: "Unknown server error." };
      }

      // Marshmallow validation errors (field: [error])
      if (typeof errData === "object" && !errData.message) {
        const firstKey = Object.keys(errData)[0];
        const firstError = errData[firstKey][0];
        setErrorMessage(`${firstKey}: ${firstError}`);
      } else {
        setErrorMessage(errData.message || "Failed to submit application.");
      }

      setErrorPopup(true);

    } catch (err) {
      console.error("Application error:", err);
      setErrorMessage("Something went wrong.");
      setErrorPopup(true);
    }
  }

  return (
    <div className="apply-author-page">
      <Navbar />

      {/* SUCCESS POPUP */}
      {successPopup && (
        <div className="success-popup">
          <div className="success-box">
            <div className="success-icon">✓</div>
            <h2>Application Submitted!</h2>
            <p>Your author verification request is now pending.</p>

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
            <h2>Submission Failed</h2>
            <p>{errorMessage}</p>

            <button onClick={() => setErrorPopup(false)}>
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="apply-author-card">
        <h1>Apply to Become an Author</h1>

        <form onSubmit={handleSubmit} className="apply-author-form">

          {/* BIO */}
          <label>Author Bio (required)</label>
          <textarea
            value={authorBio}
            onChange={(e) => setAuthorBio(e.target.value)}
            placeholder="Tell us about your writing background..."
          />

          {/* PROOF LINKS */}
          <label>Proof Links (required)</label>
          {proofLinks.map((link, index) => (
            <input
              key={index}
              value={link}
              onChange={(e) => handleProofLinkChange(index, e.target.value)}
              placeholder="https://example.com"
            />
          ))}

          <button
            type="button"
            className="add-link-button"
            onClick={addProofLink}
          >
            + Add Another Link
          </button>

          {/* AUTHOR KEYS */}
          <label>Author Keys (required)</label>
          {authorKeys.map((key, index) => (
            <input
              key={index}
              value={key}
              onChange={(e) => handleAuthorKeyChange(index, e.target.value)}
              placeholder="OL12345A"
            />
          ))}

          <button
            type="button"
            className="add-link-button"
            onClick={addAuthorKey}
          >
            + Add Another Author Key
          </button>

          {/* NOTES */}
          <label>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else you'd like us to know?"
          />

          {/* SUBMIT */}
          <button type="submit" className="submit-author-button">
            Submit Application
          </button>

          {/* CANCEL */}
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