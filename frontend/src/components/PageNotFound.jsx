import React from "react";
import { Link, useNavigate } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContactSupportIcon from "@mui/icons-material/ContactSupport";
import ErrorIcon from '@mui/icons-material/Error';

const PageNotFound = () => {

  const navigate = useNavigate();

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">

      <div className="text-center">

        {/* Icône principale */}
        <div className="mb-4">
          <ErrorIcon style={{ fontSize: 80, color: "#4F46E5" }} />
        </div>

        {/* Code erreur */}
        <h1 className="display-1 fw-bold text-dark">404</h1>

        {/* Message */}
        <h3 className="fw-bold mb-3">Page introuvable</h3>
        <p className="text-muted mb-4 px-3">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        {/* Boutons */}
        <div className="d-flex justify-content-center gap-3 flex-wrap mb-4">

          <Link 
            to="/" 
            className="btn fw-bold text-white px-4"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <HomeIcon className="me-2" />
            Accueil
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-secondary fw-bold px-4"
          >
            <ArrowBackIcon className="me-2" />
            Retour
          </button>

        </div>

        {/* Séparateur */}
        <hr className="w-50 mx-auto my-4" />

        {/* Support */}
        <p className="small text-muted d-flex justify-content-center align-items-center">
          <ContactSupportIcon className="me-2" style={{ fontSize: 18 }} />
          Si vous pensez qu’il s’agit d’une erreur, veuillez contacter le support.
        </p>

      </div>

    </div>
  );
};

export default PageNotFound;