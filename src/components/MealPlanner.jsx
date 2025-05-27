"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../firebase"
import { collection, setDoc, doc, onSnapshot, getDocs, updateDoc } from "firebase/firestore"
import {
  FaCalendarAlt,
  FaTimes,
  FaUtensils,
  FaInfoCircle,
  FaClock,
  FaUsers,
  FaEnvelope,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCheckSquare, // New icon for confirm meal
} from "react-icons/fa"
import { toast } from 'react-toastify';

const MealPlanner = ({ familyMembers }) => {
  const [weeklyPlan, setWeeklyPlan] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  })
  const [dishes, setDishes] = useState([])
  const [stockItems, setStockItems] = useState([]); // New state for stock items
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedDish, setSelectedDish] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [confirmLoading, setConfirmLoading] = useState(false); // New state for confirm meal loading

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Helper to get today's day name
  const getTodayDayName = () => {
    const date = new Date();
    const options = { weekday: 'long' };
    return date.toLocaleDateString('en-US', options); // Returns "Monday", "Tuesday", etc.
  };

  const todayDay = getTodayDayName();

  // Calculer les restrictions alimentaires de tous les membres
  const familyMemberRestrictions = [
    ...new Set(familyMembers.flatMap((member) => member.medicalConditions?.filter((cond) => cond !== "Aucun") || [])),
  ]

  // Filtrer les plats compatibles avec les restrictions de la famille
  const compatibleMeals = dishes.filter((dish) => {
    if (familyMemberRestrictions.length === 0) {
      return true // Aucun filtrage si pas de restrictions
    }
    // Un plat est compatible si toutes les restrictions sont incluses
    return familyMemberRestrictions.every((restriction) => dish.dietaryRestrictions?.includes(restriction))
  })

  // Récupérer les recettes (dishes) depuis Firestore (private dishes)
  useEffect(() => {
    if (!auth.currentUser) return;
    const dishesCollectionRef = collection(db, 'users', auth.currentUser.uid, 'dishes');
    const unsubscribe = onSnapshot(dishesCollectionRef, (snapshot) => {
      const dishesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDishes(dishesList);
    }, (err) => {
      console.error("Error fetching dishes for meal planner:", err);
    });
    return () => unsubscribe();
  }, []);

  // Récupérer le stock depuis Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const stockCollectionRef = collection(db, 'users', auth.currentUser.uid, 'stock');
    const unsubscribe = onSnapshot(stockCollectionRef, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expirationDate: doc.data().expirationDate?.toDate ? doc.data().expirationDate.toDate().toISOString().split('T')[0] : doc.data().expirationDate,
      }));
      setStockItems(itemsList);
    }, (err) => {
      console.error("Error fetching stock for meal planner:", err);
    });
    return () => unsubscribe();
  }, []);


  // Récupérer le plan hebdomadaire
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false)
      return
    }
    const planCollectionRef = collection(db, "users", auth.currentUser.uid, "weeklyPlan")
    const unsubscribe = onSnapshot(
      planCollectionRef,
      (snapshot) => {
        const planData = {}
        days.forEach((day) => (planData[day] = []))
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (days.includes(data.day)) {
            planData[data.day] = data.dishes || []
          }
        })
        setWeeklyPlan(planData)
        setLoading(false)
      },
      (err) => {
        setError("Erreur lors du chargement du plan.")
        setLoading(false)
        console.error(err)
      },
    )
    return () => unsubscribe()
  }, []);

  // Function to calculate adjusted servings based on family members
  const calculateAdjustedServings = (dishServings) => {
    if (!familyMembers || familyMembers.length === 0) {
      return dishServings; // Default to dish's servings if no family members
    }

    let totalAdjustedUnits = 0;
    familyMembers.forEach(member => {
      if (member.age >= 12) {
        totalAdjustedUnits += 1; // Adult
      } else {
        totalAdjustedUnits += 0.75; // Child
      }
    });
    return totalAdjustedUnits;
  };

  // Function to confirm meals for a specific day and update stock
  const handleConfirmMealsForDay = async (day) => {
    setConfirmLoading(true);
    setError('');
    const mealsForDay = weeklyPlan[day];

    if (mealsForDay.length === 0) {
      toast.info(`Aucun repas planifié pour ${day}.`);
      setConfirmLoading(false);
      return;
    }

    try {
      const stockUpdates = {}; // Map to accumulate ingredient quantities needed

      for (const dishId of mealsForDay) {
        const dish = dishes.find(d => d.id === dishId);
        if (dish && dish.ingredients) {
          const adjustedServings = calculateAdjustedServings(dish.servings);
          const scalingFactor = adjustedServings / dish.servings;

          dish.ingredients.forEach(ingredient => {
            const normalizedName = ingredient.name.trim().toLowerCase();
            const normalizedUnit = ingredient.unit ? ingredient.unit.trim().toLowerCase() : '';
            const key = `${normalizedName}-${normalizedUnit}`;

            const requiredQuantity = (parseFloat(ingredient.quantity) || 0) * scalingFactor;

            if (stockUpdates[key]) {
              stockUpdates[key].quantityNeeded += requiredQuantity;
            } else {
              stockUpdates[key] = {
                name: ingredient.name,
                unit: ingredient.unit,
                category: ingredient.category,
                quantityNeeded: requiredQuantity,
              };
            }
          });
        }
      }

      const batchUpdates = [];
      for (const key in stockUpdates) {
        const { name, unit, category, quantityNeeded } = stockUpdates[key];
        const existingStockItem = stockItems.find(item =>
          item.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          item.unit.trim().toLowerCase() === unit.trim().toLowerCase()
        );

        if (existingStockItem) {
          const newQuantity = existingStockItem.quantity - quantityNeeded;
          const itemDocRef = doc(db, 'users', auth.currentUser.uid, 'stock', existingStockItem.id);
          batchUpdates.push(updateDoc(itemDocRef, { quantity: Math.max(0, newQuantity) }));
          // If quantity becomes 0 or less, consider removing from stock or flagging
          if (newQuantity <= 0) {
            toast.warn(`Le stock de ${name} est épuisé.`);
          }
        } else {
          toast.warn(`L'ingrédient "${name}" n'est pas en stock. Il sera ajouté à la liste de courses.`);
          // This ingredient will be handled by the shopping list logic
        }
      }

      await Promise.all(batchUpdates);
      toast.success(`Repas du ${day} confirmés et stock mis à jour !`);
    } catch (err) {
      setError('Erreur lors de la confirmation des repas et de la mise à jour du stock.');
      console.error("Error confirming meals:", err);
      toast.error('Échec de la confirmation des repas.');
    } finally {
      setConfirmLoading(false);
    }
  };


  // Fonction pour envoyer le planning par email
  const handleSendMealPlanEmails = async () => {
    // Vérifications préliminaires
    if (!familyMembers || familyMembers.length === 0) {
      setEmailError("Aucun membre de famille trouvé.")
      return
    }

    // Vérifier qu'il y a au moins un plat dans le planning
    const hasAnyDish = days.some((day) => weeklyPlan[day].length > 0)
    if (!hasAnyDish) {
      setEmailError("Le planning est vide. Ajoutez au moins un plat avant d'envoyer.")
      return
    }

    // Vérifier que les membres ont des emails
    const membersWithEmail = familyMembers.filter((member) => member.email && member.email.trim() !== "")
    if (membersWithEmail.length === 0) {
      setEmailError("Aucun membre n'a d'adresse email configurée.")
      return
    }

    setEmailLoading(true)
    setEmailError("")
    setEmailSuccess(false)

    try {
      // Préparer le plan de repas avec les noms des plats
      const mealPlanWithNames = {}
      days.forEach((day) => {
        const dayLower = day.toLowerCase()
        if (weeklyPlan[day].length > 0) {
          // Prendre le premier plat du jour (ou vous pouvez modifier pour prendre tous)
          const firstDishId = weeklyPlan[day][0]
          const dish = dishes.find((d) => d.id === firstDishId)
          mealPlanWithNames[dayLower] = dish ? dish.name : "Plat non trouvé"
        } else {
          mealPlanWithNames[dayLower] = "Aucun plat"
        }
      })

      // Préparer les données pour l'API
      const requestData = {
        userId: auth.currentUser.uid,
        members: membersWithEmail.map((member) => ({
          id: member.id,
          email: member.email,
          fullName: member.fullName,
          age: member.age,
        })),
        mealPlan: mealPlanWithNames,
      }

      console.log("Envoi des données:", requestData)

      // Appeler l'API backend
      const response = await fetch("http://localhost:3001/send-meal-plan-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'envoi des emails")
      }

      setEmailSuccess(true)
      console.log("Emails envoyés avec succès:", result)

      // Masquer le message de succès après 5 secondes
      setTimeout(() => {
        setEmailSuccess(false)
      }, 5000)
    } catch (err) {
      console.error("Erreur lors de l'envoi des emails:", err)
      setEmailError(err.message || "Erreur lors de l'envoi des emails")
    } finally {
      setEmailLoading(false)
    }
  }

  const handleAddDishToDay = async (day, dishId) => {
    if (!dishId) {
      return
    }
    try {
      const dayDocRef = doc(db, "users", auth.currentUser.uid, "weeklyPlan", day)
      await setDoc(
        dayDocRef,
        {
          day,
          dishes: [...weeklyPlan[day], dishId],
        },
        { merge: true },
      )
    } catch (err) {
      setError("Erreur lors de l'ajout du plat au plan.")
      console.error(err)
    }
  }

  const handleRemoveDishFromDay = async (day, dishId) => {
    try {
      const dayDocRef = doc(db, "users", auth.currentUser.uid, "weeklyPlan", day)
      await setDoc(
        dayDocRef,
        {
          day,
          dishes: weeklyPlan[day].filter((id) => id !== dishId),
        },
        { merge: true },
      )
    } catch (err) {
      setError("Erreur lors de la suppression du plat du plan.")
      console.error(err)
    }
  }

  const handleShowDetails = (dish) => {
    setSelectedDish(dish)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedDish(null)
  }

  const DishDetailsModal = ({ dish, onClose }) => {
    if (!dish) return null

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{dish.name}</h2>
            <button className="modal-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          <div className="modal-body">
            {dish.image && (
              <div className="dish-image-container">
                <img src={dish.image || "/placeholder.svg"} alt={dish.name} className="dish-image" />
              </div>
            )}

            <div className="dish-info-grid">
              <div className="info-section">
                <h3>
                  <FaClock /> Informations générales
                </h3>
                <div className="info-item">
                  <span className="label">Catégorie:</span>
                  <span className="value">{dish.category || "Non spécifiée"}</span>
                </div>
                <div className="info-item">
                  <span className="label">Portions:</span>
                  <span className="value">
                    <FaUsers /> {dish.servings || "Non spécifié"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Temps de préparation:</span>
                  <span className="value">{dish.prepTime || "Non spécifié"}</span>
                </div>
                <div className="info-item">
                  <span className="label">Temps de cuisson:</span>
                  <span className="value">{dish.cookTime || "Non spécifié"}</span>
                </div>
              </div>

              {dish.dietaryRestrictions && dish.dietaryRestrictions.length > 0 && (
                <div className="info-section">
                  <h3>Restrictions alimentaires</h3>
                  <div className="dietary-restrictions">
                    {dish.dietaryRestrictions.map((restriction, index) => (
                      <span key={index} className="restriction-tag">
                        {restriction}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dish.ingredients && dish.ingredients.length > 0 && (
                <div className="info-section">
                  <h3>Ingrédients</h3>
                  <ul className="ingredients-list">
                    {dish.ingredients.map((ingredient, index) => (
                      <li key={index} className="ingredient-item">
                        <span className="ingredient-name">{ingredient.name}</span>
                        {ingredient.quantity && (
                          <span className="ingredient-quantity">
                            {ingredient.quantity} {ingredient.unit}
                          </span>
                        )}
                        <span className="ingredient-quantity">{ingredient.prix} F</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dish.preparation && dish.preparation.length > 0 && (
                <div className="info-section full-width">
                  <h3>Préparation</h3>
                  <ol className="preparation-steps">
                    {dish.preparation.map((step, index) => (
                      <li key={index} className="preparation-step">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {dish.accompaniments && dish.accompaniments.length > 0 && (
                <div className="info-section">
                  <h3>Accompagnements suggérés</h3>
                  <div className="accompaniments">
                    {dish.accompaniments.map((accompaniment, index) => (
                      <span key={index} className="accompaniment-tag">
                        {accompaniment}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Chargement du plan...</p>
      </div>
    )
  }

  return (
    <section className="meal-planner">
      <div className="section-header">
        <div className="section-icon">
          <FaCalendarAlt />
        </div>
        <h2>Planification des Repas</h2>

        {/* Bouton d'envoi du planning */}
        <div className="header-actions">
          <button
            className={`btn-primary ${emailLoading ? "loading" : ""}`}
            onClick={handleSendMealPlanEmails}
            disabled={emailLoading}
            title="Envoyer le planning par email à tous les membres de la famille"
          >
            {emailLoading ? (
              <>
                <div className="spinner"></div>
                Envoi en cours...
              </>
            ) : (
              <>
                <FaPaperPlane />
                Envoyer le Planning
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages d'état pour l'envoi d'emails */}
      {emailSuccess && (
        <div className="success-message">
          <FaCheckCircle />
          <span>Planning envoyé avec succès à tous les membres !</span>
          <button className="error-close" onClick={() => setEmailSuccess(false)}>
            <FaTimes />
          </button>
        </div>
      )}

      {emailError && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{emailError}</span>
          <button className="error-close" onClick={() => setEmailError("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button className="error-close" onClick={() => setError("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* Informations sur les membres qui recevront l'email */}
      {familyMembers && familyMembers.length > 0 && (
        <div className="email-recipients-info">
          <div className="recipients-header">
            <FaEnvelope />
            <span>
              Destinataires ({familyMembers.filter((m) => m.email).length}/{familyMembers.length})
            </span>
          </div>
          <div className="recipients-list">
            {familyMembers.map((member) => (
              <div key={member.id} className={`recipient-item ${member.email ? "has-email" : "no-email"}`}>
                <span className="recipient-name">{member.fullName}</span>
                {member.email ? (
                  <span className="recipient-email">{member.email}</span>
                ) : (
                  <span className="no-email-text">Pas d'email</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="weekly-plan">
        {days.map((day) => (
          <div key={day} className="day-plan">
            <h3>{day}</h3>
            {day === todayDay && ( // Only show confirm button for today's meals
                <div className="confirm-meals-today">
                  <button
                    className={`btn-secondary ${confirmLoading ? 'loading' : ''}`}
                    onClick={() => handleConfirmMealsForDay(day)}
                    disabled={confirmLoading || weeklyPlan[day].length === 0}
                    title="Confirmer les repas d'aujourd'hui et mettre à jour le stock"
                  >
                    {confirmLoading ? (
                      <>
                        <div className="spinner"></div>
                        Confirmation...
                      </>
                    ) : (
                      <>
                        <FaCheckSquare />
                        Confirmer les repas
                      </>
                    )}
                  </button>
                </div>
            )}
            <div className="dish-list">
              {weeklyPlan[day].map((dishId, index) => {
                const dish = dishes.find((d) => d.id === dishId)
                return dish ? (
                  <div key={`${dishId}-${index}`} className="member-card">
                    {dish.image ? (
                      <img src={dish.image || "/placeholder.svg"} alt={dish.name} className="profile-pic-preview" />
                    ) : (
                      <div className="avatar-placeholder">
                        <FaUtensils />
                      </div>
                    )}
                    <div className="member-info">
                      <h4>{dish.name}</h4>
                      <p>
                        <strong>Portions :</strong> {dish.servings}
                      </p>
                    </div>
                    <div className="dish-actions">
                      <button className="detail-btn" onClick={() => handleShowDetails(dish)} title="Voir les détails">
                        <FaInfoCircle />
                        Détail
                      </button>
                      <button className="delete-btn" onClick={() => handleRemoveDishFromDay(day, dishId)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : null
              })}
            </div>
            <select onChange={(e) => handleAddDishToDay(day, e.target.value)} value="">
              <option value="">Ajouter un plat compatible</option>
              {compatibleMeals.length > 0 ? (
                compatibleMeals.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name}
                  </option>
                ))
              ) : (
                <option disabled>Aucun plat compatible</option>
              )}
            </select>
          </div>
        ))}
      </div>

      {showModal && <DishDetailsModal dish={selectedDish} onClose={handleCloseModal} />}
    </section>
  )
}

export default MealPlanner
