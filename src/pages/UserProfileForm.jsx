import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaInfoCircle } from 'react-icons/fa';

const UserProfileForm = ({ setHasCompletedProfile }) => {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [medicalConditions, setMedicalConditions] = useState([]);
    const [otherMedicalCondition, setOtherMedicalCondition] = useState('');
    const [role, setRole] = useState([]);
    const [otherRole, setOtherRole] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [isFormValid, setIsFormValid] = useState(false);

    const medicalConditionsList = [
        'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergie aux arachides',
        'Intolérance au lactose', 'Végétarien', 'Végétalien', 'Aucun'
    ];

    const familyRoles = [
        'Mère', 'Père', 'Enfant', 'Grand-parent'
    ];

    // Vérification de l'authentification
    useEffect(() => {
        if (!auth.currentUser) {
            navigate('/login');
        }
    }, [navigate]);

    // Validation en temps réel
    useEffect(() => {
        const newErrors = {};
        if (!fullName.trim()) newErrors.fullName = 'Le nom complet est requis.';
        if (!age || isNaN(parseInt(age)) || parseInt(age) < 0) newErrors.age = 'Veuillez entrer un âge valide.';
        if (!gender) newErrors.gender = 'Veuillez sélectionner un sexe.';
        if (medicalConditions.includes('Autres') && !otherMedicalCondition.trim()) {
            newErrors.otherMedicalCondition = 'Veuillez spécifier une condition médicale.';
        }
        if (role.includes('Autres') && !otherRole.trim()) {
            newErrors.otherRole = 'Veuillez spécifier un rôle.';
        }

        setErrors(newErrors);
        setIsFormValid(Object.keys(newErrors).length === 0);
    }, [fullName, age, gender, medicalConditions, otherMedicalCondition, role, otherRole]);

    const handleMedicalConditionChange = (condition) => {
        if (medicalConditions.includes(condition)) {
            setMedicalConditions(medicalConditions.filter((c) => c !== condition));
        } else {
            setMedicalConditions([...medicalConditions, condition]);
        }
    };

    const handleRoleChange = (roleOption) => {
        if (role.includes(roleOption)) {
            setRole(role.filter((r) => r !== roleOption));
        } else {
            setRole([...role, roleOption]);
        }
    };

    const handleProfilePicChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setErrors({ ...errors, profilePic: 'L\'image ne doit pas dépasser 2 Mo.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePic(reader.result);
                setProfilePicPreview(reader.result);
                setErrors({ ...errors, profilePic: '' });
            };
            reader.readAsDataURL(file);
        } else {
            setProfilePic(null);
            setProfilePicPreview('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) {
            return;
        }

        setLoading(true);
        setErrors({});

        if (!auth.currentUser) {
            setErrors({ general: 'Aucun utilisateur authentifié. Veuillez vous connecter.' });
            setLoading(false);
            return;
        }

        const userProfileData = {
            fullName: fullName.trim(),
            age: parseInt(age),
            gender,
            email: auth.currentUser.email || '',
            medicalConditions: medicalConditions.includes('Autres')
                ? [...medicalConditions.filter(c => c !== 'Autres'), otherMedicalCondition.trim()]
                : medicalConditions,
            role: role.includes('Autres')
                ? [...role.filter(r => r !== 'Autres'), otherRole.trim()]
                : role,
            profilePic: profilePic || null,
            profilePicPreview: profilePicPreview || '',
            completedProfile: true,
            createdAt: new Date().toISOString(),
            uid: auth.currentUser.uid
        };

        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, userProfileData, { merge: true });
            setHasCompletedProfile(true);
            navigate('/setup-family');
        } catch (err) {
            console.error('Erreur lors de l\'enregistrement du profil:', err);
            let errorMessage = 'Échec de l\'enregistrement du profil. Veuillez réessayer.';
            if (err.code === 'permission-denied') {
                errorMessage = 'Permission refusée. Vérifiez les règles Firestore.';
            } else if (err.code === 'resource-exhausted') {
                errorMessage = 'Limite de stockage dépassée. Réduisez la taille de l\'image.';
            }
            setErrors({ general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container user-profile-form">
            <h2>Votre Profil Principal</h2>
            {errors.general && <div className="error-message">{errors.general}</div>}
            <form onSubmit={handleSubmit} aria-labelledby="form-title">
                <div className="form-section">
                    <h3>Informations Personnelles</h3>
                    <div className="form-group">
                        <label htmlFor="fullName">
                            Nom Complet <span className="required">*</span>
                            <span className="tooltip">
                                <FaInfoCircle />
                                <span className="tooltip-text">Entrez votre nom complet.</span>
                            </span>
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            aria-describedby="fullName-error"
                            className={errors.fullName ? 'input-error' : ''}
                        />
                        {errors.fullName && <div id="fullName-error" className="error-message">{errors.fullName}</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="age">
                            Âge <span className="required">*</span>
                        </label>
                        <input
                            type="number"
                            id="age"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            min="0"
                            required
                            aria-describedby="age-error"
                            className={errors.age ? 'input-error' : ''}
                        />
                        {errors.age && <div id="age-error" className="error-message">{errors.age}</div>}
                    </div>

                    <div className="form-group">
                        <label>
                            Sexe <span className="required">*</span>
                        </label>
                        <div className="gender-buttons" role="radiogroup" aria-labelledby="gender-label">
                            {['Homme', 'Femme', 'Autre'].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={`gender-button ${gender === option ? 'selected' : ''}`}
                                    onClick={() => setGender(option)}
                                    role="radio"
                                    aria-checked={gender === option}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        {errors.gender && <div className="error-message">{errors.gender}</div>}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Conditions Médicales</h3>
                    <div className="form-group">
                        <label>Antécédents Médicaux (liés à l'alimentation)</label>
                        <div className="checkbox-group">
                            {medicalConditionsList.map((condition) => (
                                <label key={condition} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        value={condition}
                                        checked={medicalConditions.includes(condition)}
                                        onChange={() => handleMedicalConditionChange(condition)}
                                    />
                                    <span className="checkbox-custom"></span>
                                    {condition}
                                </label>
                            ))}
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    value="Autres"
                                    checked={medicalConditions.includes('Autres')}
                                    onChange={() => handleMedicalConditionChange('Autres')}
                                />
                                <span className="checkbox-custom"></span>
                                Autres
                            </label>
                        </div>
                        {medicalConditions.includes('Autres') && (
                            <input
                                type="text"
                                placeholder="Spécifiez la condition médicale"
                                value={otherMedicalCondition}
                                onChange={(e) => setOtherMedicalCondition(e.target.value)}
                                required
                                aria-describedby="otherMedicalCondition-error"
                                className={errors.otherMedicalCondition ? 'input-error' : ''}
                            />
                        )}
                        {errors.otherMedicalCondition && (
                            <div id="otherMedicalCondition-error" className="error-message">{errors.otherMedicalCondition}</div>
                        )}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Rôle dans la Famille</h3>
                    <div className="form-group">
                        <label>Votre Rôle</label>
                        <div className="checkbox-group">
                            {familyRoles.map((roleOption) => (
                                <label key={roleOption} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        value={roleOption}
                                        checked={role.includes(roleOption)}
                                        onChange={() => handleRoleChange(roleOption)}
                                    />
                                    <span className="checkbox-custom"></span>
                                    {roleOption}
                                </label>
                            ))}
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    value="Autres"
                                    checked={role.includes('Autres')}
                                    onChange={() => handleRoleChange('Autres')}
                                />
                                <span className="checkbox-custom"></span>
                                Autres
                            </label>
                        </div>
                        {role.includes('Autres') && (
                            <input
                                type="text"
                                placeholder="Spécifiez votre rôle"
                                value={otherRole}
                                onChange={(e) => setOtherRole(e.target.value)}
                                required
                                aria-describedby="otherRole-error"
                                className={errors.otherRole ? 'input-error' : ''}
                            />
                        )}
                        {errors.otherRole && <div id="otherRole-error" className="error-message">{errors.otherRole}</div>}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Photo de Profil</h3>
                    <div className="form-group">
                        <label htmlFor="profilePic">
                            Photo de Profil (optionnel)
                            <span className="tooltip">
                                <FaInfoCircle />
                                <span className="tooltip-text">Image de 2 Mo maximum.</span>
                            </span>
                        </label>
                        <div className="file-input-wrapper">
                            <label htmlFor="profilePic" className="custom-file-upload">
                                Choisir une image
                            </label>
                            <input
                                type="file"
                                id="profilePic"
                                accept="image/*"
                                onChange={handleProfilePicChange}
                                aria-describedby="profilePic-error"
                            />
                            {profilePicPreview && (
                                <img src={profilePicPreview} alt="Aperçu" className="profile-pic-preview" />
                            )}
                        </div>
                        {errors.profilePic && <div id="profilePic-error" className="error-message">{errors.profilePic}</div>}
                    </div>
                </div>

                <div className="button-group">
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading || !isFormValid}
                        aria-disabled={loading || !isFormValid}
                    >
                        {loading ? 'Enregistrement...' : 'Enregistrer et Continuer'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserProfileForm;