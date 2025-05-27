import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, addDoc, getDoc, setDoc } from 'firebase/firestore'; // Added getDoc and setDoc
import { FaUtensils, FaPlus, FaTimes, FaSearch, FaGlobe, FaDownload } from 'react-icons/fa';
import DishForm from './DishForm';
import { toast } from 'react-toastify';

const DishList = ({ familyMembers }) => {
  const [dishes, setDishes] = useState([]);
  const [publicDishes, setPublicDishes] = useState([]); // New state for public dishes
  const [editingDish, setEditingDish] = useState(null);
  const [showNewDishForm, setShowNewDishForm] = useState(false);
  const [filters, setFilters] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPublicDishes, setShowPublicDishes] = useState(false); // Toggle for public dishes

  const medicalConditionsList = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergie aux arachides',
    'Intolérance au lactose', 'Végétarien', 'Végétalien', 'Aucun'
  ];

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // Subscribe to user's private dishes
    const userDishesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
    const unsubscribeUserDishes = onSnapshot(userDishesCollectionRef, (snapshot) => {
      const dishesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDishes(dishesList);
      setLoading(false);
    }, (err) => {
      setError('Erreur lors du chargement de vos plats.');
      setLoading(false);
      console.error("Error fetching user dishes:", err);
    });

    // Subscribe to public dishes
    const publicDishesCollectionRef = collection(db, 'publicDishes');
    const unsubscribePublicDishes = onSnapshot(publicDishesCollectionRef, (snapshot) => {
      const publicDishesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPublicDishes(publicDishesList);
    }, (err) => {
      console.error("Error fetching public dishes:", err);
    });

    return () => {
      unsubscribeUserDishes();
      unsubscribePublicDishes();
    };
  }, []);

  const handleFilterChange = (restriction) => {
    setFilters(prev =>
      prev.includes(restriction)
        ? prev.filter((f) => f !== restriction)
        : [...prev, restriction]
    );
  };

  const currentDishes = showPublicDishes ? publicDishes : dishes;

  const filteredAndSearchedDishes = currentDishes.filter(dish => {
    // Filter by dietary restrictions
    const matchesFilters = filters.length === 0 || filters.every(filter => dish.dietaryRestrictions?.includes(filter));

    // Filter by search term (name or aliases)
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      dish.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      (dish.aliases && dish.aliases.some(alias => alias.toLowerCase().includes(lowerCaseSearchTerm)));

    return matchesFilters && matchesSearch;
  });

  const handleSaveDish = (dishData) => {
    setEditingDish(null);
    setShowNewDishForm(false);
    toast.success('Plat enregistré avec succès !');
  };

  const handleDeleteDish = async (dishId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;
    try {
      const dishDocRef = doc(db, 'users', auth.currentUser.uid, 'dishes', dishId);
      await deleteDoc(dishDocRef);
      toast.success('Plat supprimé avec succès !');
    } catch (err) {
      setError('Erreur lors de la suppression du plat.');
      console.error("Error deleting dish:", err);
      toast.error('Échec de la suppression du plat.');
    }
  };

  const handleImportDish = async (dishToImport) => {
    if (!auth.currentUser) {
      toast.error('Vous devez être connecté pour importer un plat.');
      return;
    }
    try {
      // Create a copy of the dish data, removing the original ID and ownerId/ownerName
      const { id, ownerId, ownerName, ...newDishData } = dishToImport;
      const dishesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
      await addDoc(dishesCollectionRef, {
        ...newDishData,
        ownerId: auth.currentUser.uid, // Set current user as new owner
        ownerName: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: new Date(),
        importedFrom: dishToImport.id, // Keep a reference to the original public dish
      });
      toast.success(`Plat "${dishToImport.name}" importé avec succès dans vos plats !`);
    } catch (err) {
      console.error('Erreur lors de l\'importation du plat:', err);
      toast.error('Échec de l\'importation du plat.');
    }
  };

  const handleMakePublic = async (dishId) => {
    if (!auth.currentUser) {
      toast.error('Vous devez être connecté pour rendre un plat public.');
      return;
    }
    try {
      const dishDocRef = doc(db, 'users', auth.currentUser.uid, 'dishes', dishId);
      const dishSnap = await getDoc(dishDocRef); // Corrected: Use getDoc to fetch the snapshot
      
      if (!dishSnap.exists()) {
        toast.error('Plat introuvable.');
        return;
      }
      const dishData = dishSnap.data(); // Corrected: Call .data() on the snapshot

      // Check if the dish is already public
      const publicDishRef = doc(db, 'publicDishes', dishId);
      const publicDishSnap = await getDoc(publicDishRef); // Corrected: Use getDoc to fetch the snapshot
      
      if (publicDishSnap.exists()) {
        toast.info('Ce plat est déjà public.');
        return;
      }

      // Add to publicDishes collection
      await setDoc(publicDishRef, {
        ...dishData,
        ownerId: auth.currentUser.uid,
        ownerName: auth.currentUser.displayName || auth.currentUser.email,
        isPublic: true,
      });
      toast.success('Plat rendu public avec succès !');
    } catch (err) {
      console.error('Erreur lors de la publication du plat:', err);
      toast.error('Échec de la publication du plat.');
    }
  };


  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div><p>Chargement des plats...</p></div>;
  }

  return (
    <section className="dishes">
      <div className="section-header">
        <div className="section-icon"><FaUtensils /></div>
        <h2>Liste des Plats</h2>
        <div className="header-actions">
          <button className="btn-secondary toggle-view-btn" onClick={() => setShowPublicDishes(!showPublicDishes)}>
            {showPublicDishes ? (
              <>
                <FaUtensils /> Mes Plats
              </>
            ) : (
              <>
                <FaGlobe /> Plats Publics
              </>
            )}
          </button>
          <button className="btn-primary add-member-btn" onClick={() => setShowNewDishForm(true)}>
            <FaPlus /> Ajouter un Plat
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="error-close" onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      <div className="filters-and-search">
        <div className="form-group search-input-group">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom ou alias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="form-section filter-section">
          <h3>Filtrer par Restrictions Alimentaires</h3>
          <div className="checkbox-group">
            {medicalConditionsList.map((restriction) => (
              <label key={restriction} className="checkbox-label">
                <input
                  type="checkbox"
                  value={restriction}
                  checked={filters.includes(restriction)}
                  onChange={() => handleFilterChange(restriction)}
                />
                <span className="checkbox-custom"></span>
                {restriction}
              </label>
            ))}
          </div>
        </div>
      </div>


      {showNewDishForm || editingDish ? (
        <div className="modal-overlay">
          <div className="modal">
            <button className="modal-close" onClick={() => { setShowNewDishForm(false); setEditingDish(null); }}>
              <FaTimes />
            </button>
            <DishForm
              dish={editingDish || {}}
              onSave={handleSaveDish}
              onCancel={() => { setShowNewDishForm(false); setEditingDish(null); }}
              isNew={!editingDish}
            />
          </div>
        </div>
      ) : (
        <div className="members-grid">
          {filteredAndSearchedDishes.length > 0 ? (
            filteredAndSearchedDishes.map((dish) => (
              <div key={dish.id} className="member-card dish-card">
                {dish.image ? (
                  <img src={dish.image} alt={dish.name} className="profile-pic-preview" />
                ) : (
                  <div className="avatar-placeholder"><FaUtensils /></div>
                )}
                <div className="member-info">
                  <h3>{dish.name}</h3>
                  {dish.aliases && dish.aliases.length > 0 && (
                    <p className="dish-aliases">Alias: {dish.aliases.join(', ')}</p>
                  )}
                  <div className="member-details">
                    <p><strong>Temps de préparation :</strong> {dish.prepTime} min</p>
                    <p><strong>Portions :</strong> {dish.servings}</p>
                    <p><strong>Restrictions :</strong> {dish.dietaryRestrictions?.join(', ') || 'Aucune'}</p>
                    <p><strong>Ingrédients :</strong> {dish.ingredients?.map(ing => `${ing.name} (${ing.quantity} ${ing.unit}) ${ing.prix}`).join(', ') || 'Non spécifiés'}</p>
                    {dish.ownerName && (
                      <p className="dish-owner">
                        Auteur: <strong>{dish.ownerName}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <div className="member-actions">
                  {showPublicDishes ? (
                    <button className="btn-primary import-btn" onClick={() => handleImportDish(dish)}>
                      <FaDownload /> Importer
                    </button>
                  ) : (
                    <>
                      <button className="edit-btn" onClick={() => setEditingDish(dish)}>Modifier</button>
                      <button className="delete-btn" onClick={() => handleDeleteDish(dish.id)}>Supprimer</button>
                      <button className="btn-secondary make-public-btn" onClick={() => handleMakePublic(dish.id)}>
                        <FaGlobe /> Rendre Public
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><FaUtensils /></div>
              <h3>Aucun plat trouvé</h3>
              <p>
                {showPublicDishes
                  ? "Aucun plat public ne correspond à vos critères."
                  : "Aucun plat ajouté. Ajoutez des plats pour commencer à planifier vos repas."}
              </p>
              {!showPublicDishes && (
                <button className="btn-primary" onClick={() => setShowNewDishForm(true)}>
                  <FaPlus /> Ajouter le premier plat
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default DishList;
