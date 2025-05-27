import { useEffect } from 'react';
import { toast } from 'react-toastify';

const Notifications = ({ weeklyPlan, dishes }) => {
  useEffect(() => {
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];

    // Notification pour les repas du jour
    if (weeklyPlan[todayName]?.length > 0) {
      const dishNames = weeklyPlan[todayName]
        .map(dishId => dishes.find(d => d.id === dishId)?.name)
        .filter(name => name)
        .join(', ');
      toast.info(`Rappel : Aujourd'hui, vous avez prévu : ${dishNames}`, {
        position: 'top-right',
        autoClose: 5000,
      });
    }

    // Notification pour les ingrédients manquants (exemple simplifié)
    const requiredIngredients = {};
    Object.values(weeklyPlan).flat().forEach(dishId => {
      const dish = dishes.find(d => d.id === dishId);
      if (dish?.ingredients) {
        dish.ingredients.forEach(ing => {
          const key = `${ing.name}-${ing.unit}`;
          requiredIngredients[key] = requiredIngredients[key] || { ...ing, quantity: 0 };
          requiredIngredients[key].quantity += parseFloat(ing.quantity) || 0;
        });
      }
    });

    // Supposons un inventaire fictif (à remplacer par une vraie collection Firestore si disponible)
    const inventory = {
      'Lait-ml': { name: 'Lait', quantity: 500, unit: 'ml' },
      'Œufs-unités': { name: 'Œufs', quantity: 6, unit: 'unités' },
    };

    Object.entries(requiredIngredients).forEach(([key, ing]) => {
      const inventoryItem = inventory[key];
      if (!inventoryItem || inventoryItem.quantity < ing.quantity) {
        const missingQty = ing.quantity - (inventoryItem?.quantity || 0);
        toast.warn(`Ingrédient manquant : ${ing.name} (${missingQty.toFixed(2)} ${ing.unit})`, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    });
  }, [weeklyPlan, dishes]);

  return null; // Pas de rendu visuel
};

export default Notifications;