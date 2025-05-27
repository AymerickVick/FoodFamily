import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ingredients from './ingredients.json' assert { type: 'json' }; // Import JSON des ingrédients

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

// Fonction pour importer les ingrédients
async function importIngredients() {
  try {
    // Ciblez la collection 'publicIngredients' pour les ingrédients publics
    const publicIngredientsCollection = collection(db, 'publicIngredients');

    for (const ingredient of ingredients) {
      // Pour éviter les doublons si vous exécutez le script plusieurs fois,
      // vous pourriez vouloir vérifier si l'ingrédient existe déjà par son nom
      // avant de l'ajouter. Pour cet exemple simple, nous ajoutons directement.
      await addDoc(publicIngredientsCollection, {
        name: ingredient.name,
        unit: ingredient.unit,
        prix: ingredient.prix,
        category: ingredient.category,
        isPublic: true, // Indique que cet ingrédient est public
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`Ingrédient "${ingredient.name}" ajouté avec succès à la collection publique.`);
    }
    console.log('Importation des ingrédients publics terminée.');
  } catch (error) {
    console.error('Erreur lors de l\'importation des ingrédients publics :', error);
  }
}

// Exécuter l'importation
importIngredients();
