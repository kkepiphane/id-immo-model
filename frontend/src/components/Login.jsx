import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import "../assets/css/auth.css"

const Login = () => {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [redirect, setRedirect] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()

    // Simulation login (remplaçable par API plus tard)
    if (email === "admin@test.com" && password === "1234") {
      localStorage.setItem("token", "fake_token")
      setRedirect(true)
    } else {
      setError("Email ou mot de passe incorrect")
    }
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
            <p>Analyse intelligente du marché immobilier</p>
          </div>

          {/* RIGHT */}
          <form onSubmit={handleSubmit} className="auth-card">

            <h2>Connexion</h2>

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

            {error && <div className="alert alert-danger">{error}</div>}

            <button className="btn btn-primary w-100 fw-bold">
              Se connecter
            </button>

            <div className="text-center mt-3">
              <a href="/register">Créer un compte</a>
            </div>

          </form>

        </div>
      </div>
    </>
  )
}

export default Login