import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const getItemBoxes = (item) => {
  if (!item) return [];
  const totalStock = parseFloat(item.stock) || 0;
  const isOutOfStock = Boolean(item.out_of_stock || totalStock <= 0);

  if (Array.isArray(item.boxes) && item.boxes.length > 0) {
    return item.boxes.map(b => ({
      ...b,
      disabled: isOutOfStock || Boolean(b.disabled || b.ordered) || (b.weight && b.weight > totalStock)
    })).slice(0, 6);
  }

  if (Array.isArray(item.variations) && item.variations.length > 0) {
    const hasBoxes = item.variations.some(v => v.weight || (v.name && (v.name.toLowerCase().includes('box') || v.name.toLowerCase().includes('slab') || v.name.toLowerCase().includes('sack') || v.name.toLowerCase().includes('pack'))));
    if (hasBoxes) {
      return item.variations.map((v, idx) => {
        const wt = v.weight || parseFloat(v.name.replace(/[^0-9.]/g, '')) || 25;
        return {
          id: v.id || `box-${idx + 1}`,
          name: v.name,
          weight: wt,
          disabled: isOutOfStock || Boolean(v.disabled || v.ordered) || wt > totalStock
        };
      }).slice(0, 6);
    }
  }

  if (totalStock > 0 && !isOutOfStock) {
    const unitName = (item.unit || 'kg').toLowerCase();
    const prefix = (unitName === 'slab') ? 'Slab' : (unitName === 'sack') ? 'Sack' : (unitName === 'pack') ? 'Pack' : 'Box';
    
    if (unitName === 'sack' || unitName === 'pack') {
      // Maximum 6 boxes for sack/pack items
      return Array.from({ length: 6 }, (_, i) => ({
        id: `box-${i + 1}`,
        name: `${prefix} ${i + 1}`,
        weight: 25,
        disabled: 25 > totalStock
      }));
    }

    // Divide total stock into maximum 6 boxes
    const numBoxes = Math.min(6, Math.ceil(totalStock / 10)); // At least 10kg per box, max 6 boxes
    const boxes = [];
    let remainingStock = totalStock;
    const baseWeight = Number((totalStock / numBoxes).toFixed(3));
    
    for (let i = 0; i < numBoxes; i++) {
      const isLastBox = i === numBoxes - 1;
      // Last box gets all remaining stock to avoid rounding errors
      const weight = isLastBox ? Number(remainingStock.toFixed(3)) : baseWeight;
      
      if (weight > 0) {
        boxes.push({
          id: `box-${i + 1}`,
          name: `${prefix} ${i + 1}`,
          weight: weight,
          disabled: weight <= 0 || weight > totalStock
        });
        remainingStock = Number((remainingStock - weight).toFixed(3));
      }
    }
    
    return boxes.filter(b => b.weight > 0);
  }
  return [];
};

const Inventory = () => {
  const [_activeTab, _setActiveTab] = useState('Batches'); // 'Batches' | 'Stock Summary' | 'Full Record'
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'stock_desc' | 'stock_asc' | 'price_desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [isLoading, setIsLoading] = useState(true);
  
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [message, setMessage] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [localStockState, setLocalStockState] = useState({});
  const [savingStockIds, setSavingStockIds] = useState(new Set()); // Track which items are being saved
  const [deletingItemIds, setDeletingItemIds] = useState(new Set()); // Track which items are being deleted
  const [deletingAllItems, setDeletingAllItems] = useState(false); // Track if deleting all items
  const saveTimeoutsRef = useRef({}); // Store debounce timeouts

  useEffect(() => {
    fetchData();
    
    // Cleanup: flush all pending saves on unmount
    return () => {
      Object.keys(saveTimeoutsRef.current).forEach(itemId => {
        clearTimeout(saveTimeoutsRef.current[itemId]);
      });
    };
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
        try { savedItems = JSON.parse(savedRaw); } catch { /* ignore */ }
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
      const sourceCats = categoriesData && categoriesData.length > 0 ? categoriesData : initialCategories;
      const uniqueCategories = [];
      const seenCategoryNames = new Set();
      sourceCats.forEach(cat => {
        const catName = (cat.name || '').trim().toLowerCase();
        if (!seenCategoryNames.has(catName)) {
          seenCategoryNames.add(catName);
          uniqueCategories.push(cat);
        }
      });
      setCategories(uniqueCategories);
      
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

  const saveIndividualStock = (item) => {
    // Clear any existing timeout for this item (debounce)
    if (saveTimeoutsRef.current[item.id]) {
      clearTimeout(saveTimeoutsRef.current[item.id]);
    }

    // Set a new timeout for this item
    saveTimeoutsRef.current[item.id] = setTimeout(() => {
      performSaveStock(item);
    }, 500); // Wait 500ms after last change before saving
  };

  const performSaveStock = async (item) => {
    const stockData = localStockState[item.id];
    if (!stockData) return;

    const updatedQty = stockData.stock;
    const isOut = updatedQty === 0;

    // Mark as saving
    setSavingStockIds(prev => new Set(prev).add(item.id));

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({ stock: updatedQty, out_of_stock: isOut })
        .eq('id', item.id)
        .select('id');

      if (error) {
        throw error;
      }
      // An update blocked by row-level security returns no error, just zero rows.
      if (!data || data.length === 0) {
        throw new Error('the database refused the change (sign in with your real Supabase admin account)');
      }

      const updated = allItems.map(i => i.id === item.id ? { ...i, stock: updatedQty, out_of_stock: isOut } : i);
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      window.dispatchEvent(new Event('store_data_updated'));
      showMessage(`✅ Stock updated for "${item.name}" (${updatedQty} ${item.unit || 'kg'})`);
    } catch (err) {
      console.error('Error saving stock:', err);
      // Not kept locally: a change that isn't in the database never shows on the website menu.
      showMessage(`❌ Stock NOT saved to the website for "${item.name}": ${err.message}`);
    } finally {
      // Mark as done saving
      setSavingStockIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      delete saveTimeoutsRef.current[item.id];
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

  // Filtered & Sorted items
  const getFilteredItems = () => {
    let result = allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
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
      
      return matchesSearch && matchesFilter;
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
  const _categorySummaries = categories.map(cat => {
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
    if (!window.confirm(`Are you sure you want to delete "${item.name}" from the inventory?`)) return;
    
    // Mark item as deleting
    setDeletingItemIds(prev => new Set(prev).add(item.id));

    try {
      const { data, error } = await supabase.from('menu_items').delete().eq('id', item.id).select('id');
      if (error) {
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error('the database refused the change (sign in with your real Supabase admin account)');
      }
      
      const updated = allItems.filter(i => i.id !== item.id);
      setAllItems(updated);
      localStorage.setItem('menuItems', JSON.stringify(updated));
      
      // Dispatch event with small delay
      setTimeout(() => {
        window.dispatchEvent(new Event('store_data_updated'));
      }, 100);
      showMessage(`✅ "${item.name}" was deleted from the inventory`);
    } catch (err) {
      console.error('Error deleting item:', err);
      showMessage(`❌ "${item.name}" NOT deleted from the website: ${err.message}`);
    } finally {
      // Mark item as done deleting
      setDeletingItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleDeleteAllItems = async () => {
    console.log('🗑️ Delete All button clicked!');
    console.log('📊 Current items count:', allItems.length);
    
    if (!window.confirm(`⚠️ Are you sure you want to delete ALL ${allItems.length} items in the inventory? This action cannot be undone!`)) {
      console.log('❌ User cancelled deletion');
      return;
    }
    
    setDeletingAllItems(true);
    
    try {
      console.log('🚀 Starting deletion process...');
      
      // Delete from Supabase
      console.log('🔥 Deleting from Supabase...');
      const { data, error } = await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id');
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      if (allItems.length > 0 && (!data || data.length === 0)) {
        throw new Error('the database refused the change (sign in with your real Supabase admin account)');
      }
      
      console.log('✅ Supabase deletion successful');
      console.log('🧹 Clearing local state...');
      
      setAllItems([]);
      setLocalStockState({});
      localStorage.setItem('menuItems', JSON.stringify([]));
      
      // Dispatch event with small delay
      setTimeout(() => {
        window.dispatchEvent(new Event('store_data_updated'));
      }, 100);
      
      console.log('✅ All items deleted successfully!');
      showMessage('✅ All items have been deleted!');
      
    } catch (err) {
      console.error('❌ Error deleting all items:', err);
      showMessage(`❌ Items NOT deleted from the website: ${err.message}`);
    } finally {
      console.log('🏁 Delete process completed');
      setDeletingAllItems(false);
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (itemData) => {
    console.log('🔄 Saving item with data:', itemData);
    console.log('📦 Boxes being saved:', itemData.boxes);
    try {
      let savedItem;
      let nextItems;
      if (editingItem) {
        const { data, error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id)
          .select()
          .single();
        
        if (error) throw error;
        savedItem = data || { ...editingItem, ...itemData };
        
        nextItems = allItems.map(i => i.id === editingItem.id ? savedItem : i);
        setAllItems(nextItems);
        showMessage('✓ Product updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert([itemData])
          .select()
          .single();
        
        if (error) throw error;
        savedItem = data || { ...itemData, id: 'item_' + Date.now() };
        
        nextItems = [savedItem, ...allItems];
        setAllItems(nextItems);
        showMessage('✓ New item added to the inventory!');
      }

      setLocalStockState(prev => ({
        ...prev,
        [savedItem.id]: {
          stock: savedItem.stock ?? 0,
          low_stock_threshold: savedItem.low_stock_threshold || 5,
          unit: savedItem.unit || 'kg'
        }
      }));
      
      localStorage.setItem('menuItems', JSON.stringify(nextItems));
      window.dispatchEvent(new Event('store_data_updated'));
      setShowNewBatchModal(false);
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving item:', err);
      // Keep the form open so nothing typed is lost; the change is not on the website yet.
      const reason = err?.code === 'PGRST116'
        ? 'the database refused the change (sign in with your real Supabase admin account)'
        : err?.code === '22P02' && /integer/i.test(err.message || '')
          ? 'the database only accepts whole-number stock. Run fix_decimal_stock.sql in the Supabase SQL Editor to allow kg decimals like 45.3.'
          : err.message;
      showMessage(`❌ NOT saved to the website: ${reason}`);
    }
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
    showMessage('✓ Inventory CSV report downloaded!');
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
                Track stock, box weights, storage, and supply for Chilled & Frozen Hub
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
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Total Storage</span>
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
      </div>

      {/* Navigation Toolbar */}
      <div className="inventory-toolbar">
        <div className="toolbar-top">
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0c250d', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="#0c250d" /> Inventory Items & Stock Control
          </div>

          <div className="toolbar-actions">
            <button className="btn-tool primary" onClick={handleNewEntry}>
              <Plus size={16} /> Pasok / Bagong Batch
            </button>
            <button className="btn-tool" onClick={handleExportExcel}>
              <FileSpreadsheet size={16} color="#059669" /> Export Excel
            </button>
            <button className="btn-tool" onClick={fetchData} title="Refresh Data">
              <RefreshCw size={16} />
            </button>
            <button 
              className="btn-tool" 
              onClick={handleDeleteAllItems} 
              title="Delete All Items"
              style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}
            >
              <Trash2 size={16} /> Delete All
            </button>
          </div>
        </div>

        <div className="toolbar-bottom">
          {/* Status Filters */}
          <div className="status-filter-group">
            <button 
              className={`filter-chip ${activeFilter === 'All' ? 'active' : ''}`}
              onClick={() => setActiveFilter('All')}
            >
              All ({stats.all})
            </button>
            <button 
              className={`filter-chip chip-ok ${activeFilter === 'OK' ? 'active' : ''}`}
              onClick={() => setActiveFilter('OK')}
            >
              🟢 OK ({stats.ok})
            </button>

          </div>

          <div className="search-supplier-wrapper">
            <div className="search-input-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Hanapin: product, brand, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <X size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
              )}
            </div>

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
          </div>
        </div>
      </div>

      {/* PRODUCT BATCH GRID & CARDS */}
      {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
            <RefreshCw size={36} color="#0c250d" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0c250d' }}>Loading inventory data...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '20px', border: '1.5px solid #e2e8f0' }}>
            <Package size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>No matching products</div>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 16px' }}>Try changing the search filter or add a new product.</p>
            <button className="btn-new-batch" style={{ margin: '0 auto' }} onClick={handleNewEntry}>
              <Plus size={18} /> Add Item
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
                        {statusType === 'paubos' && '🟡 Low Stock'}
                        {statusType === 'ubos' && '🔴 Out of Stock'}
                      </span>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', margin: '12px 0 8px', border: '1px solid #e2e8f0' }}>
                      {(() => {
                        const availBoxes = getItemBoxes(item).filter(b => !b.disabled && !b.ordered);
                        return (
                          <>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📦</span> Available Boxes ({availBoxes.length})
                            </div>
                            {availBoxes.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '70px', overflowY: 'auto' }}>
                                {availBoxes.map((b, idx) => (
                                  <span 
                                    key={b.id || idx} 
                                    style={{ 
                                      background: '#ecfdf5', 
                                      border: '1px solid #a7f3d0', 
                                      color: '#047857', 
                                      padding: '2px 8px', 
                                      borderRadius: '8px', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 700 
                                    }}
                                  >
                                    {b.name || `Box ${idx+1}`}: <strong>{b.weight} kg</strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                No boxes available
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div className="card-progress-section">
                      <div className="progress-track">
                        <div 
                          className={`progress-fill-bar ${statusType}`}
                          style={{ width: `${Math.min((currentStock / (threshold * 2)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', justifyContent: 'flex-end' }}>
                      <button 
                        type="button"
                        onClick={() => handleEditItem(item)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        <Edit2 size={14} color="#059669" /> Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} color="#dc2626" /> Delete
                      </button>
                    </div>
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
                  <th>Stock Level</th>
                  <th>Available Boxes</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Mga Aksyon</th>
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
                  const availableBoxes = getItemBoxes(item).filter(b => !b.disabled && !b.ordered);

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
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {currentStock} {item.unit || 'kg'}
                      </td>
                      <td>
                        {availableBoxes.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                            {availableBoxes.map((b, idx) => (
                              <span 
                                key={b.id || idx} 
                                style={{ 
                                  background: '#ecfdf5', 
                                  border: '1px solid #a7f3d0', 
                                  color: '#047857', 
                                  padding: '2px 6px', 
                                  borderRadius: '6px', 
                                  fontSize: '0.72rem', 
                                  fontWeight: 700 
                                }}
                              >
                                {b.name}: {b.weight}kg
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No boxes available</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: '#64748b' }}>{threshold} {item.unit || 'kg'}</td>
                      <td>
                        <span className={`status-badge ${statusType}`}>
                          {statusType === 'ok' && '🟢 OK'}
                          {statusType === 'paubos' && '🟡 Low Stock'}
                          {statusType === 'ubos' && '🔴 Out of Stock'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button 
                            type="button"
                            onClick={() => handleEditItem(item)}
                            style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#0f172a', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Edit Product"
                          >
                            <Edit2 size={14} color="#059669" /> Edit
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            style={{ padding: '6px 10px', background: '#fee2e2', border: 'none', borderRadius: '8px', color: '#dc2626', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Delete Product"
                          >
                            <Trash2 size={14} color="#dc2626" /> Delete
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
      }
      {/* NEW / EDIT BATCH MODAL */}
      {(showNewBatchModal || showEditModal) && (
        <BatchModal 
          item={editingItem}
          categories={categories}
          onSave={handleSaveItem}
          onClose={() => {
            setShowNewBatchModal(false);
            setShowEditModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

const BatchModal = ({ item, categories, onSave, onClose }) => {
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

  const [editableBoxes, setEditableBoxes] = useState(() => {
    if (item && Array.isArray(item.boxes) && item.boxes.length > 0) {
      return item.boxes.map((b, i) => ({
        id: b.id || `box-${i + 1}`,
        name: b.name || `Box ${i + 1}`,
        weight: b.weight ?? 15.00,
        stockQty: b.stockQty !== undefined ? b.stockQty : 1,
        pricePerKg: b.pricePerKg !== undefined ? b.pricePerKg : '',
        price: b.price !== undefined ? b.price : '',
        disabled: Boolean(b.disabled || b.ordered)
      }));
    }
    return [
      { id: 'box-1', name: 'Box 1', weight: 15.30, stockQty: 1, pricePerKg: '', price: '', disabled: false },
      { id: 'box-2', name: 'Box 2', weight: 15.00, stockQty: 1, pricePerKg: '', price: '', disabled: false }
    ];
  });

  const [_imagePreview, setImagePreview] = useState(item?.image || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageStatus, setImageStatus] = useState('');
  const imageInputRef = useRef(null);

  // Shrinks phone photos (often 3-8 MB) to a max 900px JPEG so the menu stays fast.
  const resizeImage = (file, maxSize = 900, quality = 0.82) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not process image'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unsupported image file')); };
    img.src = url;
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageStatus('❌ Please choose an image file.');
      return;
    }

    setIsUploadingImage(true);
    setImageStatus('Uploading image...');
    try {
      const blob = await resizeImage(file);
      const filePath = `products/product_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (!uploadError) {
        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        if (data?.publicUrl) {
          setFormData(prev => ({ ...prev, image: data.publicUrl }));
          setImagePreview(data.publicUrl);
          setImageStatus('✅ Image uploaded. Click Save to apply it.');
          return;
        }
      }

      // Storage bucket not available: store the resized image inside the product instead.
      console.warn('Storage upload failed, using embedded image:', uploadError);
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setFormData(prev => ({ ...prev, image: dataUrl }));
      setImagePreview(dataUrl);
      setImageStatus('✅ Image ready (saved with the product). Click Save to apply it.');
    } catch (err) {
      console.error('Image upload error:', err);
      setImageStatus(`❌ Could not upload image: ${err.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    if (item && Array.isArray(item.boxes) && item.boxes.length > 0) {
      setEditableBoxes(item.boxes.map((b, i) => ({
        id: b.id || `box-${i + 1}`,
        name: b.name || `Box ${i + 1}`,
        weight: b.weight ?? 15.00,
        stockQty: b.stockQty !== undefined ? b.stockQty : 1,
        pricePerKg: b.pricePerKg !== undefined ? b.pricePerKg : '',
        price: b.price !== undefined ? b.price : '',
        disabled: Boolean(b.disabled || b.ordered)
      })));
    }
  }, [item]);

  // Auto calculate total weight
  const totalCalculatedWeight = useMemo(() => {
    if (editableBoxes.length === 0) return '0';
    const sum = editableBoxes.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
    return sum.toFixed(3);
  }, [editableBoxes]);

  const handleAddBox = () => {
    if (editableBoxes.length >= 6) {
      alert('A maximum of 6 boxes is allowed.');
      return;
    }
    const nextIdx = editableBoxes.length + 1;
    setEditableBoxes(prev => [
      ...prev,
      { id: `box-${Date.now()}`, name: `Box ${nextIdx}`, weight: 15.00, disabled: false }
    ]);
  };

  // Functional update so back-to-back calls (e.g. weight then auto price) don't overwrite each other.
  const handleUpdateBox = (index, field, val) => {
    setEditableBoxes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Plain-text number fields: keep what the user types (so "15." or an empty field is allowed while editing).
  const cleanDecimal = (value) => value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
  const cleanWhole = (value) => value.replace(/[^0-9]/g, '');
  const toNumberOrBlank = (value) => (value === '' || value === undefined || value === null ? '' : (parseFloat(value) || 0));

  const handleRemoveBox = (index) => {
    setEditableBoxes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.category_id || !formData.price) {
      alert('Please fill in the required fields: Product Name, Category, and Price');
      return;
    }

    const activeBoxesWeight = editableBoxes.reduce((acc, b) => {
      if (b.disabled) return acc;
      const w = parseFloat(b.weight) || 0;
      const qty = b.stockQty !== undefined && b.stockQty !== '' ? (parseInt(b.stockQty, 10) || 0) : 1;
      return acc + (w * qty);
    }, 0);

    const finalStock = editableBoxes.length > 0
      ? Number(activeBoxesWeight.toFixed(3)) 
      : (parseFloat(formData.stock) || 0);

    const finalPrice = parseFloat(formData.price || 0);

    let generatedBoxes = item?.boxes || [];
    if (editableBoxes.length > 0) {
      generatedBoxes = editableBoxes.map((b, i) => ({
        id: b.id || `box-${i + 1}`,
        name: b.name || `Box ${i + 1}`,
        weight: parseFloat(b.weight) || 0,
        stockQty: b.stockQty !== undefined && b.stockQty !== '' ? (parseInt(b.stockQty, 10) || 0) : 1,
        pricePerKg: toNumberOrBlank(b.pricePerKg),
        price: toNumberOrBlank(b.price),
        disabled: Boolean(b.disabled),
        ordered: Boolean(b.ordered || false) // Keep ordered separate from disabled
      }));
    }

    onSave({
      ...formData,
      price: finalPrice,
      promo_price: formData.promo_price ? parseFloat(formData.promo_price) : null,
      stock: finalStock,
      boxes: generatedBoxes,
      low_stock_threshold: parseFloat(formData.low_stock_threshold) || 5,
      out_of_stock: Boolean(formData.out_of_stock || finalStock === 0),
      description: formData.description || ''
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
              Record new arrivals — storage and weight of each box
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
                  <option value="">Select a category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group-item" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Price (₱) *</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input-styled"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g. 500"
                  required
                />
              </div>
              <div className="form-group-item" style={{ margin: 0 }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Promo Price (₱ - Optional)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="form-input-styled"
                  value={formData.promo_price || ''}
                  onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
                  placeholder="Discount price"
                />
              </div>
            </div>

            <div className="form-group-item" style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Description</label>
              <textarea 
                className="form-input-styled"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short product description..."
                style={{ minHeight: '60px' }}
              />
            </div>

            <div className="form-group-item" style={{ margin: 0 }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>Product Image</label>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ width: '96px', height: '96px', borderRadius: '14px', border: '2px dashed #cbd5e1', background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Product preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon size={30} color="#94a3b8" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '180px' }}>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploadingImage}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '10px', border: 'none', background: '#1e8b00', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: isUploadingImage ? 'wait' : 'pointer', opacity: isUploadingImage ? 0.7 : 1 }}
                    >
                      <Camera size={16} /> {isUploadingImage ? 'Uploading...' : formData.image ? 'Change Image' : 'Upload Image'}
                    </button>
                    {formData.image && !isUploadingImage && (
                      <button
                        type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, image: '' })); setImagePreview(''); setImageStatus(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid #fecaca', background: 'white', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    )}
                  </div>
                  {imageStatus && (
                    <span style={{ fontSize: '0.8rem', color: imageStatus.startsWith('❌') ? '#dc2626' : '#475569' }}>{imageStatus}</span>
                  )}
                  <input
                    type="text"
                    className="form-input-styled"
                    value={formData.image?.startsWith('data:') ? '' : (formData.image || '')}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="or paste an image link (https://...)"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>

            {/* BOX WEIGHT CARD SECTION - EXACT MATCH TO USER IMAGE */}
            <div style={{ background: '#f4f6f8', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '12px', 
                fontWeight: 800, 
                fontSize: '1.1rem', 
                color: '#1e293b', 
                marginBottom: '20px', 
                fontFamily: 'Outfit, sans-serif',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '2px solid #cbd5e1',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #0c250d 0%, #065f46 100%)',
                    color: 'white',
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    boxShadow: '0 6px 20px rgba(12, 37, 13, 0.3)'
                  }}>
                    📦
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', color: '#0c250d', letterSpacing: '-0.5px' }}>
                      Box Weights & List
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                      Live Editable • Real-time Inventory Tracking
                    </div>
                  </div>
                </div>
                <div style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: '1px solid #a7f3d0',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  ⚡ Live System
                </div>
              </div>

              {/* Editable Boxes */}
              {(
                /* Mode: Editable Available Boxes */
                <div>
                  {/* Available Stock & Box Count Summary Banner */}
                  {(() => {
                    const unitPrice = parseFloat(formData.price || 0);
                    const avail = editableBoxes.filter(b => !b.disabled);
                    const availCount = avail.length;
                    const availWeight = avail.reduce((sum, b) => sum + (parseFloat(b.weight) || 0), 0);
                    const totalVal = avail.reduce((sum, b) => {
                      if (b.price !== undefined && b.price !== null && b.price !== '') {
                        return sum + Number(b.price);
                      }
                      return sum + ((parseFloat(b.weight) || 0) * unitPrice);
                    }, 0);

                    return (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
                        border: '2px solid #10b981', 
                        padding: '20px 24px', 
                        borderRadius: '16px', 
                        marginBottom: '20px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '0.9rem', 
                        flexWrap: 'wrap', 
                        gap: '16px',
                        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: 'white',
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.8rem',
                            boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
                          }}>
                            📦
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#065f46', fontSize: '1.1rem', marginBottom: '4px' }}>
                              Available Boxes Ready for Distribution
                            </div>
                            <div style={{ 
                              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                              color: 'white', 
                              padding: '6px 16px', 
                              borderRadius: '12px', 
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                            }}>
                              <span style={{ fontSize: '1rem' }}>🚛</span>
                              {availCount} Box{availCount !== 1 ? 'es' : ''} Stock • {availWeight.toFixed(1)} kg Total
                            </div>
                          </div>
                        </div>
                        {unitPrice > 0 && (
                          <div style={{ fontWeight: 800, color: '#047857' }}>
                            Total Value: <span style={{ color: '#059669' }}>₱{Number(totalVal.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px' }}>
                    {editableBoxes.map((b, idx) => {
                      const unitPrice = parseFloat(formData.price || 0);
                      const boxPKg = b.pricePerKg !== undefined && b.pricePerKg !== '' ? parseFloat(b.pricePerKg) : unitPrice;
                      const computedPrice = ((parseFloat(b.weight) || 0) * boxPKg).toFixed(2);
                      const displayPrice = (b.price !== undefined && b.price !== null && b.price !== '') ? b.price : computedPrice;

                      return (
                        <div key={b.id || idx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', background: 'white', padding: '12px', borderRadius: '12px', border: b.disabled ? '1px dashed #fca5a5' : '1px solid #cbd5e1', opacity: b.disabled ? 0.75 : 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', minWidth: '25px' }}>#{idx + 1}</span>

                          <input 
                            type="text"
                            className="form-input-styled"
                            value={b.name}
                            onChange={(e) => handleUpdateBox(idx, 'name', e.target.value)}
                            placeholder="Name (e.g. Box 1)"
                            style={{ flex: '1 1 100px', minWidth: '100px', background: '#f8fafc', padding: '6px 10px', fontSize: '0.85rem' }}
                          />

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Weight:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-input-styled"
                              value={b.weight ?? ''}
                              onChange={(e) => {
                                const raw = cleanDecimal(e.target.value);
                                handleUpdateBox(idx, 'weight', raw);
                                if (b.price === undefined || b.price === null || b.price === '') {
                                  if (boxPKg > 0) handleUpdateBox(idx, 'price', Number(((parseFloat(raw) || 0) * boxPKg).toFixed(2)));
                                }
                              }}
                              placeholder="kg"
                              style={{ width: '70px', background: '#f8fafc', padding: '6px 8px', fontSize: '0.85rem' }}
                            />
                            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>kg</span>
                          </div>

                          {/* Editable Price Per Kg Field */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0284c7' }}>₱/kg:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-input-styled"
                              value={b.pricePerKg !== undefined ? b.pricePerKg : ''}
                              onChange={(e) => {
                                const customPKg = cleanDecimal(e.target.value);
                                handleUpdateBox(idx, 'pricePerKg', customPKg);

                                const currentW = parseFloat(b.weight) || 0;
                                const activePKg = customPKg !== '' ? (parseFloat(customPKg) || 0) : unitPrice;
                                handleUpdateBox(idx, 'price', Number((currentW * activePKg).toFixed(2)));
                              }}
                              placeholder={unitPrice.toString()}
                              style={{ width: '70px', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}
                              title={`Edit the price per kilo for ${b.name}`}
                            />
                          </div>

                          {/* Editable Stock Qty */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb' }}>Stocks:</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              className="form-input-styled"
                              value={b.stockQty !== undefined ? b.stockQty : 1}
                              onChange={(e) => handleUpdateBox(idx, 'stockQty', cleanWhole(e.target.value))}
                              style={{ width: '60px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 800, color: '#1d4ed8' }}
                            />
                          </div>

                          {/* Editable Total Price Field */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>Total ₱:</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-input-styled"
                              value={displayPrice}
                              onChange={(e) => handleUpdateBox(idx, 'price', cleanDecimal(e.target.value))}
                              placeholder="Total"
                              style={{ width: '85px', background: '#f0fdf4', border: '1px solid #a7f3d0', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', cursor: 'pointer', color: b.disabled ? '#dc2626' : '#047857', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              <input 
                                type="checkbox"
                                checked={Boolean(b.disabled)}
                                onChange={(e) => handleUpdateBox(idx, 'disabled', e.target.checked)}
                              />
                              {b.disabled ? '❌ Sold' : 'Avail'}
                            </label>

                            <button 
                              type="button" 
                              onClick={() => handleRemoveBox(idx)}
                              style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Bura Box"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    type="button"
                    onClick={handleAddBox}
                    style={{ border: '1px dashed #059669', background: '#ecfdf5', color: '#047857', borderRadius: '10px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={15} /> Add Box
                  </button>
                </div>
              )}
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
              Record Stock In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inventory;
