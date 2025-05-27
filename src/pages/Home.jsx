import React, { useEffect } from 'react';
import { auth, db } from "../firebase";
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Home = (props) => {
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserProfile = async () => {
            if (props.isAuth) {
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists() || !userDocSnap.data().completedProfile) {
                    navigate("/complete-profile"); // Rediriger vers le formulaire de profil
                } else {
                    navigate("/family-dashboard"); // Rediriger vers le tableau de bord familial
                }
            } else {
                navigate("/signup"); // Rediriger vers l'inscription si non authentifié
            }
        };

        // Delay to allow auth.currentUser to be set after sign-in/signup
        const timer = setTimeout(() => {
            checkUserProfile();
        }, 500); // Small delay to ensure auth.currentUser is available

        return () => clearTimeout(timer);
    }, [props.isAuth, navigate]);

    return (
        <div className='homePage'>
            {/* Contenu de la page d'accueil (peut être vide ou un loader) */}
            <h2 style={{textAlign: 'center', marginTop: '50px', color: '#4CAF50'}}>Chargement de votre espace familial...</h2>
        </div>
    );
}

export default Home;