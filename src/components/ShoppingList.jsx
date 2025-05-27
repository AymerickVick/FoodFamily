"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../firebase"
import { collection, onSnapshot, getDoc, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore" // Added addDoc
import { FaShoppingBasket, FaTimes, FaFileDownload, FaCheck, FaPlus, FaCalendarTimes, FaExclamationTriangle } from "react-icons/fa"
import jsPDF from "jspdf"
import { toast } from 'react-toastify';

// Assurez-vous que familyMembers est passé en tant que prop depuis le composant parent (ex: App.jsx ou FamilyDashboard)
const ShoppingList = ({ familyMembers }) => {
  const [weeklyPlan, setWeeklyPlan] = useState({})
  const [shoppingList, setShoppingList] = useState([])
  const [expiringItems, setExpiringItems] = useState([]); // New state for expiring items
  const [checkedItems, setCheckedItems] = useState(new Set())
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [stockItems, setStockItems] = useState([]); // New state for stock items
  const [totalPrice, setTotalPrice] = useState(0); // New state for total price
  const [confirmPurchaseLoading, setConfirmPurchaseLoading] = useState(false); // New state for confirm purchase loading

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Fetch stock items
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
      console.error("Error fetching stock for shopping list:", err);
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false)
      return
    }
    const planCollectionRef = collection(db, "users", auth.currentUser.uid, "weeklyPlan")
    const unsubscribe = onSnapshot(
      planCollectionRef,
      async (snapshot) => {
        const planData = {}
        days.forEach((day) => (planData[day] = []))
        snapshot.forEach((doc) => {
          const data = doc.data()
          if (days.includes(data.day)) {
            planData[data.day] = data.dishes || []
          }
        })
        setWeeklyPlan(planData)

        // Generate shopping list based on plan and current stock
        const ingredientsNeededMap = {}
        const dishIds = Object.values(planData).flat()

        // First, aggregate all ingredients needed from planned dishes
        for (const dishId of dishIds) {
          try {
            const dishDoc = await getDoc(doc(db, "users", auth.currentUser.uid, "dishes", dishId)) // Fetch from user's private dishes
            if (dishDoc.exists()) {
              const dish = dishDoc.data()
              if (dish.ingredients) {
                dish.ingredients.forEach((ing) => {
                  const normalizedName = ing.name.trim().toLowerCase()
                  const normalizedUnit = ing.unit ? ing.unit.trim().toLowerCase() : ""
                  const key = `${normalizedName}-${normalizedUnit}`

                  const quantity = Number.parseFloat(ing.quantity) || 0;
                  const prix = Number.parseFloat(ing.prix) || 0; // Get price

                  if (ingredientsNeededMap[key]) {
                    ingredientsNeededMap[key].quantity += quantity;
                  } else {
                    ingredientsNeededMap[key] = {
                      name: ing.name.trim(),
                      quantity: quantity,
                      unit: ing.unit ? ing.unit.trim() : "",
                      category: ing.category || "Autres",
                      prix: prix, // Store price
                    }
                  }
                })
              }
            }
          } catch (err) {
            console.error("Erreur lors de la récupération du plat pour la liste de courses:", dishId, err)
          }
        }

        // Now, compare with stock and build the final shopping list
        const finalShoppingList = [];
        for (const key in ingredientsNeededMap) {
          const neededItem = ingredientsNeededMap[key];
          const existingStockItem = stockItems.find(item =>
            item.name.trim().toLowerCase() === neededItem.name.trim().toLowerCase() &&
            item.unit.trim().toLowerCase() === neededItem.unit.trim().toLowerCase()
          );

          if (existingStockItem) {
            const remainingNeeded = neededItem.quantity - existingStockItem.quantity;
            if (remainingNeeded > 0) {
              finalShoppingList.push({
                ...neededItem,
                quantity: remainingNeeded,
                id: key, // Use key as ID for shopping list items
              });
            }
          } else {
            finalShoppingList.push({
              ...neededItem,
              id: key, // Use key as ID for shopping list items
            });
          }
        }

        // Identify expiring items from stock
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiringSoon = stockItems.filter(item => {
          if (!item.expirationDate) return false;
          const expiry = new Date(item.expirationDate);
          expiry.setHours(0, 0, 0, 0);
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 5; // Expiring today or within 5 days
        }).map(item => ({ ...item, status: 'expiring-soon' })); // Add a status for styling

        // Handle expired items: remove from stock, add to shopping list with 'dispose' flag
        const expiredItems = stockItems.filter(item => {
          if (!item.expirationDate) return false;
          const expiry = new Date(item.expirationDate);
          expiry.setHours(0, 0, 0, 0);
          const diffTime = expiry.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays < 0; // Expired
        });

        for (const expiredItem of expiredItems) {
          // Remove from stock
          try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'stock', expiredItem.id));
            toast.info(`L'article expiré "${expiredItem.name}" a été retiré du stock.`);
          } catch (deleteErr) {
            console.error("Error deleting expired item from stock:", deleteErr);
          }

          // Add to shopping list with a "dispose" flag
          finalShoppingList.push({
            name: expiredItem.name,
            quantity: expiredItem.quantity,
            unit: expiredItem.unit,
            category: expiredItem.category,
            id: `expired-${expiredItem.id}`, // Unique ID for expired item
            dispose: true, // Flag to indicate it needs to be disposed
            message: `(Expiré - à jeter)`
          });
          toast.warn(`L'article "${expiredItem.name}" est expiré et doit être jeté.`);
        }


        setShoppingList(finalShoppingList);
        setExpiringItems(expiringSoon);
        setLoading(false);
      },
      (err) => {
        setError("Erreur lors du chargement de la liste de courses.")
        setLoading(false)
        console.error(err)
      },
    )
    return () => unsubscribe()
  }, [stockItems]); // Re-run when stockItems changes to update shopping list based on latest stock

  // Calculate total price whenever shoppingList, checkedItems, or familyMembers change
  useEffect(() => {
    const calculateTotalPrice = () => {
      let currentTotal = 0;
      const numFamilyMembers = familyMembers ? familyMembers.length : 1; // Default to 1 if no family members
      shoppingList.forEach(item => {
        if (!checkedItems.has(item.id) && !item.dispose) { // Only count unchecked items that are not for disposal
          currentTotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.prix) || 0) * numFamilyMembers;
        }
      });
      setTotalPrice(currentTotal);
    };
    calculateTotalPrice();
  }, [shoppingList, checkedItems, familyMembers]);


  const toggleItemCheck = (itemId) => {
    const newCheckedItems = new Set(checkedItems)
    if (newCheckedItems.has(itemId)) {
      newCheckedItems.delete(itemId)
    } else {
      newCheckedItems.add(itemId)
    }
    setCheckedItems(newCheckedItems)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    // En-tête avec style
    doc.setFontSize(20)
    doc.setTextColor(90, 103, 216)
    doc.text("Liste de Courses", 20, 25)

    // Date
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Générée le ${new Date().toLocaleDateString("fr-FR")}`, 20, 35)

    // Ligne de séparation
    doc.setDrawColor(226, 232, 240)
    doc.line(20, 40, 190, 40)

    let yOffset = 50
    const groupedIngredients = shoppingList.reduce((acc, ing) => {
      const category = ing.category || "Autres"
      acc[category] = acc[category] || []
      acc[category].push(ing)
      return acc
    }, {})

    Object.entries(groupedIngredients).forEach(([category, ingredients]) => {
      // Titre de catégorie
      doc.setFontSize(14)
      doc.setTextColor(30, 41, 59)
      doc.text(category, 20, yOffset)
      yOffset += 8

      // Ligne sous le titre
      doc.setDrawColor(241, 245, 249)
      doc.line(20, yOffset, 100, yOffset)
      yOffset += 5

      // Ingrédients
      doc.setFontSize(11)
      doc.setTextColor(71, 85, 105)
      ingredients.forEach((ing) => {
        const isChecked = checkedItems.has(ing.id)
        const checkmark = isChecked ? "✓ " : "☐ "
        doc.text(`${checkmark}${ing.name}: ${ing.quantity} ${ing.unit} ${ing.message || ''} (${ing.prix} F)`, 25, yOffset) // Added price to PDF
        yOffset += 6

        // Nouvelle page si nécessaire
        if (yOffset > 270) {
          doc.addPage()
          yOffset = 20
        }
      })
      yOffset += 8
    })

    // Add total price to PDF
    doc.setFontSize(16);
    doc.setTextColor(90, 103, 216);
    doc.text(`Prix total estimé: ${totalPrice.toFixed(2)} F`, 20, yOffset + 10);

    doc.save("liste_de_courses.pdf")
  }

  const exportToText = () => {
    const groupedIngredients = shoppingList.reduce((acc, ing) => {
      const category = ing.category || "Autres"
      acc[category] = acc[category] || []
      acc[category].push(ing)
      return acc
    }, {})

    let textContent = "🛒 LISTE DE COURSES\n"
    textContent += `📅 Générée le ${new Date().toLocaleDateString("fr-FR")}\n`
    textContent += "═".repeat(40) + "\n\n"

    Object.entries(groupedIngredients).forEach(([category, ingredients]) => {
      textContent += `📂 ${category.toUpperCase()}\n`
      textContent += "─".repeat(20) + "\n"
      ingredients.forEach((ing) => {
        const isChecked = checkedItems.has(ing.id)
        const checkmark = isChecked ? "✅" : "☐"
        textContent += `${checkmark} ${ing.name}: ${ing.quantity} ${ing.unit} ${ing.message || ''} (${ing.prix} F)\n` // Added price to text
      })
      textContent += "\n"
    })

    textContent += `Prix total estimé: ${totalPrice.toFixed(2)} F\n`; // Add total price to text export

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "liste_de_courses.txt"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const clearCheckedItems = () => {
    setCheckedItems(new Set())
  }

  const checkAllItems = () => {
    const allItemIds = shoppingList.map((item) => item.id)
    setCheckedItems(new Set(allItemIds))
  }

  const handleConfirmPurchases = async () => {
    setConfirmPurchaseLoading(true);
    setError("");

    try {
      const batchUpdates = [];
      const itemsToPurchase = shoppingList.filter(item => checkedItems.has(item.id) && !item.dispose);

      if (itemsToPurchase.length === 0) {
        toast.info("Aucun article coché pour l'achat.");
        setConfirmPurchaseLoading(false);
        return;
      }

      for (const item of itemsToPurchase) {
        const existingStockItem = stockItems.find(stock =>
          stock.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
          stock.unit.trim().toLowerCase() === item.unit.trim().toLowerCase()
        );

        if (existingStockItem) {
          // Update existing stock item
          const itemDocRef = doc(db, 'users', auth.currentUser.uid, 'stock', existingStockItem.id);
          batchUpdates.push(updateDoc(itemDocRef, {
            quantity: existingStockItem.quantity + item.quantity
          }));
        } else {
          // Add new stock item
          const stockCollectionRef = collection(db, 'users', auth.currentUser.uid, 'stock');
          batchUpdates.push(addDoc(stockCollectionRef, {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            expirationDate: null, // New items might not have an immediate expiry
            addedDate: new Date().toISOString().split('T')[0],
          }));
        }
      }

      await Promise.all(batchUpdates);

      // Remove purchased items from the shopping list UI and clear checked items
      setShoppingList(prevList => prevList.filter(item => !checkedItems.has(item.id) || item.dispose));
      setCheckedItems(new Set());
      toast.success("Achats confirmés et stock mis à jour !");

    } catch (err) {
      console.error("Error confirming purchases:", err);
      setError("Erreur lors de la confirmation des achats et de la mise à jour du stock.");
      toast.error("Échec de la confirmation des achats.");
    } finally {
      setConfirmPurchaseLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Chargement de la liste de courses...</p>
      </div>
    )
  }

  const groupedIngredients = shoppingList.reduce((acc, ing) => {
    const category = ing.category || "Autres"
    acc[category] = acc[category] || []
    acc[category].push(ing)
    return acc
  }, {})

  const checkedCount = checkedItems.size
  const totalCount = shoppingList.length
  const progressPercentage = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <section className="shopping-list-container">
      <div className="shopping-list-header">
        <div className="header-content">
          <div className="header-title">
            <div className="section-icon">
              <FaShoppingBasket />
            </div>
            <div className="title-info">
              <h2>Liste de Courses</h2>
              <p className="subtitle">
                {totalCount} article{totalCount > 1 ? "s" : ""} • {checkedCount} coché{checkedCount > 1 ? "s" : ""}
                <br />
                Prix total estimé: {totalPrice.toFixed(2)} F
              </p>
            </div>
          </div>

          <div className="header-actions">
            <div className="bulk-actions">
              <button className="btn-outline btn-sm" onClick={checkAllItems} disabled={totalCount === 0}>
                <FaCheck /> Tout cocher
              </button>
              <button className="btn-outline btn-sm" onClick={clearCheckedItems} disabled={checkedCount === 0}>
                <FaTimes /> Tout décocher
              </button>
            </div>

            <div className="export-buttons">
              <button className="btn-primary btn-sm" onClick={exportToPDF} disabled={totalCount === 0}>
                <FaFileDownload /> PDF
              </button>
              <button className="btn-secondary btn-sm" onClick={exportToText} disabled={totalCount === 0}>
                <FaFileDownload /> Texte
              </button>
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <span className="progress-text">{Math.round(progressPercentage)}% complété</span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button className="error-close" onClick={() => setError("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* Expiring Items Section */}
      {expiringItems.length > 0 && (
        <div className="expiring-items-section">
          <h3><FaExclamationTriangle /> Articles proches de la péremption</h3>
          <div className="members-grid"> {/* Reusing members-grid for card layout */}
            {expiringItems.map(item => (
              <div key={item.id} className="member-card stock-card warning">
                <div className="member-info">
                  <h4>{item.name}</h4>
                  <p><strong>Quantité:</strong> {item.quantity} {item.unit}</p>
                  <p><strong>Catégorie:</strong> {item.category}</p>
                  <p className="expiration-status warning">
                    <FaCalendarTimes /> Expire le {new Date(item.expirationDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shoppingList.length > 0 ? (
        <div className="shopping-list-content">
          <div className="categories-grid">
            {Object.entries(groupedIngredients).map(([category, ingredients]) => (
              <div key={category} className="category-card">
                <div className="category-header">
                  <h3 className="category-title">{category}</h3>
                  <span className="category-count">
                    {ingredients.filter((ing) => checkedItems.has(ing.id)).length}/{ingredients.length}
                  </span>
                </div>

                <div className="ingredients-list">
                  {ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      className={`ingredient-item ${checkedItems.has(ing.id) ? "checked" : ""} ${ing.dispose ? 'dispose-item' : ''}`}
                      onClick={() => toggleItemCheck(ing.id)}
                    >
                      <div className="ingredient-checkbox">
                        <div className="custom-checkbox">{checkedItems.has(ing.id) && <FaCheck />}</div>
                      </div>

                      <div className="ingredient-info">
                        <span className="ingredient-name">{ing.name} {ing.message && <span className="item-message">{ing.message}</span>}</span>
                        <span className="ingredient-quantity">
                          {ing.quantity} {ing.unit} ({ing.prix} F)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Confirm Purchases Button - Appears when all items are checked */}
          {checkedCount === totalCount && totalCount > 0 && (
            <div className="confirm-purchases-section mt-4 text-center p-4">
              <button
                className={`btn-primary ${confirmPurchaseLoading ? 'loading' : ''}`}
                onClick={handleConfirmPurchases}
                disabled={confirmPurchaseLoading}
              >
                {confirmPurchaseLoading ? (
                  <>
                    <div className="spinner"></div>
                    Confirmation...
                  </>
                ) : (
                  <>
                    <FaCheck /> Confirmer les achats
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <FaShoppingBasket />
          </div>
          <h3>Aucune liste de courses</h3>
          <p>Planifiez des repas pour générer automatiquement votre liste de courses.</p>
          <div className="empty-actions">
            <button className="btn-primary">
              <FaPlus /> Planifier des repas
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default ShoppingList
