import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import "../assets/css/auth.css"

const Register = () => {

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [redirect, setRedirect] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()

    // Simulation
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    localStorage.setItem("token", "fake_token")
    setRedirect(true)
  }

  if (redirect || localStorage.getItem("token")) {
    return <Navigate to="/" />
  }

  return (
    <>

      <div className="auth-container">
        <div className="auth-wrapper">

          {/* LEFT */}
          <div className="auth-left">
            <h1>ID Immobilier</h1>
            <p>Créez votre compte pour accéder aux analyses</p>
          </div>

          {/* RIGHT */}
          <form onSubmit={handleSubmit} className="auth-card">

            <h2>Inscription</h2>

            <input
              type="text"
              className="form-control mb-3"
              placeholder="Nom"
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              className="form-control mb-3"
              placeholder="Email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              className="form-control mb-3"
              placeholder="Mot de passe"
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              className="form-control mb-3"
              placeholder="Confirmer le mot de passe"
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {error && <div className="alert alert-danger">{error}</div>}

            <button className="btn btn-primary w-100 fw-bold">
              S'inscrire
            </button>

            <div className="text-center mt-3">
              <a href="/login">Se connecter</a>
            </div>

          </form>

        </div>
      </div>
    </>
  )
}

export default Register