"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../firebase"
import { collection, onSnapshot, addDoc, doc, getDoc } from "firebase/firestore"
import { FaShare, FaDownload, FaUser, FaHeart, FaEye } from "react-icons/fa"

interface PublicRecipe {
  id: string
  name: string
  ingredients: any[]
  dietaryRestrictions: string[]
  prepTime: number
  servings: number
  authorName: string
  authorId: string
  isPublic: boolean
  likes: number
  views: number
  createdAt: any
}

const RecipeSharing = () => {
  const [publicRecipes, setPublicRecipes] = useState<PublicRecipe[]>([])
  const [myRecipes, setMyRecipes] = useState<any[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<PublicRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"browse" | "share">("browse")

  useEffect(() => {
    // Charger les recettes publiques
    const publicRecipesRef = collection(db, "publicRecipes")
    const unsubscribePublic = onSnapshot(publicRecipesRef, (snapshot) => {
      const recipes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as PublicRecipe)
      setPublicRecipes(recipes.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()))
    })

    // Charger mes recettes
    if (auth.currentUser) {
      const myRecipesRef = collection(db, "users", auth.currentUser.uid, "dishes")
      const unsubscribeMyRecipes = onSnapshot(myRecipesRef, (snapshot) => {
        const recipes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setMyRecipes(recipes)
        setLoading(false)
      })

      return () => {
        unsubscribePublic()
        unsubscribeMyRecipes()
      }
    }

    setLoading(false)
    return () => unsubscribePublic()
  }, [])

  const shareRecipe = async (recipeId: string) => {
    if (!auth.currentUser) return

    try {
      const recipe = myRecipes.find((r) => r.id === recipeId)
      if (!recipe) return

      // Obtenir le nom de l'utilisateur
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid))
      const authorName = userDoc.exists() ? userDoc.data().fullName : "Utilisateur anonyme"

      const publicRecipe = {
        ...recipe,
        authorName,
        authorId: auth.currentUser.uid,
        isPublic: true,
        likes: 0,
        views: 0,
        createdAt: new Date(),
        originalRecipeId: recipeId,
      }

      await addDoc(collection(db, "publicRecipes"), publicRecipe)
    } catch (err) {
      setError("Erreur lors du partage de la recette.")
    }
  }

  const importRecipe = async (publicRecipe: PublicRecipe) => {
    if (!auth.currentUser) return

    try {
      const importedRecipe = {
        name: `${publicRecipe.name} (importé)`,
        ingredients: publicRecipe.ingredients,
        dietaryRestrictions: publicRecipe.dietaryRestrictions,
        prepTime: publicRecipe.prepTime,
        servings: publicRecipe.servings,
        aliases: [publicRecipe.name],
        isImported: true,
        originalAuthor: publicRecipe.authorName,
        ownerId: auth.currentUser.uid,
        createdAt: new Date(),
      }

      const myRecipesRef = collection(db, "users", auth.currentUser.uid, "dishes")
      await addDoc(myRecipesRef, importedRecipe)

      // Incrémenter les vues
      // Note: Dans une vraie app, ceci devrait être fait côté serveur
    } catch (err) {
      setError("Erreur lors de l'importation de la recette.")
    }
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Chargement des recettes...</p>
      </div>
    )
  }

  return (
    <section className="recipe-sharing">
      <div className="section-header">
        <div className="section-icon">
          <FaShare />
        </div>
        <h2>Partage de Recettes</h2>
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === "browse" ? "active" : ""}`}
            onClick={() => setActiveTab("browse")}
          >
            Parcourir
          </button>
          <button className={`tab-btn ${activeTab === "share" ? "active" : ""}`} onClick={() => setActiveTab("share")}>
            Partager
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="error-close" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {activeTab === "browse" && (
        <div className="browse-recipes">
          <h3>Recettes de la communauté</h3>
          <div className="recipes-grid">
            {publicRecipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-header">
                  <h4>{recipe.name}</h4>
                  <div className="recipe-stats">
                    <span>
                      <FaHeart /> {recipe.likes}
                    </span>
                    <span>
                      <FaEye /> {recipe.views}
                    </span>
                  </div>
                </div>
                <div className="recipe-info">
                  <p>
                    <FaUser /> Par {recipe.authorName}
                  </p>
                  <p>
                    {recipe.prepTime} min • {recipe.servings} portions
                  </p>
                  <p>{recipe.ingredients.length} ingrédients</p>
                  {recipe.dietaryRestrictions.length > 0 && (
                    <div className="restrictions">
                      {recipe.dietaryRestrictions.map((restriction, index) => (
                        <span key={index} className="restriction-tag">
                          {restriction}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="recipe-actions">
                  <button className="btn-secondary btn-sm" onClick={() => setSelectedRecipe(recipe)}>
                    Voir détails
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => importRecipe(recipe)}>
                    <FaDownload /> Importer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "share" && (
        <div className="share-recipes">
          <h3>Partager mes recettes</h3>
          <div className="my-recipes-grid">
            {myRecipes.map((recipe) => (
              <div key={recipe.id} className="my-recipe-card">
                <div className="recipe-info">
                  <h4>{recipe.name}</h4>
                  <p>
                    {recipe.prepTime} min • {recipe.servings} portions
                  </p>
                  <p>{recipe.ingredients.length} ingrédients</p>
                </div>
                <div className="recipe-actions">
                  <button className="btn-primary btn-sm" onClick={() => shareRecipe(recipe.id)}>
                    <FaShare /> Partager
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de détails de recette */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecipe.name}</h2>
              <button className="modal-close-btn" onClick={() => setSelectedRecipe(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="recipe-details">
                <div className="author-info">
                  <p>
                    <FaUser /> Par {selectedRecipe.authorName}
                  </p>
                  <div className="recipe-stats">
                    <span>
                      <FaHeart /> {selectedRecipe.likes} likes
                    </span>
                    <span>
                      <FaEye /> {selectedRecipe.views} vues
                    </span>
                  </div>
                </div>

                <div className="recipe-meta">
                  <p>
                    <strong>Temps de préparation:</strong> {selectedRecipe.prepTime} minutes
                  </p>
                  <p>
                    <strong>Portions:</strong> {selectedRecipe.servings}
                  </p>
                </div>

                {selectedRecipe.dietaryRestrictions.length > 0 && (
                  <div className="restrictions-section">
                    <h4>Restrictions alimentaires</h4>
                    <div className="restrictions">
                      {selectedRecipe.dietaryRestrictions.map((restriction, index) => (
                        <span key={index} className="restriction-tag">
                          {restriction}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ingredients-section">
                  <h4>Ingrédients</h4>
                  <ul className="ingredients-list">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="ingredient-item">
                        <span className="ingredient-name">{ingredient.name}</span>
                        <span className="ingredient-quantity">
                          {ingredient.quantity} {ingredient.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      importRecipe(selectedRecipe)
                      setSelectedRecipe(null)
                    }}
                  >
                    <FaDownload /> Importer cette recette
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default RecipeSharing
