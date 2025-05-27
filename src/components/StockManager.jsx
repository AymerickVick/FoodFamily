import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { FaBoxes, FaPlus, FaEdit, FaTrash, FaCalendarTimes, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';

const StockManager = () => {
  const [stockItems, setStockItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: '',
    expirationDate: '', // YYYY-MM-DD format
  });
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const units = ['g', 'kg', 'ml', 'l', 'unités', 'c. à soupe', 'c. à café'];
  const categories = ['Viande', 'Poisson', 'Légumes', 'Fruits', 'Laitiers', 'Épicerie', 'Autres'];

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const stockCollectionRef = collection(db, 'users', auth.currentUser.uid, 'stock');
    const unsubscribe = onSnapshot(stockCollectionRef, (snapshot) => {
      const itemsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to Date object if necessary, or ensure it's a string
        expirationDate: doc.data().expirationDate?.toDate ? doc.data().expirationDate.toDate().toISOString().split('T')[0] : doc.data().expirationDate,
      }));
      setStockItems(itemsList);
      setLoading(false);
    }, (err) => {
      setError('Erreur lors du chargement du stock.');
      setLoading(false);
      console.error("Error fetching stock:", err);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity || !newItem.unit || !newItem.category) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    // Basic validation for quantity
    const parsedQuantity = parseFloat(newItem.quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError('La quantité doit être un nombre positif.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const stockCollectionRef = collection(db, 'users', auth.currentUser.uid, 'stock');
      const itemData = {
        ...newItem,
        quantity: parsedQuantity, // Store quantity as a number
        expirationDate: newItem.expirationDate ? new Date(newItem.expirationDate) : null, // Convert to Date object
        addedAt: new Date(),
      };

      if (editingItem) {
        const itemDocRef = doc(stockCollectionRef, editingItem.id);
        await updateDoc(itemDocRef, itemData);
        toast.success('Article de stock mis à jour !');
        setEditingItem(null);
      } else {
        await addDoc(stockCollectionRef, itemData);
        toast.success('Article de stock ajouté !');
      }
      setNewItem({ name: '', quantity: '', unit: '', category: '', expirationDate: '' });
    } catch (err) {
      setError('Erreur lors de la sauvegarde de l\'article.');
      console.error("Error saving stock item:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      quantity: item.quantity.toString(), // Convert back to string for input
      unit: item.unit,
      category: item.category,
      expirationDate: item.expirationDate, // Already in YYYY-MM-DD
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article du stock ?')) return;
    setLoading(true);
    try {
      const itemDocRef = doc(db, 'users', auth.currentUser.uid, 'stock', id);
      await deleteDoc(itemDocRef);
      toast.success('Article de stock supprimé !');
    } catch (err) {
      setError('Erreur lors de la suppression de l\'article.');
      console.error("Error deleting stock item:", err);
    } finally {
      setLoading(false);
    }
  };

  const getExpirationStatus = (expirationDate) => {
    if (!expirationDate) return { status: 'unknown', message: 'Date inconnue' };
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    const expiry = new Date(expirationDate);
    expiry.setHours(0, 0, 0, 0); // Normalize expiry date

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', message: `Expiré il y a ${Math.abs(diffDays)} jours` };
    } else if (diffDays <= 5) {
      return { status: 'warning', message: `Expire dans ${diffDays} jours` };
    } else {
      return { status: 'good', message: `Expire dans ${diffDays} jours` };
    }
  };

  return (
    <section className="stock-manager">
      <div className="section-header">
        <div className="section-icon"><FaBoxes /></div>
        <h2>Gestion des Stocks</h2>
      </div>

      {error && (
        <div className="error-message">
          <FaExclamationTriangle />
          <span>{error}</span>
          <button className="error-close" onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container stock-form">
        <h3>{editingItem ? 'Modifier l\'Article' : 'Ajouter un Nouvel Article'}</h3>
        <div className="form-group">
          <label htmlFor="itemName">Nom de l'ingrédient <span className="required">*</span></label>
          <input
            type="text"
            id="itemName"
            name="name"
            value={newItem.name}
            onChange={handleChange}
            placeholder="Ex: Farine, Lait"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="itemQuantity">Quantité <span className="required">*</span></label>
          <input
            type="number"
            id="itemQuantity"
            name="quantity"
            value={newItem.quantity}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="itemUnit">Unité <span className="required">*</span></label>
          <select id="itemUnit" name="unit" value={newItem.unit} onChange={handleChange} required>
            <option value="">Sélectionner une unité</option>
            {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="itemCategory">Catégorie <span className="required">*</span></label>
          <select id="itemCategory" name="category" value={newItem.category} onChange={handleChange} required>
            <option value="">Sélectionner une catégorie</option>
            {categories.map(category => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="expirationDate">Date de Péremption</label>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            value={newItem.expirationDate}
            onChange={handleChange}
          />
        </div>
        <div className="button-group">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sauvegarde...' : editingItem ? 'Mettre à jour' : 'Ajouter au Stock'}
          </button>
          {editingItem && (
            <button type="button" className="btn-secondary" onClick={() => { setEditingItem(null); setNewItem({ name: '', quantity: '', unit: '', category: '', expirationDate: '' }); }}>
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="stock-list">
        <h3>Articles en Stock</h3>
        {stockItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FaBoxes /></div>
            <h3>Aucun article en stock</h3>
            <p>Ajoutez des ingrédients pour suivre votre inventaire.</p>
          </div>
        ) : (
          <div className="members-grid"> {/* Reusing members-grid for card layout */}
            {stockItems.map(item => {
              const { status, message } = getExpirationStatus(item.expirationDate);
              return (
                <div key={item.id} className={`member-card stock-card ${status}`}>
                  <div className="member-info">
                    <h4>{item.name}</h4>
                    <p><strong>Quantité:</strong> {item.quantity} {item.unit}</p>
                    <p><strong>Catégorie:</strong> {item.category}</p>
                    {item.expirationDate && (
                      <p className={`expiration-status ${status}`}>
                        <FaCalendarTimes /> {message}
                      </p>
                    )}
                  </div>
                  <div className="member-actions">
                    <button className="edit-btn" onClick={() => handleEdit(item)}>
                      <FaEdit /> Modifier
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(item.id)}>
                      <FaTrash /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default StockManager;
