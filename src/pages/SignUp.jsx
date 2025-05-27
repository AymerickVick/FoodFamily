import React, { useState } from 'react'
import { Link } from 'react-router-dom';
import { auth, googleProvider } from "../firebase";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useNavigate } from 'react-router-dom';

const SignUp = (props) => {
    const navigate = useNavigate()
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSuccessfulAuth = (user) => {
        props.setIsAuth(true);
        navigate("/complete-profile"); // Rediriger vers le formulaire de profil
    }

    const signUpWithEmailAndPassword = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await handleSuccessfulAuth(userCredential.user);
        } catch (error) {
            alert("Erreur d'inscription : " + error.message);
            console.log(error);
        }
    };

    const signUpWithGoogle = async () => {
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            await handleSuccessfulAuth(userCredential.user);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="signUpPage form-container">
            <h2>Page d'Inscription</h2>
            <div className="form-group">
                <label htmlFor="email">Email :</label>
                <input
                    type="email"
                    id="email"
                    required
                    placeholder='Votre Email...'
                    value={email}
                    onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
                <label htmlFor="password">Mot de passe :</label>
                <input
                    type="password"
                    id="password"
                    required
                    placeholder='Votre Mot de Passe...'
                    value={password}
                    onChange={e => setPassword(e.target.value)} />
            </div>
            <footer style={{ margin: "10px 0 20px", fontSize: "14px", color: "#777" }}>Le mot de passe doit contenir au moins 6 caractères.</footer>
            <button className='btn-primary' onClick={signUpWithEmailAndPassword}>S'inscrire</button>
            <button className='sign-in-with-google' onClick={signUpWithGoogle}>S'inscrire avec Google</button>
            <Link to={"/login"}>
                <p className='already'>Vous avez déjà un compte ? Se connecter</p>
            </Link>
        </div>
    )
}

export default SignUp;