import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import recipes from './recipes.json' assert { type: 'json' }; // Import JSON avec assertion

// Configuration Firebase (remplacez par vos propres informations)
const firebaseConfig = {
  apiKey: "AIzaSyAJxkL3eaH14IhAlmrA-U4pZgo_RzxIWAw",
  authDomain: "familly-d600e.firebaseapp.com",
  projectId: "familly-d600e",
  storageBucket: "familly-d600e.firebasestorage.app",
  messagingSenderId: "803469541794",
  appId: "1:803469541794:web:a71eeb230b4883b81ef2fb",
  measurementId: "G-FQZ4E8T0WB"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fonction pour importer les recettes
async function importRecipes() {
  try {
    // Ciblez la collection 'publicDishes' pour les plats publics
    const publicDishesCollection = collection(db, 'publicDishes');

    for (const recipe of recipes) {
      await addDoc(publicDishesCollection, {
        ...recipe,
        // Ajoutez des champs spécifiques pour les plats publics
        ownerId: 'admin_import', // Un ID générique pour l'importation, ou un ID d'utilisateur si vous le souhaitez
        ownerName: 'Importation Publique', // Un nom générique pour l'importation
        isPublic: true, // Indique que ce plat est public
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`Recette "${recipe.name}" ajoutée avec succès à la collection publique.`);
    }
    console.log('Importation des recettes publiques terminée.');
  } catch (error) {
    console.error('Erreur lors de l\'importation des recettes publiques :', error);
  }
}

// Exécuter l'importation
importRecipes();
