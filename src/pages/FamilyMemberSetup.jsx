import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import FamilyMemberForm from '../components/FamilyMemberForm';

const FamilyMemberSetup = () => {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [showNewMemberForm, setShowNewMemberForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setError('Vous devez être connecté pour ajouter des membres.');
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (members.length === 0 && !showNewMemberForm) {
            setShowNewMemberForm(true);
        }
    }, [members, showNewMemberForm]);

    const handleAddMember = async (newMemberData) => {
        setLoading(true);
        setError('');

        if (!newMemberData.fullName || !newMemberData.age || !newMemberData.gender) {
            setError('Données incomplètes. Veuillez vérifier le formulaire.');
            setLoading(false);
            return;
        }

        try {
            if (!auth.currentUser) {
                throw new Error('Aucun utilisateur authentifié.');
            }

            const cleanedData = {
                fullName: newMemberData.fullName || '',
                age: newMemberData.age || 0,
                gender: newMemberData.gender || '',
                email: newMemberData.email || '',
                medicalConditions: newMemberData.medicalConditions || [],
                role: newMemberData.role || [],
                profilePic: newMemberData.profilePic || null,
                profilePicPreview: newMemberData.profilePicPreview || '',
                ownerId: auth.currentUser.uid,
                createdAt: new Date(),
            };

            const membersCollectionRef = collection(db, 'users', auth.currentUser.uid, 'familyMembers');
            const docRef = await addDoc(membersCollectionRef, cleanedData);

            setMembers((prevMembers) => [
                ...prevMembers,
                { ...cleanedData, id: docRef.id },
            ]);
            setShowNewMemberForm(false);
        } catch (err) {
            console.error('Erreur détaillée lors de l’ajout du membre :', err);
            if (err.code === 'permission-denied') {
                setError('Permission refusée. Vérifiez les règles Firestore dans la console Firebase.');
            } else if (err.code === 'unavailable') {
                setError('Problème de connexion à Firestore. Vérifiez votre réseau.');
            } else {
                setError(`Échec de l’ajout du membre : ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (members.length === 0) {
            setError('Veuillez ajouter au moins un membre avant de continuer.');
            return;
        }
        navigate('/family-dashboard');
    };

    return (
        <div className="form-container family-setup-page">
            <h2>Configuration des Membres de la Famille</h2>
            {error && <p className="error-message" style={{ color: 'red', marginBottom: '15px' }}>{error}</p>}

            {members.length > 0 && (
                <div style={{ marginBottom: '20px', width: '100%', textAlign: 'center' }}>
                    <h3>Membres ajoutés :</h3>
                    {members.map((member, index) => (
                        <div
                            key={index}
                            className="member-card"
                            style={{ display: 'inline-block', margin: '10px', verticalAlign: 'top', maxWidth: '300px' }}
                        >
                            {member.profilePicPreview && (
                                <img
                                    src={member.profilePicPreview}
                                    alt={member.fullName}
                                    className="profile-pic-preview"
                                    style={{ maxWidth: '100px', maxHeight: '100px' }}
                                />
                            )}
                            <div>
                                <h4>{member.fullName}</h4>
                                <p>Âge: {member.age}</p>
                                <p>Rôle: {member.role.join(', ')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showNewMemberForm ? (
                <FamilyMemberForm
                    member={{}}
                    onSave={handleAddMember}
                    onCancel={() => setShowNewMemberForm(false)}
                    isNew={true}
                />
            ) : (
                <div className="button-group" style={{ marginTop: '30px', width: '100%', justifyContent: 'center' }}>
                    <button className="btn-secondary" onClick={() => setShowNewMemberForm(true)}>
                        Ajouter un autre membre
                    </button>
                    <button className="btn-primary" onClick={handleContinue} disabled={loading}>
                        {loading ? 'Chargement...' : 'Continuer vers le Tableau de Bord'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FamilyMemberSetup;