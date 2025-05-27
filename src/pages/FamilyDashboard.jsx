"use client"

import { useState, useEffect } from "react"
import { auth, db } from "../firebase"
import { doc, getDoc, collection, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged, signOut } from "firebase/auth"
import FamilyMemberForm from "../components/FamilyMemberForm"
import DishList from "../components/DishList"
import MealPlanner from "../components/MealPlanner"
import ShoppingList from "../components/ShoppingList"
import Notifications from "../components/Notifications" // Assurez-vous que ce composant gère l'affichage des notifications
import StockManager from "../components/StockManager" // Import new StockManager
import DishCombiner from "../components/DishCombiner" // Import new DishCombiner
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import {
  FaUser,
  FaUsers,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaPlus,
  FaHome,
  FaChartBar,
  FaUtensils,
  FaCalendarAlt,
  FaShoppingBasket,
  FaHeart,
  FaUserCheck,
  FaBell,
  FaCog,
  FaEdit,
  FaTrash,
  FaBoxes, // Icon for Stock Manager
  FaPuzzlePiece, // Icon for Dish Combiner
} from "react-icons/fa"

const FamilyDashboard = () => {
  const navigate = useNavigate()
  const [currentUserProfile, setCurrentUserProfile] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [dishes, setDishes] = useState([]) // User's private dishes
  const [weeklyPlan, setWeeklyPlan] = useState({})
  const [stockItems, setStockItems] = useState([]); // New state for stock items
  const [editingMember, setEditingMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("members") // Default tab
  const [unreadNotifications, setUnreadNotifications] = useState([]); // Nouveau: État pour les notifications non lues
  const [showNotificationsModal, setShowNotificationsModal] = useState(false); // Nouveau: État pour afficher/masquer la modal de notifications

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setError("Vous devez être connecté pour accéder au tableau de bord.")
        navigate("/login")
      }
    })
    return () => unsubscribe()
  }, [navigate])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        setLoading(false)
        return
      }

      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid)
        const userDocSnap = await getDoc(userDocRef)
        if (userDocSnap.exists()) {
          setCurrentUserProfile({ id: userDocSnap.id, ...userDocSnap.data() })
        } else {
          setError("Profil principal introuvable.")
        }

        const familyMembersCollectionRef = collection(db, "users", auth.currentUser.uid, "familyMembers")
        const unsubscribeMembers = onSnapshot(
          familyMembersCollectionRef,
          (snapshot) => {
            const membersList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            setFamilyMembers(membersList)
          },
          (err) => {
            setError("Erreur lors du chargement des membres de la famille.")
          },
        )

        const dishesCollectionRef = collection(db, "users", auth.currentUser.uid, "dishes")
        const unsubscribeDishes = onSnapshot(
          dishesCollectionRef,
          (snapshot) => {
            const dishesList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            setDishes(dishesList)
          },
          (err) => {
            setError("Erreur lors du chargement des plats.")
          },
        )

        const planCollectionRef = collection(db, "users", auth.currentUser.uid, "weeklyPlan")
        const unsubscribePlan = onSnapshot(
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
          },
          (err) => {
            setError("Erreur lors du chargement du plan.")
          },
        )

        // Subscribe to stock items
        const stockCollectionRef = collection(db, 'users', auth.currentUser.uid, 'stock');
        const unsubscribeStock = onSnapshot(stockCollectionRef, (snapshot) => {
          const itemsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            expirationDate: doc.data().expirationDate?.toDate ? doc.data().expirationDate.toDate().toISOString().split('T')[0] : doc.data().expirationDate,
          }));
          setStockItems(itemsList);
        }, (err) => {
          setError('Erreur lors du chargement du stock.');
          console.error("Error fetching stock:", err);
        });

        // Nouveau: Abonnement aux notifications non lues
        const notificationsCollectionRef = collection(db, 'users', auth.currentUser.uid, 'notifications');
        const unsubscribeNotifications = onSnapshot(
          notificationsCollectionRef,
          (snapshot) => {
            const notificationsList = snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .filter(notification => !notification.read); // Filtrer les notifications non lues
            setUnreadNotifications(notificationsList);
          },
          (err) => {
            setError("Erreur lors du chargement des notifications.");
            console.error("Error fetching notifications:", err);
          }
        );


        setLoading(false)
        return () => {
          unsubscribeMembers()
          unsubscribeDishes()
          unsubscribePlan()
          unsubscribeStock(); // Cleanup stock listener
          unsubscribeNotifications(); // Nettoyage de l'écouteur de notifications
        }
      } catch (err) {
        setError("Erreur lors du chargement des données.")
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && !event.target.closest(".sidebar") && !event.target.closest(".mobile-sidebar-toggle")) {
        setIsSidebarOpen(false)
      }
      // Nouveau: Gérer le clic en dehors de la modal de notifications
      if (showNotificationsModal && !event.target.closest(".notifications-modal") && !event.target.closest(".header-action-btn[title='Notifications']")) {
        setShowNotificationsModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isSidebarOpen, showNotificationsModal]) // Ajout de showNotificationsModal aux dépendances

  const handleEditMember = (member) => {
    setEditingMember(member)
    setIsSidebarOpen(false)
  }

  const handleSaveEditedMember = async (updatedMemberData) => {
    setLoading(true)
    setError("")
    try {
      if (!auth.currentUser) throw new Error("Aucun utilisateur authentifié.")
      if (updatedMemberData.id === auth.currentUser.uid) {
        const userDocRef = doc(db, "users", auth.currentUser.uid)
        await updateDoc(userDocRef, {
          fullName: updatedMemberData.fullName,
          age: updatedMemberData.age,
          gender: updatedMemberData.gender,
          medicalConditions: updatedMemberData.medicalConditions,
          otherMedicalCondition: updatedMemberData.otherMedicalCondition || "",
          role: updatedMemberData.role,
          otherRole: updatedMemberData.otherRole || "",
          profilePic: updatedMemberData.profilePic || null,
        })
        setCurrentUserProfile({ ...currentUserProfile, ...updatedMemberData })
      } else {
        const memberDocRef = doc(db, "users", auth.currentUser.uid, "familyMembers", updatedMemberData.id)
        await updateDoc(memberDocRef, {
          fullName: updatedMemberData.fullName,
          age: updatedMemberData.age,
          gender: updatedMemberData.gender,
          email: updatedMemberData.email || "",
          medicalConditions: updatedMemberData.medicalConditions,
          otherMedicalCondition: updatedMemberData.otherMedicalCondition || "",
          role: updatedMemberData.role,
          otherRole: updatedMemberData.otherRole || "",
          profilePic: updatedMemberData.profilePic || null,
        })
      }
      setEditingMember(null)
    } catch (err) {
      setError(`Échec de la sauvegarde : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce membre ?")) return
    setLoading(true)
    setError("")
    try {
      if (!auth.currentUser) throw new Error("Aucun utilisateur authentifié.")
      if (memberId !== auth.currentUser.uid) {
        const memberDocRef = doc(db, "users", auth.currentUser.uid, "familyMembers", memberId)
        await deleteDoc(memberDocRef)
      } else {
        setError("Vous ne pouvez pas supprimer votre profil principal depuis ici.")
      }
    } catch (err) {
      setError(`Échec de la suppression : ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNewMember = () => {
    if (!auth.currentUser) {
      setError("Vous devez être connecté pour ajouter un nouveau membre.")
      navigate("/login")
      return
    }
    if (!currentUserProfile?.completedProfile) {
      setError("Vous devez compléter votre profil avant d'ajouter des membres.")
      navigate("/complete-profile")
      return
    }
    setIsSidebarOpen(false)
    navigate("/setup-family")
  }

  const handleLogout = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) return
    try {
      await signOut(auth)
      navigate("/login")
    } catch (err) {
      setError("Échec de la déconnexion. Veuillez réessayer.")
    }
  }

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setIsSidebarOpen(false)
  const navigateToProfile = () => {
    setIsSidebarOpen(false)
    navigate("/complete-profile")
  }

  // Nouveau: Fonction pour basculer la visibilité des notifications
  const toggleNotificationsModal = () => {
    setShowNotificationsModal(!showNotificationsModal);
  };

  // Calculer les statistiques
  const totalMembers = familyMembers.length + (currentUserProfile ? 1 : 0)
  const totalMedicalConditions = [
    ...new Set([
      ...(currentUserProfile?.medicalConditions || []),
      ...familyMembers.flatMap((m) => m.medicalConditions || []),
    ]),
  ].filter((condition) => condition && condition !== "Aucun").length
  const completedProfiles =
    (currentUserProfile?.completedProfile ? 1 : 0) + familyMembers.filter((m) => m.fullName && m.age).length
  const totalDishes = dishes.length
  const plannedMeals = Object.values(weeklyPlan).flat().length

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Chargement de votre tableau de bord familial...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <ToastContainer />
      {/* Notifications component is now conditionally rendered as a modal */}
      {/* <Notifications weeklyPlan={weeklyPlan} dishes={dishes} stockItems={stockItems} /> */}

      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon">
              <FaHome />
            </div>
            <h2>FoodPlanner</h2>
          </div>
          <button className="sidebar-toggle desktop-only" onClick={toggleSidebar}>
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            <li>
              <button
                className={`sidebar-link ${activeTab === "members" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("members")
                  closeSidebar()
                }}
              >
                <FaChartBar />
                <span>Tableau de Bord</span>
              </button>
            </li>
            <li>
              <button
                className={`sidebar-link ${activeTab === "dishes" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("dishes")
                  closeSidebar()
                }}
              >
                <FaUtensils />
                <span>Liste des Plats</span>
              </button>
            </li>
            <li>
              <button
                className={`sidebar-link ${activeTab === "planner" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("planner")
                  closeSidebar()
                }}
              >
                <FaCalendarAlt />
                <span>Planification</span>
              </button>
            </li>
            <li>
              <button
                className={`sidebar-link ${activeTab === "shopping" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("shopping")
                  closeSidebar()
                }}
              >
                <FaShoppingBasket />
                <span>Liste de Courses</span>
              </button>
            </li>
            {/* New Stock Manager Link */}
            <li>
              <button
                className={`sidebar-link ${activeTab === "stock" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("stock")
                  closeSidebar()
                }}
              >
                <FaBoxes />
                <span>Gestion des Stocks</span>
              </button>
            </li>
            {/* New Dish Combiner Link */}
            <li>
              <button
                className={`sidebar-link ${activeTab === "dish-combiner" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("dish-combiner")
                  closeSidebar()
                }}
              >
                <FaPuzzlePiece />
                <span>Combiner Plats</span>
              </button>
            </li>
          </ul>

          <div className="sidebar-divider"></div>

          <ul>
            <li>
              <button className="sidebar-link" onClick={handleAddNewMember}>
                <FaPlus />
                <span>Ajouter un Membre</span>
              </button>
            </li>
            <li>
              <button className="sidebar-link" onClick={navigateToProfile}>
                <FaUser />
                <span>Mon Profil</span>
              </button>
            </li>
          </ul>

          <div className="sidebar-footer">
            <button className="sidebar-link logout-link" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <button className="mobile-sidebar-toggle" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <div className="header-title">
              <h1>Tableau de Bord Familial</h1>
              <p className="header-subtitle">Gérez votre famille et vos repas en toute simplicité</p>
            </div>
          </div>

          <div className="header-right">
            <div className="header-actions">
              <button className="header-action-btn" title="Notifications" onClick={toggleNotificationsModal}> {/* Nouveau: Ajout de l'onClick */}
                <FaBell />
                {unreadNotifications.length > 0 && ( // Nouveau: Affichage dynamique du badge
                  <span className="notification-badge">{unreadNotifications.length}</span>
                )}
              </button>
              <button className="header-action-btn" title="Paramètres">
                <FaCog />
              </button>
            </div>

            {currentUserProfile && (
              <div className="user-info" onClick={navigateToProfile}>
                <div className="user-avatar-container">
                  {currentUserProfile.profilePic ? (
                    <img
                      src={currentUserProfile.profilePic || "/placeholder.svg"}
                      alt={currentUserProfile.fullName}
                      className="user-avatar"
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      <FaUser />
                    </div>
                  )}
                  <div className="user-status-indicator"></div>
                </div>
                <div className="user-details">
                  <span className="user-name">{currentUserProfile.fullName?.split(" ")[0] || "Utilisateur"}</span>
                  <span className="user-role">Administrateur</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {error && (
            <div className="error-message">
              <div className="error-content">
                <strong>Erreur:</strong> {error}
              </div>
              <button className="error-close" onClick={() => setError("")}>
                <FaTimes />
              </button>
            </div>
          )}

          {editingMember ? (
            <div className="modal-overlay">
              <div className="modal">
                <button className="modal-close" onClick={() => setEditingMember(null)}>
                  <FaTimes />
                </button>
                <FamilyMemberForm
                  member={editingMember}
                  onSave={handleSaveEditedMember}
                  onCancel={() => setEditingMember(null)}
                  onDelete={editingMember.id !== auth.currentUser?.uid ? handleDeleteMember : null}
                  isNew={false}
                />
              </div>
            </div>
          ) : (
            <div className="dashboard-grid">
              {activeTab === "members" && (
                <>
                  {/* Enhanced Stats Section */}
                  <section className="dashboard-stats">
                    <div className="stat-card members-stat">
                      <div className="stat-icon">
                        <FaUsers />
                      </div>
                      <div className="stat-content">
                        <h3>Membres Total</h3>
                        <p>{totalMembers}</p>
                        <span className="stat-change positive">
                          <FaHeart /> Famille unie
                        </span>
                      </div>
                      <div className="stat-trend">
                        <div className="trend-line members-trend"></div>
                      </div>
                    </div>

                    <div className="stat-card health-stat">
                      <div className="stat-icon">
                        <FaHeart />
                      </div>
                      <div className="stat-content">
                        <h3>Conditions Médicales</h3>
                        <p>{totalMedicalConditions}</p>
                        <span className="stat-change neutral">Surveillées</span>
                      </div>
                      <div className="stat-trend">
                        <div className="trend-line health-trend"></div>
                      </div>
                    </div>

                    <div className="stat-card profile-stat">
                      <div className="stat-icon">
                        <FaUserCheck />
                      </div>
                      <div className="stat-content">
                        <h3>Profils Complets</h3>
                        <p>{completedProfiles}</p>
                        <span className="stat-change">Sur {totalMembers}</span>
                      </div>
                      <div className="stat-progress">
                        <div
                          className="progress-fill"
                          style={{ width: `${(completedProfiles / totalMembers) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="stat-card dishes-stat">
                      <div className="stat-icon">
                        <FaUtensils />
                      </div>
                      <div className="stat-content">
                        <h3>Plats Disponibles</h3>
                        <p>{totalDishes}</p>
                        <span className="stat-change positive">{plannedMeals} planifiés</span>
                      </div>
                      <div className="stat-trend">
                        <div className="trend-line dishes-trend"></div>
                      </div>
                    </div>
                  </section>

                  {/* Quick Actions */}
                  <section className="quick-actions">
                    <div className="section-header">
                      <h2>Actions Rapides</h2>
                    </div>
                    <div className="quick-actions-grid">
                      <button className="quick-action-card" onClick={handleAddNewMember}>
                        <div className="quick-action-icon">
                          <FaPlus />
                        </div>
                        <div className="quick-action-content">
                          <h3>Ajouter un Membre</h3>
                          <p>Ajoutez un nouveau membre à votre famille</p>
                        </div>
                      </button>

                      <button className="quick-action-card" onClick={() => setActiveTab("dishes")}>
                        <div className="quick-action-icon">
                          <FaUtensils />
                        </div>
                        <div className="quick-action-content">
                          <h3>Gérer les Plats</h3>
                          <p>Ajoutez ou modifiez vos recettes</p>
                        </div>
                      </button>

                      <button className="quick-action-card" onClick={() => setActiveTab("planner")}>
                        <div className="quick-action-icon">
                          <FaCalendarAlt />
                        </div>
                        <div className="quick-action-content">
                          <h3>Planifier les Repas</h3>
                          <p>Organisez vos repas de la semaine</p>
                        </div>
                      </button>

                      <button className="quick-action-card" onClick={() => setActiveTab("shopping")}>
                        <div className="quick-action-icon">
                          <FaShoppingBasket />
                        </div>
                        <div className="quick-action-content">
                          <h3>Liste de Courses</h3>
                          <p>Générez votre liste automatiquement</p>
                        </div>
                      </button>

                      {/* New Quick Action for Stock Manager */}
                      <button className="quick-action-card" onClick={() => setActiveTab("stock")}>
                        <div className="quick-action-icon">
                          <FaBoxes />
                        </div>
                        <div className="quick-action-content">
                          <h3>Gérer les Stocks</h3>
                          <p>Suivez votre inventaire d'ingrédients</p>
                        </div>
                      </button>

                      {/* New Quick Action for Dish Combiner */}
                      <button className="quick-action-card" onClick={() => setActiveTab("dish-combiner")}>
                        <div className="quick-action-icon">
                          <FaPuzzlePiece />
                        </div>
                        <div className="quick-action-content">
                          <h3>Combiner des Plats</h3>
                          <p>Créez de nouvelles recettes à partir d'existantes</p>
                        </div>
                      </button>
                    </div>
                  </section>

                  {/* User Profile Section */}
                  {currentUserProfile && (
                    <section className="user-profile-section">
                      <div className="section-header">
                        <div className="section-title">
                          <div className="section-icon">
                            <FaUser />
                          </div>
                          <h2>Votre Profil</h2>
                        </div>
                        <button className="btn-secondary btn-sm" onClick={() => handleEditMember(currentUserProfile)}>
                          <FaEdit /> Modifier
                        </button>
                      </div>

                      <div className="profile-card primary-profile">
                        <div className="profile-header">
                          <div className="profile-avatar">
                            {currentUserProfile.profilePic ? (
                              <img
                                src={currentUserProfile.profilePic || "/placeholder.svg"}
                                alt={currentUserProfile.fullName}
                                className="profile-pic-preview"
                              />
                            ) : (
                              <div className="avatar-placeholder">
                                <FaUser />
                              </div>
                            )}
                            <div className="profile-badge admin-badge">Admin</div>
                          </div>
                          <div className="profile-info">
                            <h3>{currentUserProfile.fullName}</h3>
                            <p className="profile-email">{currentUserProfile.email}</p>
                            <div className="profile-tags">
                              <span className="profile-tag age-tag">{currentUserProfile.age} ans</span>
                              <span className="profile-tag gender-tag">{currentUserProfile.gender}</span>
                            </div>
                          </div>
                        </div>

                        <div className="profile-details">
                          <div className="detail-group">
                            <h4>Rôles</h4>
                            <div className="detail-tags">
                              {currentUserProfile.role?.map((role, index) => (
                                <span key={index} className="detail-tag role-tag">
                                  {role}
                                </span>
                              )) || <span className="detail-tag empty">Non défini</span>}
                            </div>
                          </div>

                          <div className="detail-group">
                            <h4>Conditions Médicales</h4>
                            <div className="detail-tags">
                              {currentUserProfile.medicalConditions?.length > 0 ? (
                                currentUserProfile.medicalConditions.map((condition, index) => (
                                  <span key={index} className="detail-tag medical-tag">
                                    {condition}
                                  </span>
                                ))
                              ) : (
                                <span className="detail-tag empty">Aucune</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Family Members Section */}
                  <section className="family-members-section">
                    <div className="section-header">
                      <div className="section-title">
                        <div className="section-icon">
                          <FaUsers />
                        </div>
                        <h2>Membres de la Famille</h2>
                      </div>
                      <button className="btn-primary btn-sm" onClick={handleAddNewMember}>
                        <FaPlus /> Ajouter
                      </button>
                    </div>

                    {familyMembers.length > 0 ? (
                      <div className="members-grid">
                        {familyMembers.map((member) => (
                          <div key={member.id} className="member-card">
                            <div className="member-header">
                              <div className="member-avatar">
                                {member.profilePic ? (
                                  <img
                                    src={member.profilePic || "/placeholder.svg"}
                                    alt={member.fullName}
                                    className="profile-pic-preview"
                                  />
                                ) : (
                                  <div className="avatar-placeholder">
                                    <FaUser />
                                  </div>
                                )}
                              </div>
                              <div className="member-info">
                                <h3>{member.fullName}</h3>
                                {member.email && <p className="member-email">{member.email}</p>}
                                <div className="member-tags">
                                  <span className="member-tag age-tag">{member.age} ans</span>
                                  <span className="member-tag gender-tag">{member.gender}</span>
                                </div>
                              </div>
                              <div className="member-actions">
                                <button
                                  className="action-btn edit-btn"
                                  onClick={() => handleEditMember(member)}
                                  title="Modifier"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  onClick={() => handleDeleteMember(member.id)}
                                  title="Supprimer"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>

                            <div className="member-details">
                              <div className="detail-group">
                                <h4>Rôles</h4>
                                <div className="detail-tags">
                                  {member.role?.map((role, index) => (
                                    <span key={index} className="detail-tag role-tag">
                                      {role}
                                    </span>
                                  )) || <span className="detail-tag empty">Non défini</span>}
                                </div>
                              </div>

                              <div className="detail-group">
                                <h4>Conditions Médicales</h4>
                                <div className="detail-tags">
                                  {member.medicalConditions?.length > 0 ? (
                                    member.medicalConditions.map((condition, index) => (
                                      <span key={index} className="detail-tag medical-tag">
                                        {condition}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="detail-tag empty">Aucune</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">
                          <FaUsers />
                        </div>
                        <h3>Aucun membre ajouté</h3>
                        <p>
                          Commencez par ajouter les membres de votre famille pour une meilleure planification des repas.
                        </p>
                        <div className="empty-actions">
                          <button className="btn-primary" onClick={handleAddNewMember}>
                            <FaPlus /> Ajouter le premier membre
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              {activeTab === "dishes" && <DishList familyMembers={familyMembers} />}

              {activeTab === "planner" && <MealPlanner dishes={dishes} familyMembers={familyMembers} />}

              {activeTab === "shopping" && <ShoppingList dishes={dishes} />} {/* dishes prop is not used in ShoppingList but kept for consistency */}

              {activeTab === "stock" && <StockManager />} {/* Render StockManager */}

              {activeTab === "dish-combiner" && <DishCombiner />} {/* Render DishCombiner */}
            </div>
          )}
        </div>
      </main>

      {/* Nouveau: Modal/Sidebar pour les notifications */}
      {showNotificationsModal && (
        <div className="modal-overlay">
          <div className="modal notifications-modal"> {/* Ajout d'une classe spécifique pour le style */}
            <button className="modal-close" onClick={() => setShowNotificationsModal(false)}>
              <FaTimes />
            </button>
            <Notifications
              weeklyPlan={weeklyPlan}
              dishes={dishes}
              stockItems={stockItems}
              notifications={unreadNotifications} // Passer les notifications non lues
              onClose={() => setShowNotificationsModal(false)} // Permettre de fermer la modal depuis le composant Notifications
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FamilyDashboard;
