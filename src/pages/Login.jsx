import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const Login = ({ setIsAuth }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSuccessfulAuth = async (user) => {
        setIsAuth(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists() || !userDocSnap.data().completedProfile) {
                navigate('/complete-profile');
            } else {
                navigate('/family-dashboard');
            }
        } catch (err) {
            setError('Erreur lors de la vérification du profil : ' + err.message);
        }
    };

    const signInWithEmailAndPasswordHandler = async () => {
        setError('');
        if (!email || !password) {
            setError('Veuillez entrer un email et un mot de passe.');
            return;
        }
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await handleSuccessfulAuth(userCredential.user);
        } catch (error) {
            console.error('Erreur de connexion :', error);
            if (error.code === 'auth/wrong-password') {
                setError('Mot de passe incorrect.');
            } else if (error.code === 'auth/user-not-found') {
                setError('Aucun utilisateur trouvé avec cet email.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Adresse email invalide.');
            } else {
                setError('Erreur de connexion : ' + error.message);
            }
        }
    };

    const signInWithGoogle = async () => {
        setError('');
        try {
            const userCredential = await signInWithPopup(auth, googleProvider);
            await handleSuccessfulAuth(userCredential.user);
        } catch (error) {
            console.error('Erreur de connexion Google :', error);
            setError('Erreur lors de la connexion avec Google : ' + error.message);
        }
    };

    return (
        <div className="loginPage form-container">
            <h2>Page de Connexion</h2>
            {error && <p className="error-message" style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}
            <div className="form-group">
                <label htmlFor="email">Email :</label>
                <input
                    type="email"
                    id="email"
                    required
                    placeholder="Votre Email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label htmlFor="password">Mot de passe :</label>
                <input
                    type="password"
                    id="password"
                    required
                    placeholder="Votre Mot de Passe..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <footer style={{ margin: '10px 0 20px', fontSize: '14px', color: '#777' }}>
                Le mot de passe doit contenir au moins 6 caractères.
            </footer>
            <button className="btn-primary" onClick={signInWithEmailAndPasswordHandler}>
                Se Connecter
            </button>
            <button className="sign-in-with-google" onClick={signInWithGoogle}>
                Se Connecter avec Google
            </button>
            <Link to="/signup">
                <p className="already">Vous n'avez pas de compte ? S'inscrire</p>
            </Link>
        </div>
    );
};

export default Login;