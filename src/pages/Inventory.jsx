import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, FileSpreadsheet, Package, Store, ArrowLeft, X, Edit2, 
  Trash2, Layers, AlertTriangle, CheckCircle2, LayoutGrid, List, 
  Save, RefreshCw, ShoppingBag, Award, Sparkles, Filter, ChevronRight,
  TrendingUp, DollarSign, ShieldAlert, BarChart3, Clock, Warehouse, Camera, Image as ImageIcon,
  Truck, Phone, Mail, MapPin, UserCheck, Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { categories as initialCategories, menuItems as initialItems } from '../data/MenuData';
import './Inventory.css';

const DEFAULT_SUPPLIERS = [
  {
    id: 'supp_1',
    name: 'St. Helens Meat Products',
    contact_person: 'John Miller',
    phone: '09171234567',
    email: 'sales@sthelens.com',
    address: 'Pasig City, Metro Manila',
    notes: 'High-end beef slab supplier (Shortloin, Ribeye, Wagyu)',
    is_active: true
  },
  {
    id: 'supp_2',
    name: 'Seara Poultry Philippines',
    contact_person: 'Maria Santos',
    phone: '09189876543',
    email: 'orders@seara.ph',
    address: 'Quezon City, Metro Manila',
    notes: 'Wholesale chicken, wings, & cuts supplier',
    is_active: true
  },
  {
    id: 'supp_3',
    name: 'Excel Choice Beef Co.',
    contact_person: 'Robert Tan',
    phone: '09223334444',
    email: 'excelbeef@gmail.com',
    address: 'Valenzuela City',
    notes: 'Choice Grade Beef Ribeye & Cuts',
    is_active: true
  }
];

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('Mga Batch'); // 'Mga Batch' | 'Summary ng Stock' | 'Buong Rekord' | 'Mga Supplier'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('Lahat ng supplier');
  const [activeFilter, setActiveFilter] = useState('Lahat');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'stock_desc' | 'stock_asc' | 'price_desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [isLoading, setIsLoading] = useState(true);
  
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Supplier State & Modals
  const [suppliersList, setSuppliersList] = useState([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [message, setMessage] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [localStockState, setLocalStockState] = useState({});

  useEffect(() => {
    fetchData();
    fetchSuppliers();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .order('name');
      
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      const savedRaw = localStorage.getItem('menuItems');
      let savedItems = [];
      if (savedRaw) {
        try { savedItems = JSON.parse(savedRaw); } catch (e) {}
      }

      // Merge Supabase items, LocalStorage items, and default MenuData catalog items
      const combinedItemsMap = new Map();

      // 1. Base catalog items from MenuData
      initialItems.forEach(i => {
        const key = (i.name || '').toLowerCase().trim();
        combinedItemsMap.set(key, i);
      });

      // 2. Saved items from LocalStorage
      savedItems.forEach(i => {
        const key = (i.name || '').toLowerCase().trim();
        const existing = combinedItemsMap.get(key);
        combinedItemsMap.set(key, existing ? { ...existing, ...i } : i);
      });

      // 3. Supabase fetched items
      if (itemsData && itemsData.length > 0) {
        itemsData.forEach(i => {
          const key = (i.name || '').toLowerCase().trim();
          const existing = combinedItemsMap.get(key);
          combinedItemsMap.set(key, existing ? { ...existing, ...i } : i);
        });
      }

      const fetchedItems = Array.from(combinedItemsMap.values());
      setAllItems(fetchedItems);
      setCategories(categoriesData && categoriesData.length > 0 ? categoriesData : initialCategories);
      
      // Initialize local stock state
      const initialStock = {};
      fetchedItems.forEach(i => {
        initialStock[i.id] = {
          stock: i.stock ?? 0,
          low_stock_threshold: i.low_stock_threshold || i.lowStockThreshold || 5,
          unit: i.unit || 'kg'
        };
      });
      setLocalStockState(initialStock);

      localStorage.setItem('menuItems', JSON.stringify(fetchedItems));
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      const saved = localStorage.getItem('menuItems');
      const parsed = saved ? JSON.parse(saved) : initialItems;
      setAllItems(parsed);
      const initialStock = {};
      parsed.forEach(i => {
        initialStock[i.id] = {
          stock: i.stock ?? 0,
          low_stock_threshold: i.low_stock_threshold || i.lowStockThreshold || 5,
          unit: i.unit || 'kg'
        };
      });
      setLocalStockState(initialStock);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      if (data && data.length > 0) {
        setSuppliersList(data);
        localStorage.setItem('suppliersList', JSON.stringify(data));
      } else {
        setSuppliersList(DEFAULT_SUPPLIERS);
        localStorage.setItem('suppliersList', JSON.stringify(DEFAULT_SUPPLIERS));
      }
    } catch (err) {
      console.log('Suppliers notice:', err.message);
      const saved = localStorage.getItem('suppliersList');
      setSuppliersList(saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS);
    }
  };

  // Quick Stock Adjustment
  const adjustStock = (itemId, amount) => {
    setLocalStockState(prev => {
      const current = prev[itemId] ? prev[itemId].stock : 0;
      const newQty = Math.max(0, current + amount);
      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          stock: newQty
        }
      };
    });
  };

  const handleStockChange = (itemId, val) => {
    const newQty = Math.max(0, parseInt(val, 10) || 0);
    setLocalStockState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        stock: newQty
      }
    }));
  };

  const saveIndividualStock = async (item) => {
    const stockData = localStockState[item.id];
    if (!stockData) return;

    const updatedQty = stockData.stock;
    const isOut = updatedQty === 0;

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock: updatedQty, out_of_stock: isOut })
        .eq('id', item.id);

      if (error) throw error;

      const updated = allItems.map(i => i.id === item.id ? { ...i, stock: updatedQty, out_of_stock: isOut } : i);
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      window.dispatchEvent(new Event('store_data_updated'));
      showMessage(`✓ Stock updated for "${item.name}" (${updatedQty} ${item.unit || 'kg'})`);
    } catch (err) {
      console.error('Error saving stock:', err);
      const updated = allItems.map(i => i.id === item.id ? { ...i, stock: updatedQty, out_of_stock: isOut } : i);
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      window.dispatchEvent(new Event('store_data_updated'));
      showMessage(`✓ Stock saved locally for "${item.name}"`);
    }
  };

  const calculateStats = (items) => ({
    all: items.length,
    ok: items.filter(i => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      const th = i.low_stock_threshold || 5;
      return s > th;
    }).length,
    low: items.filter(i => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      const th = i.low_stock_threshold || 5;
      return s > 0 && s <= th;
    }).length,
    out: items.filter(i => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      return s === 0 || i.out_of_stock;
    }).length
  });

  const stats = calculateStats(allItems);

  // Combine default and dynamic suppliers
  const supplierOptions = ['Lahat ng supplier', ...new Set([
    ...suppliersList.map(s => s.name),
    ...allItems.map(item => item.description || '').filter(Boolean)
  ])];

  // Filtered & Sorted items
  const getFilteredItems = () => {
    let result = allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSupplier = selectedSupplier === 'Lahat ng supplier' || item.description?.includes(selectedSupplier);
      
      const currentStock = localStockState[item.id]?.stock ?? item.stock ?? 0;
      const threshold = item.low_stock_threshold || 5;

      let matchesFilter = true;
      if (activeFilter === 'OK') {
        matchesFilter = currentStock > threshold;
      } else if (activeFilter === 'Paubos') {
        matchesFilter = currentStock > 0 && currentStock <= threshold;
      } else if (activeFilter === 'Ubos') {
        matchesFilter = currentStock === 0 || item.out_of_stock;
      }
      
      return matchesSearch && matchesSupplier && matchesFilter;
    });

    // Apply sorting
    result.sort((a, b) => {
      const stockA = localStockState[a.id]?.stock ?? a.stock ?? 0;
      const stockB = localStockState[b.id]?.stock ?? b.stock ?? 0;
      if (sortBy === 'stock_desc') return stockB - stockA;
      if (sortBy === 'stock_asc') return stockA - stockB;
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      return a.name.localeCompare(b.name);
    });

    return result;
  };

  const filteredItems = getFilteredItems();

  const calculateStorageTotals = () => {
    const totalWeight = allItems.reduce((sum, item) => {
      const s = localStockState[item.id]?.stock ?? item.stock ?? 0;
      return sum + s;
    }, 0);

    const totalValuation = allItems.reduce((sum, item) => {
      const s = localStockState[item.id]?.stock ?? item.stock ?? 0;
      return sum + (s * (item.price || 0));
    }, 0);

    const totalBoxes = allItems.length;
    return {
      total: { weight: totalWeight.toFixed(1), boxes: totalBoxes, value: totalValuation.toFixed(2) },
      mainStorage: { weight: (totalWeight * 0.6).toFixed(1), boxes: Math.ceil(totalBoxes * 0.6) },
      shop: { weight: (totalWeight * 0.4).toFixed(1), boxes: Math.floor(totalBoxes * 0.4) }
    };
  };

  const storageData = calculateStorageTotals();

  // Category Summaries Calculation
  const categorySummaries = categories.map(cat => {
    const catItems = allItems.filter(i => i.category_id === cat.id);
    const catStock = catItems.reduce((sum, i) => sum + (localStockState[i.id]?.stock ?? i.stock ?? 0), 0);
    const catValue = catItems.reduce((sum, i) => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      return sum + (s * (i.price || 0));
    }, 0);

    const okCount = catItems.filter(i => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      return s > (i.low_stock_threshold || 5);
    }).length;
    
    const lowCount = catItems.filter(i => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      return s > 0 && s <= (i.low_stock_threshold || 5);
    }).length;

    const outCount = catItems.filter(i => {
      const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
      return s === 0 || i.out_of_stock;
    }).length;

    return {
      id: cat.id,
      name: cat.name,
      itemCount: catItems.length,
      totalStock: catStock,
      totalValue: catValue,
      okCount,
      lowCount,
      outCount,
      percentage: storageData.total.weight > 0 ? ((catStock / Number(storageData.total.weight)) * 100).toFixed(1) : 0
    };
  });

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleNewEntry = () => {
    setEditingItem(null);
    setShowNewBatchModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Sigurado ka bang gustong burahin ang "${item.name}" sa inventory?`)) return;
    
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
      if (error) throw error;
      
      const updated = allItems.filter(i => i.id !== item.id);
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      showMessage(`✓ Burado na ang "${item.name}" sa inventory`);
    } catch (err) {
      console.error('Error deleting item:', err);
      const updated = allItems.filter(i => i.id !== item.id);
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      showMessage(`✓ Burado na si "${item.name}" (Local update)`);
    }
  };

  const handleSaveItem = async (itemData) => {
    try {
      let savedItem;
      if (editingItem) {
        const { data, error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id)
          .select()
          .single();
        
        if (error) throw error;
        savedItem = data || { ...editingItem, ...itemData };
        
        const updated = allItems.map(i => i.id === editingItem.id ? savedItem : i);
        setAllItems(updated);
        showMessage('✓ Matagumpay na na-update ang product!');
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert([itemData])
          .select()
          .single();
        
        if (error) throw error;
        savedItem = data || { ...itemData, id: 'item_' + Date.now() };
        
        setAllItems([savedItem, ...allItems]);
        showMessage('✓ Bagong item sa inventory naidagdag!');
      }

      setLocalStockState(prev => ({
        ...prev,
        [savedItem.id]: {
          stock: savedItem.stock ?? 0,
          low_stock_threshold: savedItem.low_stock_threshold || 5,
          unit: savedItem.unit || 'kg'
        }
      }));
      
      localStorage.setItem('menuItems', JSON.stringify(allItems));
      window.dispatchEvent(new Event('store_data_updated'));
      setShowNewBatchModal(false);
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
      const fallbackItem = { ...(editingItem || itemData), id: editingItem?.id || 'item_' + Date.now() };
      const updated = editingItem 
        ? allItems.map(i => i.id === editingItem.id ? fallbackItem : i)
        : [fallbackItem, ...allItems];
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      window.dispatchEvent(new Event('store_data_updated'));
      setShowNewBatchModal(false);
      setShowEditModal(false);
      setEditingItem(null);
      showMessage('✓ Saved locally (Offline mode)');
    }
  };

  // Supplier Management Handlers
  const handleSaveSupplier = async (supplierData) => {
    try {
      let saved;
      if (editingSupplier) {
        const { data, error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingSupplier.id)
          .select()
          .single();

        if (error) throw error;
        saved = data || { ...editingSupplier, ...supplierData };
        const updated = suppliersList.map(s => s.id === editingSupplier.id ? saved : s);
        setSuppliersList(updated);
        localStorage.setItem('suppliersList', JSON.stringify(updated));
        showMessage('✓ Supplier details updated!');
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert([supplierData])
          .select()
          .single();

        if (error) throw error;
        saved = data || { ...supplierData, id: 'supp_' + Date.now() };
        const updated = [saved, ...suppliersList];
        setSuppliersList(updated);
        localStorage.setItem('suppliersList', JSON.stringify(updated));
        showMessage('✓ Bagong Supplier naidagdag!');
      }
    } catch (err) {
      console.error('Save supplier error:', err);
      const fallback = { ...(editingSupplier || supplierData), id: editingSupplier?.id || 'supp_' + Date.now() };
      const updated = editingSupplier 
        ? suppliersList.map(s => s.id === editingSupplier.id ? fallback : s)
        : [fallback, ...suppliersList];
      setSuppliersList(updated);
      localStorage.setItem('suppliersList', JSON.stringify(updated));
      showMessage('✓ Supplier saved (Local Mode)');
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = async (supplier) => {
    if (!window.confirm(`Sigurado ka bang gustong burahin si "${supplier.name}" sa listahan ng suppliers?`)) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', supplier.id);
      if (error) throw error;
    } catch (err) {
      console.log('Delete notice:', err);
    }
    const updated = suppliersList.filter(s => s.id !== supplier.id);
    setSuppliersList(updated);
    localStorage.setItem('suppliersList', JSON.stringify(updated));
    showMessage(`✓ "${supplier.name}" removed from suppliers list.`);
  };

  const handleExportExcel = () => {
    const csv = [
      ['Product Name', 'Category', 'Stock Qty', 'Unit', 'Price', 'Threshold', 'Status'],
      ...filteredItems.map(item => {
        const s = localStockState[item.id]?.stock ?? item.stock ?? 0;
        const th = item.low_stock_threshold || 5;
        const status = s === 0 ? 'UBOS' : s <= th ? 'PAUBOS' : 'OK';
        return [
          `"${item.name}"`,
          `"${categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}"`,
          s,
          item.unit || 'kg',
          item.price,
          th,
          status
        ];
      })
    ];

    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showMessage('✓ Na-download na ang Inventory Excel CSV Report!');
  };

  return (
    <div className="inventory-container">
      {/* Toast Notification */}
      {message && (
        <div style={{ 
          position: 'fixed', top: '24px', right: '30px', 
          background: 'linear-gradient(135deg, #071708 0%, #0c250d 100%)', 
          color: '#F9B700', 
          padding: '14px 24px', borderRadius: '16px', 
          zIndex: 99999, fontWeight: 800, fontSize: '0.92rem',
          boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
          border: '1.5px solid #F9B700',
          display: 'flex', alignItems: 'center', gap: '10px',
          animation: 'slideUp 0.3s ease'
        }}>
          <Sparkles size={18} color="#F9B700" />
          {message}
        </div>
      )}

      {/* Top Banner Header */}
      <div className="inventory-banner">
        <div className="inventory-banner-header">
          <div className="banner-left">
            <div className="banner-icon-wrapper">
              <Package size={30} />
            </div>
            <div className="banner-title-group">
              <h1>
                Warehouse Inventory
                <span className="system-badge">Live Control Center</span>
              </h1>
              <p className="banner-subtitle">
                Subaybayan ang stock, timbang ng box, bodega, at supply ng Chilled & Frozen Hub
              </p>
            </div>
          </div>

          <div className="banner-actions">
            <Link to="/admin/dashboard" className="btn-back-dashboard">
              <ArrowLeft size={16} /> Admin Dashboard
            </Link>
            <button className="btn-new-batch" onClick={handleNewEntry}>
              <Plus size={18} /> Add New Product
            </button>
          </div>
        </div>
      </div>

      {/* KPI Storage Dashboard Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Lahat ng Storage</span>
            <div className="kpi-icon-box total">
              <Package size={22} />
            </div>
          </div>
          <div className="kpi-value">{storageData.total.weight} <span style={{ fontSize: '1.1rem', color: '#64748b' }}>kg</span></div>
          <div className="kpi-footer">
            <span className="kpi-trend green">Total</span> {storageData.total.boxes} Items / Varieties
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Main Storage / Bodega</span>
            <div className="kpi-icon-box main">
              <Store size={22} />
            </div>
          </div>
          <div className="kpi-value">{storageData.mainStorage.weight} <span style={{ fontSize: '1.1rem', color: '#64748b' }}>kg</span></div>
          <div className="kpi-footer">
            <span className="kpi-trend green">60% Storage</span> Cold Storage Reserve
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Shop / Display Floor</span>
            <div className="kpi-icon-box shop">
              <ShoppingBag size={22} />
            </div>
          </div>
          <div className="kpi-value">{storageData.shop.weight} <span style={{ fontSize: '1.1rem', color: '#64748b' }}>kg</span></div>
          <div className="kpi-footer">
            <span className="kpi-trend amber">40% Display</span> Ready for Checkout
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Registered Suppliers</span>
            <div className="kpi-icon-box alert" style={{ background: '#f0fdf4', color: '#0c250d' }}>
              <Truck size={22} color="#0c250d" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#0c250d' }}>
            {suppliersList.length} <span style={{ fontSize: '1.1rem', color: '#64748b' }}>vendors</span>
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend green">{suppliersList.filter(s => s.is_active !== false).length} Active</span>
            <span className="kpi-trend amber" style={{ marginLeft: '4px' }}>Partner Vendors</span>
          </div>
        </div>
      </div>

      {/* Navigation Toolbar */}
      <div className="inventory-toolbar">
        <div className="toolbar-top">
          {/* Main Navigation Tabs */}
          <div className="nav-tabs-pills">
            <button
              className={`tab-pill ${activeTab === 'Mga Batch' ? 'active' : ''}`}
              onClick={() => setActiveTab('Mga Batch')}
            >
              Mga Batch
            </button>
            <button
              className={`tab-pill ${activeTab === 'Summary ng Stock' ? 'active' : ''}`}
              onClick={() => setActiveTab('Summary ng Stock')}
            >
              Summary ng Stock
            </button>
            <button
              className={`tab-pill ${activeTab === 'Buong Rekord' ? 'active' : ''}`}
              onClick={() => setActiveTab('Buong Rekord')}
            >
              Buong Rekord
            </button>
            <button
              className={`tab-pill ${activeTab === 'Mga Supplier' ? 'active' : ''}`}
              onClick={() => setActiveTab('Mga Supplier')}
            >
              🚚 Mga Supplier ({suppliersList.length})
            </button>
          </div>

          <div className="toolbar-actions">
            {activeTab === 'Mga Supplier' ? (
              <button className="btn-tool primary" onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }}>
                <Plus size={16} /> Magdagdag ng Supplier
              </button>
            ) : (
              <button className="btn-tool primary" onClick={handleNewEntry}>
                <Plus size={16} /> Pasok / Bagong Batch
              </button>
            )}
            <button className="btn-tool" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} color="#059669" /> Export Excel
            </button>
            <button className="btn-tool" onClick={fetchData} title="Refresh Data">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Filters bar for Mga Batch and Buong Rekord */}
        {activeTab !== 'Summary ng Stock' && activeTab !== 'Mga Supplier' && (
          <div className="toolbar-bottom">
            {/* Status Filters */}
            <div className="status-filter-group">
              <button 
                className={`filter-chip ${activeFilter === 'Lahat' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Lahat')}
              >
                Lahat ({stats.all})
              </button>
              <button 
                className={`filter-chip chip-ok ${activeFilter === 'OK' ? 'active' : ''}`}
                onClick={() => setActiveFilter('OK')}
              >
                🟢 OK ({stats.ok})
              </button>
              <button 
                className={`filter-chip chip-low ${activeFilter === 'Paubos' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Paubos')}
              >
                🟡 Paubos ({stats.low})
              </button>
              <button 
                className={`filter-chip chip-out ${activeFilter === 'Ubos' ? 'active' : ''}`}
                onClick={() => setActiveFilter('Ubos')}
              >
                🔴 Ubos ({stats.out})
              </button>
            </div>

            {/* Search, Supplier & Sort/View Toggle */}
            <div className="search-supplier-wrapper">
              {activeTab === 'Buong Rekord' && (
                <select 
                  className="supplier-dropdown"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Sort by Name (A-Z)</option>
                  <option value="stock_desc">Stock: High to Low</option>
                  <option value="stock_asc">Stock: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              )}

              <select 
                className="supplier-dropdown"
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                {supplierOptions.map((supplier) => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>

              <div className="search-input-box">
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Hanapin: product, brand, supplier, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <X size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                )}
              </div>

              {activeTab === 'Mga Batch' && (
                <div className="view-toggle-btns">
                  <button 
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid Cards View"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Table List View"
                  >
                    <List size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: MGA BATCH (PRODUCT BATCH GRID & CARDS) */}
      {activeTab === 'Mga Batch' && (
        isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
            <RefreshCw size={36} color="#0c250d" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0c250d' }}>Kinakarga ang inventory data...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
            <Package size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>Walang produktong tumutugma</div>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 16px' }}>Subukang papalitan ang search filter o magdagdag ng bagong produkto.</p>
            <button className="btn-new-batch" style={{ margin: '0 auto' }} onClick={handleNewEntry}>
              <Plus size={18} /> Magdagdag ng Item
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="inventory-grid">
            {filteredItems.map((item) => {
              const currentStock = localStockState[item.id]?.stock ?? item.stock ?? 0;
              const threshold = item.low_stock_threshold || 5;
              const isOut = currentStock === 0 || item.out_of_stock;
              const isLow = !isOut && currentStock > 0 && currentStock <= threshold;
              const statusType = isOut ? 'ubos' : isLow ? 'paubos' : 'ok';
              const categoryName = categories.find(c => c.id === item.category_id)?.name || 'General Catalog';
              const defaultImg = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80';

              return (
                <div key={item.id} className={`inventory-card card-${statusType}`}>
                  <div>
                    <div className="card-header-row">
                      <img 
                        src={item.image || defaultImg} 
                        alt={item.name} 
                        className="card-product-img"
                        onError={(e) => { e.currentTarget.src = defaultImg; }} 
                      />
                      <div className="card-info-col">
                        <h3 className="card-product-name">{item.name}</h3>
                        <div className="card-tags-row">
                          <span className="cat-badge">{categoryName}</span>
                          <span className="unit-badge">{item.unit || 'kg'}</span>
                        </div>
                        <div className="price-text">₱{Number(item.price).toFixed(2)}</div>
                      </div>
                      <span className={`status-badge ${statusType}`}>
                        {statusType === 'ok' && '🟢 OK'}
                        {statusType === 'paubos' && '🟡 Paubos'}
                        {statusType === 'ubos' && '🔴 Ubos'}
                      </span>
                    </div>

                    <div className="card-stock-box">
                      <div className="stock-box-header">
                        <div className="stock-main-qty">
                          {currentStock} <span>{item.unit || 'kg'}</span>
                        </div>
                        <div className="threshold-lbl">Threshold: {threshold} {item.unit || 'kg'}</div>
                      </div>

                      <div className="quick-adjust-buttons">
                        <button className="btn-quick" onClick={() => adjustStock(item.id, -10)}>-10</button>
                        <button className="btn-quick" onClick={() => adjustStock(item.id, -1)}>-1</button>
                        <input 
                          type="number" 
                          className="qty-display-input" 
                          value={currentStock}
                          onChange={(e) => handleStockChange(item.id, e.target.value)}
                        />
                        <button className="btn-quick" onClick={() => adjustStock(item.id, 1)}>+1</button>
                        <button className="btn-quick" onClick={() => adjustStock(item.id, 10)}>+10</button>
                        <button 
                          className="btn-quick" 
                          style={{ background: '#059669', color: 'white', borderColor: '#059669' }} 
                          onClick={() => saveIndividualStock(item)}
                          title="Save Stock Level"
                        >
                          <Save size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="card-progress-section">
                      <div className="progress-track">
                        <div 
                          className={`progress-fill-bar ${statusType}`}
                          style={{ width: `${Math.min((currentStock / (threshold * 2)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card-action-bar">
                    <button className="btn-card-edit" onClick={() => handleEditItem(item)}>
                      <Edit2 size={14} /> Edit Product
                    </button>
                    <button className="btn-card-delete" onClick={() => handleDeleteItem(item)} title="Delete Item">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Level (Quick Adjust)</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const currentStock = localStockState[item.id]?.stock ?? item.stock ?? 0;
                  const threshold = item.low_stock_threshold || 5;
                  const isOut = currentStock === 0 || item.out_of_stock;
                  const isLow = !isOut && currentStock > 0 && currentStock <= threshold;
                  const statusType = isOut ? 'ubos' : isLow ? 'paubos' : 'ok';
                  const defaultImg = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80';

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={item.image || defaultImg} 
                            style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} 
                            alt=""
                            onError={(e) => { e.currentTarget.src = defaultImg; }} 
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: {item.unit || 'kg'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="cat-badge">
                          {categories.find(c => c.id === item.category_id)?.name || 'General'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>₱{Number(item.price).toFixed(2)}</td>
                      <td>
                        <div className="quick-adjust-buttons" style={{ justifyContent: 'flex-start' }}>
                          <button className="btn-quick" onClick={() => adjustStock(item.id, -10)}>-10</button>
                          <button className="btn-quick" onClick={() => adjustStock(item.id, -1)}>-1</button>
                          <input 
                            type="number" 
                            className="qty-display-input" 
                            value={currentStock}
                            onChange={(e) => handleStockChange(item.id, e.target.value)}
                          />
                          <button className="btn-quick" onClick={() => adjustStock(item.id, 1)}>+1</button>
                          <button className="btn-quick" onClick={() => adjustStock(item.id, 10)}>+10</button>
                          <button className="btn-quick" style={{ background: '#059669', color: 'white', borderColor: '#059669' }} onClick={() => saveIndividualStock(item)}>
                            <Save size={13} />
                          </button>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#64748b' }}>{threshold} {item.unit || 'kg'}</td>
                      <td>
                        <span className={`status-badge ${statusType}`}>
                          {statusType === 'ok' && '🟢 OK'}
                          {statusType === 'paubos' && '🟡 Paubos'}
                          {statusType === 'ubos' && '🔴 Ubos'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button className="btn-card-edit" style={{ padding: '6px 12px' }} onClick={() => handleEditItem(item)}>
                            <Edit2 size={13} /> Edit
                          </button>
                          <button className="btn-card-delete" style={{ padding: '6px 10px' }} onClick={() => handleDeleteItem(item)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* TAB 2: SUMMARY NG STOCK (CATEGORY ANALYTICAL BREAKDOWN) */}
      {activeTab === 'Summary ng Stock' && (
        <div className="summary-analytics-section">
          <div className="analytics-card-container">
            <div className="analytics-title-header">
              <h2>
                <BarChart3 size={24} color="#0c250d" />
                Category Stock Summary & Inventory Valuation
              </h2>
              <button className="btn-tool" onClick={handleExportExcel}>
                <FileSpreadsheet size={16} color="#059669" /> Export Summary CSV
              </button>
            </div>

            <table className="category-summary-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Product Varieties</th>
                  <th>Total Stock Qty</th>
                  <th>Est. Inventory Value</th>
                  <th>Stock Health (OK / Low / Out)</th>
                  <th>Share of Inventory %</th>
                </tr>
              </thead>
              <tbody>
                {categorySummaries.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{cat.name}</strong>
                    </td>
                    <td style={{ fontWeight: 700, color: '#475569' }}>{cat.itemCount} items</td>
                    <td>
                      <strong style={{ fontSize: '1.05rem', color: '#0c250d' }}>{cat.totalStock.toFixed(1)}</strong> <span style={{ fontSize: '0.8rem', color: '#64748b' }}>kg/units</span>
                    </td>
                    <td style={{ fontWeight: 800, color: '#059669', fontSize: '1.02rem' }}>
                      ₱{cat.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="status-badge ok" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>{cat.okCount} OK</span>
                        {cat.lowCount > 0 && <span className="status-badge paubos" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>{cat.lowCount} Low</span>}
                        {cat.outCount > 0 && <span className="status-badge ubos" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>{cat.outCount} Out</span>}
                      </div>
                    </td>
                    <td style={{ width: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="cat-progress-bar">
                          <div className="cat-progress-fill" style={{ width: `${Math.min(cat.percentage, 100)}%` }}></div>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155' }}>{cat.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Urgent Low / Out of Stock Action List */}
          {(stats.low > 0 || stats.out > 0) && (
            <div className="analytics-card-container" style={{ borderLeft: '4px solid #ef4444' }}>
              <div className="analytics-title-header">
                <h2 style={{ color: '#dc2626' }}>
                  <ShieldAlert size={22} color="#dc2626" />
                  Urgent Restock Action Needed ({stats.low + stats.out} Products)
                </h2>
              </div>

              <div className="inventory-grid">
                {allItems.filter(item => {
                  const s = localStockState[item.id]?.stock ?? item.stock ?? 0;
                  const th = item.low_stock_threshold || 5;
                  return s <= th || item.out_of_stock;
                }).map(item => {
                  const currentStock = localStockState[item.id]?.stock ?? item.stock ?? 0;
                  const threshold = item.low_stock_threshold || 5;
                  const isOut = currentStock === 0 || item.out_of_stock;
                  return (
                    <div key={item.id} style={{ background: isOut ? '#fff1f2' : '#fffbeb', padding: '16px 20px', borderRadius: '16px', border: isOut ? '1px solid #fca5a5' : '1px solid #fde047', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Current: <strong style={{ color: isOut ? '#dc2626' : '#b45309' }}>{currentStock} {item.unit || 'kg'}</strong> (Min: {threshold})</div>
                      </div>
                      <button className="btn-quick" style={{ background: '#0c250d', color: '#F9B700', border: 'none', padding: '8px 14px' }} onClick={() => handleEditItem(item)}>
                        Restock Now
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BUONG REKORD (FULL MASTER AUDIT TABLE VIEW) */}
      {activeTab === 'Buong Rekord' && (
        <div className="inventory-table-container">
          <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0c250d' }}>
                Master Inventory Audit Ledger ({filteredItems.length} Records)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Kumpletong talaan ng presyo, bodega ratio, threshold, at stock status ng lahat ng items.
              </p>
            </div>
            <button className="btn-tool primary" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} /> Export Full Ledger
            </button>
          </div>

          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Price / Unit</th>
                <th>Current Stock</th>
                <th>Threshold</th>
                <th>Bodega Allocation</th>
                <th>Shop Floor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const currentStock = localStockState[item.id]?.stock ?? item.stock ?? 0;
                const threshold = item.low_stock_threshold || 5;
                const isOut = currentStock === 0 || item.out_of_stock;
                const isLow = !isOut && currentStock > 0 && currentStock <= threshold;
                const statusType = isOut ? 'ubos' : isLow ? 'paubos' : 'ok';
                const categoryName = categories.find(c => c.id === item.category_id)?.name || 'General';
                const bodegaQty = (currentStock * 0.6).toFixed(1);
                const shopQty = (currentStock * 0.4).toFixed(1);

                return (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{item.name}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ID: {item.id}</div>
                      </div>
                    </td>
                    <td>
                      <span className="cat-badge">{categoryName}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#059669' }}>₱{Number(item.price).toFixed(2)}</div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>per {item.unit || 'kg'}</span>
                    </td>
                    <td>
                      <div className="quick-adjust-buttons" style={{ justifyContent: 'flex-start' }}>
                        <input 
                          type="number" 
                          className="qty-display-input" 
                          value={currentStock}
                          onChange={(e) => handleStockChange(item.id, e.target.value)}
                        />
                        <button className="btn-quick" style={{ background: '#059669', color: 'white', borderColor: '#059669' }} onClick={() => saveIndividualStock(item)}>
                          <Save size={13} />
                        </button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>{threshold} {item.unit || 'kg'}</td>
                    <td style={{ fontWeight: 600, color: '#3b82f6' }}>📦 {bodegaQty} {item.unit || 'kg'}</td>
                    <td style={{ fontWeight: 600, color: '#d97706' }}>🏪 {shopQty} {item.unit || 'kg'}</td>
                    <td>
                      <span className={`status-badge ${statusType}`}>
                        {statusType === 'ok' && '🟢 OK'}
                        {statusType === 'paubos' && '🟡 Paubos'}
                        {statusType === 'ubos' && '🔴 Ubos'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn-card-edit" style={{ padding: '6px 12px' }} onClick={() => handleEditItem(item)}>
                          <Edit2 size={13} /> Edit
                        </button>
                        <button className="btn-card-delete" style={{ padding: '6px 10px' }} onClick={() => handleDeleteItem(item)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: MGA SUPPLIER (MANAGED SUPPLIERS PAGE) */}
      {activeTab === 'Mga Supplier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0c250d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Truck size={24} color="#0c250d" />
                Meat & Poultry Registered Vendors / Suppliers
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                Pamahalaan ang impormasyon, hotline, at contact details ng mga supplier ng Chilled & Frozen Hub.
              </p>
            </div>
            <button className="btn-new-batch" onClick={() => { setEditingSupplier(null); setShowSupplierModal(true); }}>
              <Plus size={18} /> Add New Supplier
            </button>
          </div>

          <div className="suppliers-grid">
            {suppliersList.map(supp => (
              <div key={supp.id} className="supplier-card">
                <div>
                  <div className="supplier-card-header">
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div className="supplier-avatar">
                        {supp.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="supplier-name">{supp.name}</h3>
                        <div className="supplier-contact-person">
                          <UserCheck size={14} color="#059669" /> Contact: {supp.contact_person || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <span className={`status-badge ${supp.is_active !== false ? 'ok' : 'ubos'}`}>
                      {supp.is_active !== false ? 'Active Vendor' : 'Inactive'}
                    </span>
                  </div>

                  <div className="supplier-contact-info">
                    {supp.phone && (
                      <div className="supplier-info-row">
                        <Phone size={14} color="#0c250d" />
                        <span>Hotline: <a href={`tel:${supp.phone}`}>{supp.phone}</a></span>
                      </div>
                    )}
                    {supp.email && (
                      <div className="supplier-info-row">
                        <Mail size={14} color="#0c250d" />
                        <span>Email: <a href={`mailto:${supp.email}`}>{supp.email}</a></span>
                      </div>
                    )}
                    {supp.address && (
                      <div className="supplier-info-row">
                        <MapPin size={14} color="#0c250d" />
                        <span>{supp.address}</span>
                      </div>
                    )}
                    {supp.notes && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '4px' }}>
                        "{supp.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-action-bar">
                  <button className="btn-card-edit" onClick={() => { setEditingSupplier(supp); setShowSupplierModal(true); }}>
                    <Edit2 size={14} /> Edit Supplier
                  </button>
                  <button className="btn-card-delete" onClick={() => handleDeleteSupplier(supp)} title="Delete Supplier">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW / EDIT BATCH MODAL */}
      {(showNewBatchModal || showEditModal) && (
        <BatchModal 
          item={editingItem}
          categories={categories}
          suppliers={suppliersList}
          onSave={handleSaveItem}
          onClose={() => {
            setShowNewBatchModal(false);
            setShowEditModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* NEW / EDIT SUPPLIER MODAL */}
      {showSupplierModal && (
        <SupplierModal 
          supplier={editingSupplier}
          onSave={handleSaveSupplier}
          onClose={() => {
            setShowSupplierModal(false);
            setEditingSupplier(null);
          }}
        />
      )}
    </div>
  );
};

const BatchModal = ({ item, categories, suppliers = [], onSave, onClose }) => {
  const [formData, setFormData] = useState(item || {
    name: '',
    description: '',
    category_id: categories[0]?.id || '',
    price: '',
    promo_price: '',
    unit: 'kg',
    min_order_note: '',
    stock: 0,
    low_stock_threshold: 5,
    out_of_stock: false,
    image: ''
  });

  const [weightMode, setWeightMode] = useState('same'); // 'same' | 'catch'
  const [boxQty, setBoxQty] = useState('');
  const [weightPerBox, setWeightPerBox] = useState('');
  const [catchBoxes, setCatchBoxes] = useState(['15.30']);
  const [costPerKg, setCostPerKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState(item?.price ? String(item.price) : '');
  const [imagePreview, setImagePreview] = useState(item?.image || '');

  // Auto calculate total weight
  const totalCalculatedWeight = useMemo(() => {
    if (weightMode === 'same') {
      const q = parseFloat(boxQty) || 0;
      const w = parseFloat(weightPerBox) || 0;
      return (q * w).toFixed(2);
    } else {
      if (catchBoxes.length === 0) return '0';
      const sum = catchBoxes.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
      return sum.toFixed(2);
    }
  }, [weightMode, boxQty, weightPerBox, catchBoxes]);

  // Keep formData.stock synced with calculated weight
  useEffect(() => {
    const wt = parseFloat(totalCalculatedWeight);
    if (wt > 0) {
      setFormData(prev => ({ ...prev, stock: wt }));
    }
  }, [totalCalculatedWeight]);

  useEffect(() => {
    if (pricePerKg !== '') {
      setFormData(prev => ({ ...prev, price: pricePerKg }));
    }
  }, [pricePerKg]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCatchBox = () => {
    setCatchBoxes(prev => [...prev, '15.00']);
  };

  const handleUpdateCatchBox = (index, val) => {
    const updated = [...catchBoxes];
    updated[index] = val;
    setCatchBoxes(updated);
  };

  const handleRemoveCatchBox = (index) => {
    setCatchBoxes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id || (!formData.price && !pricePerKg)) {
      alert('Pakipunan ang obligadong fields: Product Name, Category, at Price per kg');
      return;
    }

    const finalStock = parseFloat(totalCalculatedWeight) > 0 
      ? parseFloat(totalCalculatedWeight) 
      : (parseFloat(formData.stock) || 0);

    const finalPrice = pricePerKg !== '' ? parseFloat(pricePerKg) : parseFloat(formData.price || 0);

    let batchNotes = formData.description || '';
    if (costPerKg) {
      batchNotes = batchNotes ? `${batchNotes} | Cost: ₱${costPerKg}/kg` : `Cost: ₱${costPerKg}/kg`;
    }
    if (weightMode === 'same' && boxQty && weightPerBox) {
      batchNotes += ` | Boxes: ${boxQty} @ ${weightPerBox}kg`;
    } else if (weightMode === 'catch' && catchBoxes.length > 0) {
      batchNotes += ` | Catch Weight Boxes: ${catchBoxes.length} pcs (${catchBoxes.join(', ')} kg)`;
    }

    onSave({
      ...formData,
      price: finalPrice,
      promo_price: formData.promo_price ? parseFloat(formData.promo_price) : null,
      stock: finalStock,
      low_stock_threshold: parseInt(formData.low_stock_threshold, 10) || 5,
      out_of_stock: Boolean(formData.out_of_stock || finalStock === 0),
      description: batchNotes
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-box" style={{ maxWidth: '680px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        
        {/* Header - Matching Image */}
        <div style={{ background: '#f8fafc', padding: '24px 28px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#1e293b', fontFamily: 'Outfit, Georgia, serif', letterSpacing: '-0.02em' }}>
              Pasok / Bagong Batch
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              I-record ang bagong dating — supplier, storage, at timbang ng bawat box
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ border: 'none', background: '#e2e8f0', color: '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-body-scroll" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '72vh', overflowY: 'auto' }}>
            
            {/* Product Name & Category Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group-item" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Product Name *</label>
                <input 
                  type="text"
                  className="form-input-styled"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., High-End Beef Shortloin"
                  required
                />
              </div>
              <div className="form-group-item" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Category *</label>
                <select 
                  className="form-input-styled"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                >
                  <option value="">Pumili ng category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* BOX WEIGHT CARD SECTION - EXACT MATCH TO USER IMAGE */}
            <div style={{ background: '#f4f6f8', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginBottom: '14px', fontFamily: 'Outfit, Georgia, serif' }}>
                <span>📦</span>
                <span>Timbang ng mga box</span>
              </div>

              {/* Mode Segmented Tab Switcher */}
              <div style={{ background: '#e2e8f0', padding: '4px', borderRadius: '12px', display: 'inline-flex', gap: '4px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setWeightMode('same')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: weightMode === 'same' ? 'white' : 'transparent',
                    color: weightMode === 'same' ? '#1e293b' : '#64748b',
                    fontWeight: weightMode === 'same' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: weightMode === 'same' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Pareho ang timbang
                </button>
                <button
                  type="button"
                  onClick={() => setWeightMode('catch')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: weightMode === 'catch' ? 'white' : 'transparent',
                    color: weightMode === 'catch' ? '#1e293b' : '#64748b',
                    fontWeight: weightMode === 'catch' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: weightMode === 'catch' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Iba-iba (catch weight)
                </button>
              </div>

              {/* Mode: Pareho ang timbang */}
              {weightMode === 'same' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Quantity of boxes</label>
                      <input 
                        type="number"
                        className="form-input-styled"
                        value={boxQty}
                        onChange={(e) => setBoxQty(e.target.value)}
                        placeholder="hal. 20"
                        style={{ background: 'white' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Weight per box (kg)</label>
                      <input 
                        type="number"
                        step="0.01"
                        className="form-input-styled"
                        value={weightPerBox}
                        onChange={(e) => setWeightPerBox(e.target.value)}
                        placeholder="hal. 15.30"
                        style={{ background: 'white' }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '6px' }}>
                    {(!boxQty && !weightPerBox) ? (
                      "Wala pang box. Gamitin ang mga field sa taas."
                    ) : (
                      `Nakalkula: ${boxQty || 0} box × ${weightPerBox || 0} kg = ${totalCalculatedWeight} kg`
                    )}
                  </div>
                </div>
              ) : (
                /* Mode: Iba-iba (catch weight) */
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {catchBoxes.map((w, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', minWidth: '60px' }}>Box #{idx + 1}:</span>
                        <input 
                          type="number"
                          step="0.01"
                          className="form-input-styled"
                          value={w}
                          onChange={(e) => handleUpdateCatchBox(idx, e.target.value)}
                          placeholder="hal. 15.30"
                          style={{ background: 'white', flex: 1 }}
                        />
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>kg</span>
                        {catchBoxes.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveCatchBox(idx)}
                            style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={handleAddCatchBox}
                    style={{ border: '1px dashed #cbd5e1', background: 'white', color: '#0c250d', borderRadius: '10px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Magdagdag ng Box
                  </button>
                </div>
              )}
            </div>

            {/* KABUUANG TIMBANG (AUTO) - EXACT MATCH TO IMAGE */}
            <div>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Kabuuang timbang (auto)
              </label>
              <div style={{ background: '#dce4dd', border: '1px solid #bdc9be', borderRadius: '12px', padding: '12px 18px', fontSize: '1.15rem', fontWeight: 800, color: '#163618' }}>
                {totalCalculatedWeight || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                Sum ng lahat ng box. Awtomatikong pumapasok sa inventory pagka-save.
              </div>
            </div>

            {/* PRICING GRID - COST & PRICE PER KG */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Cost per kg (puhunan)
                </label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input-styled"
                  value={costPerKg}
                  onChange={(e) => setCostPerKg(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Price per kg (benta)
                </label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input-styled"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* SUPPLIER & ADDITIONAL INFO */}
            {suppliers.length > 0 && (
              <div className="form-group-item" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Supplier / Vendor</label>
                <select 
                  className="form-input-styled"
                  value={suppliers.find(s => formData.description?.includes(s.name))?.name || ''}
                  onChange={(e) => {
                    const selName = e.target.value;
                    if (selName) {
                      setFormData(prev => ({
                        ...prev,
                        description: prev.description ? `${prev.description} | Supplier: ${selName}` : `Supplier: ${selName}`
                      }));
                    }
                  }}
                >
                  <option value="">Pumili mula sa registered suppliers...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.contact_person || 'Vendor'})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Unit & Threshold */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Unit of Measure</label>
                <input 
                  type="text" 
                  className="form-input-styled" 
                  value={formData.unit || 'kg'} 
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Low Stock Alert Threshold</label>
                <input 
                  type="number" 
                  className="form-input-styled" 
                  value={formData.low_stock_threshold} 
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })} 
                />
              </div>
            </div>

          </div>

          {/* FOOTER ACTIONS - EXACT MATCH TO IMAGE */}
          <div style={{ padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: '#e2e8f0',
                color: '#334155',
                padding: '10px 22px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              style={{
                border: 'none',
                background: '#166534',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              I-record ang pasok
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplierModal = ({ supplier, onSave, onClose }) => {
  const [formData, setFormData] = useState(supplier || {
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_active: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Pakipunan ang Supplier Company Name');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog-box" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header-banner">
          <h2>
            <Truck size={22} color="#F9B700" />
            {supplier ? `Edit Supplier: ${supplier.name}` : 'Magdagdag ng Bagong Supplier / Vendor'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="modal-body-scroll">
            <div className="form-group-item">
              <label>Supplier Company Name *</label>
              <input 
                type="text"
                className="form-input-styled"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., St. Helens Meat Products"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group-item">
                <label>Contact Person</label>
                <input 
                  type="text"
                  className="form-input-styled"
                  value={formData.contact_person || ''}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="e.g., John Miller"
                />
              </div>

              <div className="form-group-item">
                <label>Phone / Hotline *</label>
                <input 
                  type="text"
                  className="form-input-styled"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., 09171234567"
                  required
                />
              </div>
            </div>

            <div className="form-group-item">
              <label>Email Address</label>
              <input 
                type="email"
                className="form-input-styled"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g., sales@sthelens.com"
              />
            </div>

            <div className="form-group-item">
              <label>Office / Warehouse Address</label>
              <input 
                type="text"
                className="form-input-styled"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., Pasig City, Metro Manila"
              />
            </div>

            <div className="form-group-item">
              <label>Brands Supplied / Notes</label>
              <textarea 
                className="form-input-styled"
                style={{ resize: 'vertical', minHeight: '75px' }}
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., High-end beef slabs (Shortloin, Ribeye, Wagyu)"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <input 
                type="checkbox"
                id="chk_supp_active"
                checked={Boolean(formData.is_active)}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#0c250d', cursor: 'pointer' }}
              />
              <label htmlFor="chk_supp_active" style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0c250d', cursor: 'pointer' }}>
                Active Supplier (Palaging lalabas sa product dropdown)
              </label>
            </div>
          </div>

          <div className="modal-footer-bar">
            <button type="button" className="btn-tool" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-new-batch">
              <Save size={16} /> {supplier ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
