import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore'; // Added getDocs
import { FaInfoCircle, FaPlus, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const DishForm = ({ dish, onSave, onCancel, isNew = false }) => {
  const [name, setName] = useState(dish?.name || '');
  const [aliases, setAliases] = useState(dish?.aliases?.join(', ') || '');
  const [ingredients, setIngredients] = useState(dish?.ingredients || [{ name: '', quantity: '', prix: '', unit: '', category: '' }]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(dish?.dietaryRestrictions || []);
  const [prepTime, setPrepTime] = useState(dish?.prepTime || '');
  const [servings, setServings] = useState(dish?.servings || '');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(dish?.image || '');
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState([]); // New state for available ingredients

  const medicalConditionsList = [
    'Diabète', 'Hypertension', 'Maladie cœliaque', 'Allergie aux arachides',
    'Intolérance au lactose', 'Végétarien', 'Végétalien', 'Aucun'
  ];
  const units = ['g', 'kg', 'ml', 'l', 'unités', 'c. à soupe', 'c. à café', 'pincée', 'bol', 'poignée', 'morceau', 'gousse', 'branche', 'tas', 'fruits', 'sachet', 'doigts'];
  const categories = ['Viande', 'Poisson', 'Légumes', 'Fruits', 'Laitiers', 'Épicerie', 'Autres'];

  // Fetch available ingredients from Firestore (or a static JSON)
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        // In a real app, you might have a dedicated 'ingredients' collection
        // For this example, we'll simulate loading from a static JSON or a simplified collection
        // If you have a 'publicIngredients' collection, you'd fetch from there:
        // const ingredientsCollectionRef = collection(db, 'publicIngredients');
        // const snapshot = await getDocs(ingredientsCollectionRef);
        // const fetchedIngredients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // For now, let's use a mock list of ingredients from the generated JSON
        // In a real scenario, you would load this from a database or a separate file.
        const mockIngredients = [
            { "name": "bananes vertes non mûres", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "poisson fumé ou viande", "unit": "g", "prix": "100", "category": "Viande" },
            { "name": "pâte d'arachide grillée", "unit": "g", "prix": "100", "category": "Autres" },
            { "name": "huile de palme", "unit": "cuillères à soupe", "prix": "100", "category": "Épicerie" },
            { "name": "oignon blanc", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "piment", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "persil", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "céleri", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "ail", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "poivre", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "sel ou cubes d'assaisonnement", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "gingembre (njinja)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "bouquet garni", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "haricots blancs", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "eau", "unit": "ml", "prix": "100", "category": "Autres" },
            { "name": "sel", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "oignon moyen", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "huile de friture", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "tomates", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "huile d'arachide", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "haricots rouges", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "poisson fumé", "unit": "", "prix": "100", "category": "Poisson" },
            { "name": "oignons", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "huile de palme rouge", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "maïs frais ou en boîte", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "crevettes séchées (madjanga)", "unit": "poignée", "prix": "100", "category": "Poisson" },
            { "name": "kanwa (sel gemme)", "unit": "petit morceau", "prix": "100", "category": "Épicerie" },
            { "name": "maïs frais ou sec", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "arachides", "unit": "g", "prix": "100", "category": "Autres" },
            { "name": "feuilles de bananier", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "macabos blancs", "unit": "gros", "prix": "100", "category": "Légumes" },
            { "name": "feuilles de macabo", "unit": "paquets", "prix": "100", "category": "Légumes" },
            { "name": "écrevisses", "unit": "g", "prix": "100", "category": "Poisson" },
            { "name": "gingembre", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "rondelles", "unit": "cc", "prix": "100", "category": "Épicerie" },
            { "name": "poivre blanc", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "cubes d'assaisonnement", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "feuilles de eru ou okok", "unit": "tasses", "prix": "100", "category": "Légumes" },
            { "name": "feuilles d'épinards", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "écrevisses (mandjanga)", "unit": "tasse", "prix": "100", "category": "Poisson" },
            { "name": "peau de bœuf", "unit": "", "prix": "100", "category": "Viande" },
            { "name": "viande de bœuf", "unit": "kg", "prix": "100", "category": "Viande" },
            { "name": "piment", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "viande hachée", "unit": "", "prix": "100", "category": "Viande" },
            { "name": "amarante (folong)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "blanc de poireau", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "oignon", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "tomate", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "huile végétale", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "gombo frais", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "sel gemme (kanwa)", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "cubes Maggi", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "échalotes ou oignons", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "tomate fraîche", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "carottes", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "haricots verts", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "poireau", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "poivron", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "crevettes séchées", "unit": "bol", "prix": "100", "category": "Poisson" },
            { "name": "feuilles de gombo", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "feuilles de manioc pilées", "unit": "g", "prix": "100", "category": "Légumes" },
            { "name": "haricots blancs", "unit": "kg", "prix": "100", "category": "Légumes" },
            { "name": "ficelle", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "viande de porc", "unit": "g", "prix": "100", "category": "Viande" },
            { "name": "basilic", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "piments", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "bongolo (bongo)", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "pèbès", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "feuilles de gingembre (odzom)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "macabo blancs", "unit": "kg", "prix": "100", "category": "Légumes" },
            { "name": "huile de cuisson", "unit": "ml", "prix": "100", "category": "Épicerie" },
            { "name": "kpem (feuilles de manioc)", "unit": "paquets", "prix": "100", "category": "Légumes" },
            { "name": "noix de palme bien rouges", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "aubergines", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "ohomis râpé (écorce d'arbre)", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "sucre ou banane mûre", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "manioc ou macabos", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "poisson (machoirons, silures, carpes ou anguilles)", "unit": "kg", "prix": "100", "category": "Poisson" },
            { "name": "djansan", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "poudre de mbongo", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "poudre d'écorce d'arbre à ail (hiomi)", "unit": "pincée", "prix": "100", "category": "Épicerie" },
            { "name": "cube de bouillon", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "graines de courges séchées", "unit": "kg", "prix": "100", "category": "Autres" },
            { "name": "morue fumée", "unit": "tas", "prix": "100", "category": "Poisson" },
            { "name": "macabo", "unit": "kg", "prix": "100", "category": "Légumes" },
            { "name": "poisson fumé (bifaga)", "unit": "", "prix": "100", "category": "Poisson" },
            { "name": "maquereaux", "unit": "g", "prix": "100", "category": "Poisson" },
            { "name": "noyaux de mangue sauvage", "unit": "g", "prix": "100", "category": "Fruits" },
            { "name": "farine de maïs", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "tiges de Nkui (écorces de triumfetta pentandra)", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "Olom ou Hiomi (écorces de l'arbre ail)", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "Mendak (graines de Monodora myristica)", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "Melam (petits fruits voisins du poivre)", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "Nsà nshu (petits fruits voisins du poivre)", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "Nsù'nflù (fragments d'une racine tortueuse)", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "Sùsùe (aubergines locales)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "Tshùtshe (fruit du Tetrapleura tetraptera)", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "Sô (poivre sauvage)", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "condiments divers", "unit": "", "prix": "100", "category": "Autres" },
            { "name": "riz", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "eau tiède", "unit": "ml", "prix": "100", "category": "Autres" },
            { "name": "écrevisses ou poisson fumé ou viande fumée", "unit": "g", "prix": "100", "category": "Poisson" },
            { "name": "filets de bar", "unit": "", "prix": "100", "category": "Poisson" },
            { "name": "échalote", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "tomate moyenne", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "citron vert", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "feuilles de messep (basilic)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "jarret de porc", "unit": "", "prix": "100", "category": "Viande" },
            { "name": "citron", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "feuilles Messep (basilic tropical)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "feuilles d'Odzom (ou laurier)", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "feuilles de Ndolé", "unit": "kg", "prix": "100", "category": "Légumes" },
            { "name": "huile", "unit": "litre", "prix": "100", "category": "Épicerie" },
            { "name": "pâte d'arachides", "unit": "g", "prix": "100", "category": "Autres" },
            { "name": "piment rouge", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "feuilles d'Ikok prédécoupées", "unit": "tas", "prix": "100", "category": "Légumes" },
            { "name": "morue fumée", "unit": "tas", "prix": "100", "category": "Poisson" },
            { "name": "cubes Maggi crevette", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "Okok découpé", "unit": "", "prix": "100", "category": "Légumes" },
            { "name": "noix de palme", "unit": "", "prix": "100", "category": "Fruits" },
            { "name": "sucre", "unit": "", "prix": "100", "category": "Épicerie" },
            { "name": "poisson", "unit": "kg", "prix": "100", "category": "Poisson" },
            { "name": "ésèsè", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "pèbè", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "plantains mûrs", "unit": "doigts", "prix": "100", "category": "Fruits" },
            { "name": "pommes de terre", "unit": "kg", "prix": "100", "category": "Légumes" },
            { "name": "farine", "unit": "g", "prix": "100", "category": "Épicerie" },
            { "name": "levure", "unit": "sachet", "prix": "100", "category": "Épicerie" },
            { "name": "beurre", "unit": "g", "prix": "100", "category": "Laitiers" },
            { "name": "œufs", "unit": "", "prix": "100", "category": "Autres" }
        ];
        setAvailableIngredients(mockIngredients);
      } catch (err) {
        console.error("Error fetching available ingredients:", err);
        toast.error("Erreur lors du chargement des ingrédients disponibles.");
      }
    };
    fetchIngredients();
  }, []);


  useEffect(() => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Le nom du plat est requis.';
    if (!prepTime || isNaN(parseInt(prepTime)) || parseInt(prepTime) <= 0) newErrors.prepTime = 'Veuillez entrer un temps de préparation valide.';
    if (!servings || isNaN(parseInt(servings)) || parseInt(servings) <= 0) newErrors.servings = 'Veuillez entrer un nombre de portions valide.';
    if (ingredients.some(ing => !ing.name.trim() || !ing.quantity || !ing.prix || !ing.unit || !ing.category)) {
      newErrors.ingredients = 'Tous les champs des ingrédients doivent être remplis.';
    }
    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0);
  }, [name, prepTime, servings, ingredients]);

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;

    // If ingredient name changes, try to pre-fill other fields from availableIngredients
    if (field === 'name') {
      const selectedIngredient = availableIngredients.find(ing => ing.name.toLowerCase() === value.toLowerCase());
      if (selectedIngredient) {
        newIngredients[index].unit = selectedIngredient.unit || '';
        newIngredients[index].prix = selectedIngredient.prix || '';
        newIngredients[index].category = selectedIngredient.category || '';
      }
    }
    setIngredients(newIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', prix: '', unit: '', category: '' }]);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleDietaryRestrictionChange = (restriction) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter((r) => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors({ ...errors, image: 'L\'image ne doit pas dépasser 2 Mo.' });
        setImage(null);
        setImagePreview('');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(file);
        setImagePreview(reader.result);
        setErrors({ ...errors, image: '' });
      };
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      setImagePreview('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setErrors({});

    try {
      let imageBase64 = imagePreview;
      if (image) {
        imageBase64 = imagePreview; // imagePreview contient déjà la chaîne Base64
      }

      // Convert aliases string to array, filtering out empty strings
      const aliasesArray = aliases.split(',').map(alias => alias.trim()).filter(alias => alias !== '');

      const dishData = {
        name: name.trim(),
        aliases: aliasesArray, // Save aliases as an array
        ingredients,
        dietaryRestrictions,
        prepTime: parseInt(prepTime),
        servings: parseInt(servings),
        image: imageBase64 || '',
        ownerId: auth.currentUser.uid,
        ownerName: auth.currentUser.displayName || auth.currentUser.email, // Add owner name for sharing
        createdAt: new Date(),
      };

      if (isNew) {
        const dishesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
        const docRef = await addDoc(dishesCollectionRef, dishData);
        onSave({ ...dishData, id: docRef.id });
      } else {
        const dishDocRef = doc(db, 'users', auth.currentUser.uid, 'dishes', dish.id);
        await updateDoc(dishDocRef, dishData);
        onSave({ ...dishData, id: dish.id });
      }
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du plat:', err);
      setErrors({ general: 'Échec de l\'enregistrement. Veuillez réessayer.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container dish-form">
      <h2>{isNew ? 'Ajouter un Plat' : 'Modifier le Plat'}</h2>
      {errors.general && <div className="error-message">{errors.general}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Informations du Plat</h3>
          <div className="form-group">
            <label htmlFor="dishName">
              Nom du Plat <span className="required">*</span>
              <span className="tooltip">
                <FaInfoCircle />
                <span className="tooltip-text">Entrez le nom principal du plat.</span>
              </span>
            </label>
            <input
              type="text"
              id="dishName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>

          {/* New Alias Field */}
          <div className="form-group">
            <label htmlFor="dishAliases">
              Alias (noms alternatifs)
              <span className="tooltip">
                <FaInfoCircle />
                <span className="tooltip-text">Entrez des noms alternatifs séparés par des virgules (ex: "Riz, Riz simple").</span>
              </span>
            </label>
            <input
              type="text"
              id="dishAliases"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="Ex: Riz, Riz simple"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prepTime">
              Temps de Préparation (minutes) <span className="required">*</span>
            </label>
            <input
              type="number"
              id="prepTime"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              min="1"
              required
              className={errors.prepTime ? 'input-error' : ''}
            />
            {errors.prepTime && <div className="error-message">{errors.prepTime}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="servings">
              Nombre de Portions <span className="required">*</span>
            </label>
            <input
              type="number"
              id="servings"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              min="1"
              required
              className={errors.servings ? 'input-error' : ''}
            />
            {errors.servings && <div className="error-message">{errors.servings}</div>}
          </div>
        </div>

        <div className="form-section">
          <h3>Ingrédients</h3>
          {ingredients.map((ingredient, index) => (
            <div key={index} className="form-group ingredient-group">
              <input
                type="text"
                placeholder="Nom de l'ingrédient"
                value={ingredient.name}
                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                list={`ingredient-names-${index}`} // Link to datalist
                required
              />
              <datalist id={`ingredient-names-${index}`}>
                {availableIngredients
                  .filter(item => item.name.toLowerCase().includes(ingredient.name.toLowerCase()))
                  .map((item, i) => (
                    <option key={i} value={item.name} />
                  ))}
              </datalist>

              <input
                type="text"
                placeholder="Quantité"
                value={ingredient.quantity}
                onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Prix Unitaire"
                value={ingredient.prix}
                onChange={(e) => handleIngredientChange(index, 'prix', e.target.value)}
                required
              />
              <select
                value={ingredient.unit}
                onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                required
              >
                <option value="">Unité</option>
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <select
                value={ingredient.category}
                onChange={(e) => handleIngredientChange(index, 'category', e.target.value)}
                required
              >
                <option value="">Catégorie</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {ingredients.length > 1 && (
                <button type="button" className="delete-btn" onClick={() => removeIngredient(index)}>
                  Supprimer
                </button>
              )}
            </div>
          ))}
          {errors.ingredients && <div className="error-message">{errors.ingredients}</div>}
          <button type="button" className="btn-secondary" onClick={addIngredient}>
            Ajouter un Ingrédient
          </button>
        </div>

        <div className="form-section">
          <h3>Restrictions Alimentaires</h3>
          <div className="checkbox-group">
            {medicalConditionsList.map((restriction) => (
              <label key={restriction} className="checkbox-label">
                <input
                  type="checkbox"
                  value={restriction}
                  checked={dietaryRestrictions.includes(restriction)}
                  onChange={() => handleDietaryRestrictionChange(restriction)}
                />
                <span className="checkbox-custom"></span>
                {restriction}
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>Image du Plat</h3>
          <div className="form-group">
            <label htmlFor="dishImage">
              Image (optionnel)
              <span className="tooltip">
                <FaInfoCircle />
                <span className="tooltip-text">Image de 2 Mo maximum.</span>
              </span>
            </label>
            <div className="file-input-wrapper">
              <label htmlFor="dishImage" className="custom-file-upload">
                Choisir une image
              </label>
              <input
                type="file"
                id="dishImage"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Aperçu" className="profile-pic-preview" />
              )}
            </div>
            {errors.image && <div className="error-message">{errors.image}</div>}
          </div>
        </div>

        <div className="button-group">
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !isFormValid}
          >
            {loading ? 'Enregistrement...' : isNew ? 'Ajouter le Plat' : 'Sauvegarder'}
          </button>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default DishForm;
