import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import UserProfileForm from './pages/UserProfileForm'; // Corrected path
import FamilyMemberSetup from './pages/FamilyMemberSetup'; // Corrected path
import FamilyDashboard from './pages/FamilyDashboard';
import DishList from './components/DishList';
import MealPlanner from './components/MealPlanner';
import ShoppingList from './components/ShoppingList';
import DishManager from './components/DishManager';
import StockManager from './components/StockManager'; // Import StockManager
import DishCombiner from './components/DishCombiner'; // Import DishCombiner
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Corrected import path

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);

  // Vérifier l'état d'authentification et le profil
  useEffect(() => {
    const checkAuth = () => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          setIsAuth(true);
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const completedProfile = userDocSnap.exists() && userDocSnap.data().completedProfile;
            setHasCompletedProfile(completedProfile);
          } catch (err) {
            setHasCompletedProfile(false);
            toast.error('Erreur lors de la vérification du profil.');
            console.error("Error checking profile:", err);
          }
        } else {
          setIsAuth(false);
          setHasCompletedProfile(false);
        }
      });
      return () => unsubscribe();
    };
    checkAuth();
  }, []);

  // Déconnexion
  const logOutHandler = async () => {
    try {
      await signOut(auth);
      setIsAuth(false);
      setHasCompletedProfile(false);
      toast.success('Déconnexion réussie.');
      window.location.pathname = '/login'; // Redirect to login after logout
    } catch (err) {
      toast.error('Erreur lors de la déconnexion.');
      console.error("Error logging out:", err);
    }
  };

  return (
    <BrowserRouter>
      {/* <nav className="bg-white shadow p-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-green-600">
          FoodPlanner
        </Link>
        <div className="flex items-center space-x-4">
          {isAuth && auth.currentUser && (
            <p className="text-gray-700 capitalize">
              {auth.currentUser.email.split('@')[0]}
            </p>
          )}
          {isAuth ? (
            <button
              onClick={logOutHandler}
              className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
            >
              Déconnexion
            </button>
          ) : (
            <>
              <Link to="/login" className="text-blue-600 hover:underline">
                Connexion
              </Link>
              <Link to="/signup" className="text-blue-600 hover:underline">
                Inscription
              </Link>
            </>
          )}
        </div>
      </nav> */}
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/" element={<Home isAuth={isAuth} hasCompletedProfile={hasCompletedProfile} />} />
        <Route path="/signup" element={<SignUp setIsAuth={setIsAuth} />} />
        <Route path="/login" element={<Login setIsAuth={setIsAuth} />} />
        <Route
          path="/complete-profile"
          element={isAuth ? <UserProfileForm setHasCompletedProfile={setHasCompletedProfile} /> : <Login setIsAuth={setIsAuth} />}
        />
        <Route
          path="/setup-family"
          element={isAuth && hasCompletedProfile ? <FamilyMemberSetup /> : <Login setIsAuth={setIsAuth} />}
        />
        <Route
          path="/family-dashboard"
          element={isAuth && hasCompletedProfile ? <FamilyDashboard /> : <Login setIsAuth={setIsAuth} />}
        />
        {/* Existing Routes */}
        <Route
          path="/dishes"
          element={isAuth && hasCompletedProfile ? <DishList /> : <Login setIsAuth={setIsAuth} />}
        />
        <Route
          path="/meal-planner"
          element={isAuth && hasCompletedProfile ? <MealPlanner /> : <Login setIsAuth={setIsAuth} />}
        />
        <Route
          path="/shopping-list"
          element={isAuth && hasCompletedProfile ? <ShoppingList /> : <Login setIsAuth={setIsAuth} />}
        />
        <Route
          path="/dish-manager"
          element={isAuth && hasCompletedProfile ? <DishManager /> : <Login setIsAuth={setIsAuth} />}
        />
        {/* New Routes */}
        <Route
          path="/stock-manager"
          element={isAuth && hasCompletedProfile ? <StockManager /> : <Login setIsAuth={setIsAuth} />}
        />
        <Route
          path="/dish-combiner"
          element={isAuth && hasCompletedProfile ? <DishCombiner /> : <Login setIsAuth={setIsAuth} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
