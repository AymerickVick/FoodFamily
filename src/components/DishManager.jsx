import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { FaUtensils, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const DishManager = () => {
  const [dishes, setDishes] = useState([]);
  const [newDish, setNewDish] = useState({
    name: '',
    ingredients: [{ name: '', quantity: '',prix: '', unit: '' }],
    instructions: '',
    servings: 4,
    dietaryRestrictions: [],
    prepTime: '',
    cookTime: '',
    cuisine: 'Camerounaise',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const restrictionsOptions = ['Sans gluten', 'Sans lactose', 'Végétarien', 'Végan', 'Sans arachides'];

  useEffect(() => {
    if (!auth.currentUser) return;
    const dishesRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
    const unsubscribe = onSnapshot(dishesRef, (snapshot) => {
      const dishesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setDishes(dishesData);
    }, (err) => setError('Erreur lors du chargement des plats.'));
    return () => unsubscribe();
  }, []);

  const handleAddIngredient = () => {
    setNewDish({
      ...newDish,
      ingredients: [...newDish.ingredients, { name: '', quantity: '',prix: '', unit: '' }],
    });
  };

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...newDish.ingredients];
    updatedIngredients[index][field] = value;
    setNewDish({ ...newDish, ingredients: updatedIngredients });
  };

  const handleRemoveIngredient = (index) => {
    setNewDish({
      ...newDish,
      ingredients: newDish.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDish.name || !newDish.instructions || newDish.ingredients.some(ing => !ing.name)) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    try {
      const dishesRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
      if (editingId) {
        const dishDoc = doc(dishesRef, editingId);
        await updateDoc(dishDoc, newDish);
        toast.success('Plat mis à jour avec succès !');
        setEditingId(null);
      } else {
        await addDoc(dishesRef, newDish);
        toast.success('Plat ajouté avec succès !');
      }
      setNewDish({
        name: '',
        ingredients: [{ name: '', quantity: '',prix: '', unit: '' }],
        instructions: '',
        servings: 4,
        dietaryRestrictions: [],
        prepTime: '',
        cookTime: '',
        cuisine: 'Camerounaise',
      });
      setError('');
    } catch (err) {
      setError('Erreur lors de la sauvegarde du plat.');
    }
  };

  const handleEdit = (dish) => {
    setNewDish(dish);
    setEditingId(dish.id);
  };

  const handleDelete = async (id) => {
    try {
      const dishDoc = doc(db, 'users', auth.currentUser.uid, 'dishes', id);
      await deleteDoc(dishDoc);
      toast.success('Plat supprimé avec succès !');
    } catch (err) {
      setError('Erreur lors de la suppression du plat.');
    }
  };

  return (
    <section className="dish-manager p-6 bg-gray-100 min-h-screen">
      <div className="section-header flex items-center mb-6">
        <FaUtensils className="text-2xl text-green-600 mr-2" />
        <h2 className="text-2xl font-bold">Gestion des Plats</h2>
      </div>
      {error && (
        <div className="error-message bg-red-100 text-red-700 p-4 rounded mb-4 flex justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-700">
            <FaTrash />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md mb-6">
        <div className="mb-4">
          <label className="block text-gray-700">Nom du plat</label>
          <input
            type="text"
            value={newDish.name}
            onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Ingrédients</label>
          {newDish.ingredients.map((ingredient, index) => (
            <div key={index} className="flex mb-2">
              <input
                type="text"
                placeholder="Nom"
                value={ingredient.name}
                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                className="w-1/3 p-2 border rounded mr-2"
                required
              />
              <input
                type="text"
                placeholder="Quantité"
                value={ingredient.quantity}
                onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                className="w-1/4 p-2 border rounded mr-2"
              />
              <input
                type="text"
                placeholder="Prix Unitaire"
                value={ingredient.prix}
                onChange={(e) => handleIngredientChange(index, 'prix', e.target.value)}
                className="w-1/4 p-2 border rounded mr-2"
              />
              <input
                type="text"
                placeholder="Unité"
                value={ingredient.unit}
                onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                className="w-1/4 p-2 border rounded mr-2"
              />
              <button
                type="button"
                onClick={() => handleRemoveIngredient(index)}
                className="text-red-600"
              >
                <FaTrash />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddIngredient}
            className="text-green-600 flex items-center"
          >
            <FaPlus className="mr-1" /> Ajouter un ingrédient
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Instructions</label>
          <textarea
            value={newDish.instructions}
            onChange={(e) => setNewDish({ ...newDish, instructions: e.target.value })}
            className="w-full p-2 border rounded"
            rows="5"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Portions</label>
          <input
            type="number"
            value={newDish.servings}
            onChange={(e) => setNewDish({ ...newDish, servings: parseInt(e.target.value) })}
            className="w-full p-2 border rounded"
            min="1"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Restrictions alimentaires</label>
          {restrictionsOptions.map((option) => (
            <label key={option} className="inline-flex items-center mr-4">
              <input
                type="checkbox"
                checked={newDish.dietaryRestrictions.includes(option)}
                onChange={(e) => {
                  const updatedRestrictions = e.target.checked
                    ? [...newDish.dietaryRestrictions, option]
                    : newDish.dietaryRestrictions.filter((r) => r !== option);
                  setNewDish({ ...newDish, dietaryRestrictions: updatedRestrictions });
                }}
                className="mr-1"
              />
              {option}
            </label>
          ))}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Temps de préparation</label>
          <input
            type="text"
            value={newDish.prepTime}
            onChange={(e) => setNewDish({ ...newDish, prepTime: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Temps de cuisson</label>
          <input
            type="text"
            value={newDish.cookTime}
            onChange={(e) => setNewDish({ ...newDish, cookTime: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
        >
          {editingId ? 'Mettre à jour' : 'Ajouter'} le plat
        </button>
      </form>
      <div className="dishes-list">
        {dishes.map((dish) => (
          <div key={dish.id} className="bg-white p-4 rounded shadow-md mb-4 flex justify-between">
            <div>
              <h3 className="text-lg font-bold">{dish.name}</h3>
              <p><strong>Portions :</strong> {dish.servings}</p>
              <p><strong>Restrictions :</strong> {dish.dietaryRestrictions.join(', ')}</p>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => handleEdit(dish)}
                className="text-blue-600 mr-2"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDelete(dish.id)}
                className="text-red-600"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DishManager;