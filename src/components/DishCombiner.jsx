import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { FaPlus, FaUtensils, FaCheckSquare, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const DishCombiner = () => {
  const [availableDishes, setAvailableDishes] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [newDishName, setNewDishName] = useState('');
  const [newDishAliases, setNewDishAliases] = useState(''); // Comma-separated string
  const [newDishPrepTime, setNewDishPrepTime] = useState('');
  const [newDishServings, setNewDishServings] = useState('');
  const [newDishDietaryRestrictions, setNewDishDietaryRestrictions] = useState([]);
  const [newDishImage, setNewDishImage] = useState(null);
  const [newDishImagePreview, setNewDishImagePreview] = useState('');
  const [combinedIngredients, setCombinedIngredients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const medicalConditionsList = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergie aux arachides',
    'Intolérance au lactose', 'Végétarien', 'Végétalien', 'Aucun'
  ];
  const units = ['g', 'kg', 'ml', 'l', 'unités', 'c. à soupe', 'c. à café'];
  const categories = ['Viande', 'Poisson', 'Légumes', 'Fruits', 'Laitiers', 'Épicerie', 'Autres'];


  useEffect(() => {
    if (!auth.currentUser) return;
    const dishesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
    const unsubscribe = onSnapshot(dishesCollectionRef, (snapshot) => {
      const dishesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableDishes(dishesList);
    }, (err) => {
      setError('Erreur lors du chargement des plats disponibles.');
      console.error("Error fetching available dishes:", err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Calculate combined ingredients whenever selectedDishes change
    const ingredientsMap = {};
    selectedDishes.forEach(dishId => {
      const dish = availableDishes.find(d => d.id === dishId);
      if (dish && dish.ingredients) {
        dish.ingredients.forEach(ing => {
          const key = `${ing.name.toLowerCase()}-${ing.unit.toLowerCase()}`;
          if (ingredientsMap[key]) {
            ingredientsMap[key].quantity = (parseFloat(ingredientsMap[key].quantity) || 0) + (parseFloat(ing.quantity) || 0);
          } else {
            ingredientsMap[key] = { ...ing, quantity: parseFloat(ing.quantity) || 0 };
          }
        });
      }
    });
    setCombinedIngredients(Object.values(ingredientsMap));
  }, [selectedDishes, availableDishes]);

  const handleDishSelection = (dishId) => {
    setSelectedDishes(prev =>
      prev.includes(dishId)
        ? prev.filter(id => id !== dishId)
        : [...prev, dishId]
    );
  };

  const handleDietaryRestrictionChange = (restriction) => {
    setNewDishDietaryRestrictions(prev =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('L\'image ne doit pas dépasser 2 Mo.');
        setNewDishImage(null);
        setNewDishImagePreview('');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDishImage(file);
        setNewDishImagePreview(reader.result);
        setError('');
      };
      reader.readAsDataURL(file);
    } else {
      setNewDishImage(null);
      setNewDishImagePreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedDishes.length < 2) {
      setError('Veuillez sélectionner au moins deux plats à combiner.');
      return;
    }
    if (!newDishName.trim() || !newDishPrepTime || !newDishServings) {
      setError('Veuillez remplir tous les champs obligatoires du nouveau plat.');
      return;
    }
    if (isNaN(parseInt(newDishPrepTime)) || parseInt(newDishPrepTime) <= 0) {
      setError('Veuillez entrer un temps de préparation valide.');
      return;
    }
    if (isNaN(parseInt(newDishServings)) || parseInt(newDishServings) <= 0) {
      setError('Veuillez entrer un nombre de portions valide.');
      return;
    }
    if (combinedIngredients.length === 0) {
        setError('Aucun ingrédient combiné. Vérifiez les plats sélectionnés.');
        return;
    }


    setLoading(true);

    try {
      const aliasesArray = newDishAliases.split(',').map(alias => alias.trim()).filter(alias => alias !== '');

      const newDishData = {
        name: newDishName.trim(),
        aliases: aliasesArray,
        ingredients: combinedIngredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category,
            prix: ing.prix || 0, // Ensure prix is included
        })),
        dietaryRestrictions: newDishDietaryRestrictions,
        prepTime: parseInt(newDishPrepTime),
        servings: parseInt(newDishServings),
        image: newDishImagePreview || '',
        ownerId: auth.currentUser.uid,
        ownerName: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: new Date(),
        isCombinedDish: true, // Flag this as a combined dish
        sourceDishes: selectedDishes, // Store IDs of original dishes
      };

      const dishesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
      await addDoc(dishesCollectionRef, newDishData);
      toast.success('Nouveau plat combiné créé avec succès !');

      // Reset form
      setSelectedDishes([]);
      setNewDishName('');
      setNewDishAliases('');
      setNewDishPrepTime('');
      setNewDishServings('');
      setNewDishDietaryRestrictions([]);
      setNewDishImage(null);
      setNewDishImagePreview('');
      setCombinedIngredients([]);
    } catch (err) {
      setError('Erreur lors de la création du plat combiné.');
      console.error("Error creating combined dish:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="dish-combiner">
      <div className="section-header">
        <div className="section-icon"><FaPlus /></div>
        <h2>Combiner des Plats</h2>
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button className="error-close" onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container dish-combiner-form">
        <div className="form-section">
          <h3>Sélectionner les Plats à Combiner</h3>
          <div className="dishes-selection-grid">
            {availableDishes.length === 0 ? (
              <p>Aucun plat disponible pour la combinaison. Veuillez ajouter des plats d'abord.</p>
            ) : (
              availableDishes.map(dish => (
                <div
                  key={dish.id}
                  className={`dish-selection-card ${selectedDishes.includes(dish.id) ? 'selected' : ''}`}
                  onClick={() => handleDishSelection(dish.id)}
                >
                  <FaCheckSquare className="selection-icon" />
                  <h4>{dish.name}</h4>
                  <p>{dish.ingredients?.length || 0} ingrédients</p>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedDishes.length > 0 && (
          <div className="form-section">
            <h3>Ingrédients Combinés</h3>
            <ul className="combined-ingredients-list">
              {combinedIngredients.length > 0 ? (
                combinedIngredients.map((ing, index) => (
                  <li key={index}>
                    {ing.name}: {ing.quantity % 1 === 0 ? parseInt(ing.quantity) : ing.quantity.toFixed(2)} {ing.unit}
                  </li>
                ))
              ) : (
                <li>Aucun ingrédient combiné (sélectionnez des plats).</li>
              )}
            </ul>
          </div>
        )}

        {selectedDishes.length > 0 && (
          <div className="form-section">
            <h3>Détails du Nouveau Plat Combiné</h3>
            <div className="form-group">
              <label htmlFor="newDishName">Nom du Nouveau Plat <span className="required">*</span></label>
              <input
                type="text"
                id="newDishName"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newDishAliases">Alias (noms alternatifs)</label>
              <input
                type="text"
                id="newDishAliases"
                value={newDishAliases}
                onChange={(e) => setNewDishAliases(e.target.value)}
                placeholder="Ex: Riz, Riz simple"
              />
            </div>
            <div className="form-group">
              <label htmlFor="newDishPrepTime">Temps de Préparation (minutes) <span className="required">*</span></label>
              <input
                type="number"
                id="newDishPrepTime"
                value={newDishPrepTime}
                onChange={(e) => setNewDishPrepTime(e.target.value)}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="newDishServings">Nombre de Portions <span className="required">*</span></label>
              <input
                type="number"
                id="newDishServings"
                value={newDishServings}
                onChange={(e) => setNewDishServings(e.target.value)}
                min="1"
                required
              />
            </div>

            <div className="form-group">
                <label>Restrictions Alimentaires</label>
                <div className="checkbox-group">
                    {medicalConditionsList.map((restriction) => (
                        <label key={restriction} className="checkbox-label">
                            <input
                                type="checkbox"
                                value={restriction}
                                checked={newDishDietaryRestrictions.includes(restriction)}
                                onChange={() => handleDietaryRestrictionChange(restriction)}
                            />
                            <span className="checkbox-custom"></span>
                            {restriction}
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-group">
              <label htmlFor="newDishImage">
                Image du Plat (optionnel)
                <span className="tooltip">
                  <FaInfoCircle />
                  <span className="tooltip-text">Image de 2 Mo maximum.</span>
                </span>
              </label>
              <div className="file-input-wrapper">
                <label htmlFor="newDishImage" className="custom-file-upload">
                  Choisir une image
                </label>
                <input
                  type="file"
                  id="newDishImage"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {newDishImagePreview && (
                  <img src={newDishImagePreview} alt="Aperçu" className="profile-pic-preview" />
                )}
              </div>
            </div>

            <div className="button-group">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Création...' : 'Créer le Plat Combiné'}
              </button>
            </div>
          </div>
        )}
      </form>
    </section>
  );
};

export default DishCombiner;
