import React, { useState, useEffect } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const FamilyMemberForm = ({ member, onSave, onCancel, onDelete, isNew = false }) => {
    const [fullName, setFullName] = useState(member?.fullName || '');
    const [age, setAge] = useState(member?.age || '');
    const [gender, setGender] = useState(member?.gender || '');
    const [medicalConditions, setMedicalConditions] = useState(member?.medicalConditions || []);
    const [otherMedicalCondition, setOtherMedicalCondition] = useState(member?.otherMedicalCondition || '');
    const [role, setRole] = useState(member?.role || []);
    const [otherRole, setOtherRole] = useState(member?.otherRole || '');
    const [email, setEmail] = useState(member?.email || '');
    const [profilePic, setProfilePic] = useState(member?.profilePic || null);
    const [profilePicPreview, setProfilePicPreview] = useState(member?.profilePic || '');
    const [errors, setErrors] = useState({});
    const [isFormValid, setIsFormValid] = useState(false);

    const medicalConditionsList = [
        'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergie aux arachides',
        'Intolérance au lactose', 'Végétarien', 'Végétalien', 'Aucun'
    ];

    const familyRoles = [
        'Mère', 'Père', 'Enfant', 'Grand-parent', 'Conjoint(e)', 'Frère/Sœur'
    ];

    const isEmailDisabled = parseInt(age) < 5 || isNaN(parseInt(age));

    // Synchronisation des données initiales
    useEffect(() => {
        if (member) {
            setFullName(member.fullName || '');
            setAge(member.age || '');
            setGender(member.gender || '');
            setMedicalConditions(member.medicalConditions || []);
            setOtherMedicalCondition(member.otherMedicalCondition || '');
            setRole(member.role || []);
            setOtherRole(member.otherRole || '');
            setEmail(member.email || '');
            setProfilePic(member.profilePic || null);
            setProfilePicPreview(member.profilePic || '');
        }
    }, [member]);

    // Validation en temps réel
    useEffect(() => {
        const newErrors = {};
        if (!fullName) newErrors.fullName = 'Le nom complet est requis.';
        if (!age || isNaN(parseInt(age)) || parseInt(age) < 0) newErrors.age = 'Veuillez entrer un âge valide.';
        if (!gender) newErrors.gender = 'Veuillez sélectionner un sexe.';
        if (medicalConditions.includes('Autres') && !otherMedicalCondition) {
            newErrors.otherMedicalCondition = 'Veuillez spécifier une condition médicale.';
        }
        if (role.includes('Autres') && !otherRole) {
            newErrors.otherRole = 'Veuillez spécifier un rôle.';
        }
        if (!isEmailDisabled && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Veuillez entrer un email valide.';
        }

        setErrors(newErrors);
        setIsFormValid(Object.keys(newErrors).length === 0);
    }, [fullName, age, gender, medicalConditions, otherMedicalCondition, role, otherRole, email, isEmailDisabled]);

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

    const handleSave = (e) => {
        e.preventDefault();
        if (!isFormValid) {
            return;
        }

        const memberData = {
            id: member?.id,
            fullName,
            age: parseInt(age),
            gender,
            email: isEmailDisabled ? '' : email,
            medicalConditions: medicalConditions.includes('Autres')
                ? [...medicalConditions.filter(c => c !== 'Autres'), otherMedicalCondition]
                : medicalConditions,
            role: role.includes('Autres')
                ? [...role.filter(r => r !== 'Autres'), otherRole]
                : role,
            profilePic,
            profilePicPreview,
        };

        try {
            onSave(memberData);
        } catch (err) {
            setErrors({ general: 'Erreur lors de la sauvegarde. Veuillez réessayer.' });
        }
    };

    return (
        <div className="family-member-form">
            <h2>{isNew ? 'Ajouter un Membre' : 'Modifier le Membre'}</h2>
            {errors.general && <div className="error-message">{errors.general}</div>}
            <form onSubmit={handleSave} aria-labelledby="form-title">
                <div className="form-section">
                    <h3>Informations Personnelles</h3>
                    <div className="form-group">
                        <label htmlFor="memberFullName">
                            Nom Complet <span className="required">*</span>
                            <span className="tooltip">
                                <FaInfoCircle />
                                <span className="tooltip-text">Entrez le nom complet du membre.</span>
                            </span>
                        </label>
                        <input
                            type="text"
                            id="memberFullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            aria-describedby="fullName-error"
                            className={errors.fullName ? 'input-error' : ''}
                        />
                        {errors.fullName && <div id="fullName-error" className="error-message">{errors.fullName}</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="memberAge">
                            Âge <span className="required">*</span>
                        </label>
                        <input
                            type="number"
                            id="memberAge"
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

                    <div className="form-group">
                        <label htmlFor="memberEmail">
                            Email
                            <span className="tooltip">
                                <FaInfoCircle />
                                <span className="tooltip-text">
                                    {isEmailDisabled ? 'Désactivé pour les enfants de moins de 5 ans.' : 'Optionnel, entrez un email valide.'}
                                </span>
                            </span>
                        </label>
                        <input
                            type="email"
                            id="memberEmail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isEmailDisabled}
                            aria-describedby="email-error"
                            className={errors.email ? 'input-error' : ''}
                        />
                        {errors.email && <div id="email-error" className="error-message">{errors.email}</div>}
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
                    <h3>Rôles dans la Famille</h3>
                    <div className="form-group">
                        <label>Rôle dans la famille</label>
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
                                placeholder="Spécifiez le rôle"
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
                        <label htmlFor="memberProfilePic">
                            Photo de Profil (optionnel)
                            <span className="tooltip">
                                <FaInfoCircle />
                                <span className="tooltip-text">Image de 2 Mo maximum.</span>
                            </span>
                        </label>
                        <div className="file-input-wrapper">
                            <label htmlFor="memberProfilePic" className="custom-file-upload">
                                Choisir une image
                            </label>
                            <input
                                type="file"
                                id="memberProfilePic"
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
                        disabled={!isFormValid}
                        aria-disabled={!isFormValid}
                    >
                        {isNew ? 'Ajouter le Membre' : 'Sauvegarder'}
                    </button>
                    {onCancel && (
                        <button type="button" className="btn-secondary" onClick={onCancel}>
                            Annuler
                        </button>
                    )}
                    {!isNew && onDelete && (
                        <button
                            type="button"
                            className="delete-btn"
                            onClick={() => onDelete(member.id)}
                        >
                            Supprimer
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default FamilyMemberForm;