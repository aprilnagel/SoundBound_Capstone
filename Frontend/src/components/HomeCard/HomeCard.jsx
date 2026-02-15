import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomeCard.css";

export default function HomeCard({ title, description, image, buttonText, onClick }) {
  const navigate = useNavigate();

  return (
    <div className="home-card" onClick={onClick}>
      {image && <img src={image} alt={title} className="home-card-image" />}

      <div className="home-card-content">
        <h2 className="home-card-title">{title}</h2>
        {description && <p className="home-card-description">{description}</p>}

        {buttonText && (
          <button className="home-card-button">
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}