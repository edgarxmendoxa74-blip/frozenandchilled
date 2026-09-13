import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    LayoutDashboard,
    LogOut,
    Save,
    Plus,
    Trash2,
    Edit2,
    Package,
    Tag,
    Settings,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    X,
    List,
    CreditCard,
    ShoppingBag,
    Copy,
    Clock,
    MapPin,
    Phone,
    Printer,
    FileText,
    Camera,
    Utensils,
    Truck,
    Check,
    AlertTriangle,
    Minus,
    ExternalLink
} from 'lucide-react';
import { categories as initialCategories, menuItems as initialItems } from '../data/MenuData';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('inventory'); // inventory, menu, categories, orders, orderTypes, payment, settings
    const [message, setMessage] = useState('');

    // --- STATE MANAGEMENT ---
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('menuItems');
        return saved ? JSON.parse(saved) : initialItems;
    });

    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('categories');
        return saved ? JSON.parse(saved) : initialCategories;
    });

    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('orders');
        return saved ? JSON.parse(saved) : [];
    });

    const [orderTypes, setOrderTypes] = useState(() => {
        const saved = localStorage.getItem('orderTypes');
        return saved ? JSON.parse(saved) : [
            { id: 'pickup', name: 'Pickup' },
            { id: 'delivery', name: 'Delivery' }
        ];
    });

    const [paymentSettings, setPaymentSettings] = useState(() => {
        const saved = localStorage.getItem('paymentSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed;
        }
        return [
            { id: 'gcash', name: 'GCash', accountNumber: '09947246294', accountName: 'Chilled And Frozen Hub', is_active: true },
            { id: 'cod', name: 'Cash on Delivery', accountNumber: 'N/A', accountName: 'Cash Payment', is_active: true }
        ];
    });

    const [storeSettings, setStoreSettings] = useState(() => {
        const saved = localStorage.getItem('storeSettings');
        return saved ? JSON.parse(saved) : {
            manual_status: 'auto',
            open_time: '08:00',
            close_time: '19:00',
            store_name: 'Chilled And Frozen Hub',
            address: 'Caltex Road, Banaba South, Batangas City',
            contact: '09947246294 / 09949314800',
            logo_url: '/logo.png',
            banner_images: []
        };
    });

    // --- FETCH DATA FROM SUPABASE ---
    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
                if (catData && catData.length > 0) setCategories(catData);

                const { data: itemData } = await supabase.from('menu_items').select('*').order('sort_order', { ascending: true });
                if (itemData && itemData.length > 0) setItems(itemData);

                const { data: payData } = await supabase.from('payment_settings').select('*');
                if (payData && payData.length > 0) setPaymentSettings(payData);

                const { data: typeData } = await supabase.from('order_types').select('*');
                if (typeData && typeData.length > 0) setOrderTypes(typeData);

                const { data: storeData } = await supabase.from('store_settings').select('*').limit(1).single();
                if (storeData) setStoreSettings(storeData);

                const { data: orderData } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
                if (orderData && orderData.length > 0) setOrders(orderData);
            } catch (err) {
                console.error('Error fetching admin data:', err);
            }
        };
        fetchAdminData();
    }, []);

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3500);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_bypass');
        navigate('/admin');
    };

    // ─────────────────────────────────────────────────────────────
    // COMPONENT 1: INVENTORY MANAGER (DEDICATED STOCK CONTROL CENTER)
    // ─────────────────────────────────────────────────────────────
    const InventoryManager = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const [filterCategory, setFilterCategory] = useState('all');
        const [stockFilter, setStockFilter] = useState('all'); // all, low, out, instock
        const [localStockState, setLocalStockState] = useState({});
        const [isSaving, setIsSaving] = useState(false);

        useEffect(() => {
            const stateObj = {};
            items.forEach(item => {
                stateObj[item.id] = {
                    stock: item.stock ?? 0,
                    low_stock_threshold: item.low_stock_threshold || item.lowStockThreshold || 5,
                    out_of_stock: Boolean(item.out_of_stock || item.stock === 0),
                    unit: item.unit || 'kg'
                };
            });
            setLocalStockState(stateObj);
        }, [items]);

        const updateItemStock = (id, field, value) => {
            setLocalStockState(prev => {
                const current = prev[id] || { stock: 0, low_stock_threshold: 5, out_of_stock: false, unit: 'kg' };
                let updated = { ...current, [field]: value };
                if (field === 'stock') {
                    const stockNum = Math.max(0, Number(value));
                    updated.stock = stockNum;
                    if (stockNum === 0) updated.out_of_stock = true;
                    else if (stockNum > 0 && current.out_of_stock) updated.out_of_stock = false;
                }
                return { ...prev, [id]: updated };
            });
        };

        const adjustStock = (id, delta) => {
            const currentStock = localStockState[id]?.stock ?? 0;
            const newStock = Math.max(0, currentStock + delta);
            updateItemStock(id, 'stock', newStock);
        };

        const saveIndividualStock = async (item) => {
            const stockData = localStockState[item.id];
            if (!stockData) return;

            const updatePayload = {
                stock: Number(stockData.stock),
                low_stock_threshold: Number(stockData.low_stock_threshold),
                out_of_stock: Boolean(stockData.out_of_stock || stockData.stock === 0)
            };

            const { data, error } = await supabase.from('menu_items').update(updatePayload).eq('id', item.id).select().single();
            if (error) {
                console.error(error);
                showMessage(`Error saving stock for ${item.name}: ${error.message}`);
                return;
            }

            setItems(items.map(i => i.id === item.id ? { ...i, ...updatePayload } : i));
            showMessage(`✅ Stock updated for "${item.name}"!`);
        };

        const saveAllInventory = async () => {
            setIsSaving(true);
            try {
                const updates = items.map(item => {
                    const stockData = localStockState[item.id] || {};
                    return {
                        id: item.id,
                        stock: Number(stockData.stock ?? item.stock ?? 0),
                        low_stock_threshold: Number(stockData.low_stock_threshold ?? item.low_stock_threshold ?? 5),
                        out_of_stock: Boolean(stockData.out_of_stock || Number(stockData.stock) === 0)
                    };
                });

                for (const u of updates) {
                    await supabase.from('menu_items').update({
                        stock: u.stock,
                        low_stock_threshold: u.low_stock_threshold,
                        out_of_stock: u.out_of_stock
                    }).eq('id', u.id);
                }

                setItems(items.map(item => {
                    const stockData = localStockState[item.id] || {};
                    return {
                        ...item,
                        stock: Number(stockData.stock ?? item.stock ?? 0),
                        low_stock_threshold: Number(stockData.low_stock_threshold ?? item.low_stock_threshold ?? 5),
                        out_of_stock: Boolean(stockData.out_of_stock || Number(stockData.stock) === 0)
                    };
                }));

                showMessage('🎉 All inventory stock levels saved to database successfully!');
            } catch (err) {
                console.error(err);
                showMessage(`Error saving inventory: ${err.message}`);
            } finally {
                setIsSaving(false);
            }
        };

        // KPI Counts
        const totalProductsCount = items.length;
        const lowStockCount = items.filter(i => {
            const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
            const th = localStockState[i.id]?.low_stock_threshold ?? i.low_stock_threshold ?? 5;
            const isOut = localStockState[i.id]?.out_of_stock || s === 0;
            return !isOut && s > 0 && s <= th;
        }).length;
        const outOfStockCount = items.filter(i => {
            const s = localStockState[i.id]?.stock ?? i.stock ?? 0;
            const isOut = localStockState[i.id]?.out_of_stock || s === 0;
            return isOut;
        }).length;
        const inStockCount = totalProductsCount - lowStockCount - outOfStockCount;

        // Filtering
        const filteredInventory = items.filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = filterCategory === 'all' || item.category_id === filterCategory;

            const s = localStockState[item.id]?.stock ?? item.stock ?? 0;
            const th = localStockState[item.id]?.low_stock_threshold ?? item.low_stock_threshold ?? 5;
            const isOut = localStockState[item.id]?.out_of_stock || s === 0;
            const isLow = !isOut && s > 0 && s <= th;

            let matchesStock = true;
            if (stockFilter === 'low') matchesStock = isLow;
            if (stockFilter === 'out') matchesStock = isOut;
            if (stockFilter === 'instock') matchesStock = !isOut && !isLow;

            return matchesSearch && matchesCat && matchesStock;
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* KPI Metrics Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Products</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>{totalProductsCount}</div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Store catalog items</span>
                    </div>

                    <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '18px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🟢 Good Stock</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#15803d', margin: '4px 0' }}>{inStockCount}</div>
                        <span style={{ fontSize: '0.78rem', color: '#166534' }}>Sufficient quantity</span>
                    </div>

                    <div style={{ background: '#fffbe6', padding: '20px', borderRadius: '18px', border: '1px solid #fef08a' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>⚠️ Low Stock Alert</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#b45309', margin: '4px 0' }}>{lowStockCount}</div>
                        <span style={{ fontSize: '0.78rem', color: '#854d0e' }}>Needs replenishment</span>
                    </div>

                    <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '18px', border: '1px solid #fecaca' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚫 Out of Stock</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>{outOfStockCount}</div>
                        <span style={{ fontSize: '0.78rem', color: '#991b1b' }}>Hidden from buyers</span>
                    </div>
                </div>

                {/* Main Inventory Panel */}
                <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>📦 Stock & Inventory Control Center</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Manage stock levels, edit alert thresholds, and toggle stock availability per product.</p>
                        </div>
                        <button onClick={saveAllInventory} disabled={isSaving} style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(30,139,0,0.3)' }}>
                            <Save size={18} /> {isSaving ? 'Saving Updates...' : 'Save All Inventory Updates'}
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                            <button onClick={() => setStockFilter('all')} style={{ padding: '7px 15px', borderRadius: '9px', border: 'none', background: stockFilter === 'all' ? 'white' : 'transparent', color: stockFilter === 'all' ? '#0f172a' : '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', boxShadow: stockFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}>All ({items.length})</button>
                            <button onClick={() => setStockFilter('low')} style={{ padding: '7px 15px', borderRadius: '9px', border: 'none', background: stockFilter === 'low' ? '#fef3c7' : 'transparent', color: stockFilter === 'low' ? '#92400e' : '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>⚠️ Low Stock ({lowStockCount})</button>
                            <button onClick={() => setStockFilter('out')} style={{ padding: '7px 15px', borderRadius: '9px', border: 'none', background: stockFilter === 'out' ? '#fee2e2' : 'transparent', color: stockFilter === 'out' ? '#991b1b' : '#64748b', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>🚫 Out of Stock ({outOfStockCount})</button>
                        </div>

                        <input
                            type="text"
                            placeholder="Search product..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, width: '220px', padding: '8px 14px', fontSize: '0.85rem' }}
                        />

                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ ...inputStyle, width: '190px', padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <th style={{ padding: '12px' }}>Product</th>
                                    <th style={{ padding: '12px' }}>Category</th>
                                    <th style={{ padding: '12px' }}>Stock Quantity (Quick Adjust)</th>
                                    <th style={{ padding: '12px' }}>Alert Threshold</th>
                                    <th style={{ padding: '12px' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No inventory records match your filter.</td></tr>
                                ) : filteredInventory.map(item => {
                                    const stockData = localStockState[item.id] || { stock: item.stock ?? 0, low_stock_threshold: item.low_stock_threshold || 5, out_of_stock: Boolean(item.out_of_stock || item.stock === 0), unit: item.unit || 'kg' };
                                    const s = stockData.stock;
                                    const th = stockData.low_stock_threshold;
                                    const isOut = stockData.out_of_stock || s === 0;
                                    const isLow = !isOut && s > 0 && s <= th;

                                    return (
                                        <tr key={item.id} style={{ background: isOut ? '#fff1f2' : isLow ? '#fffbeb' : '#f8fafc', transition: 'all 0.2s' }}>
                                            <td style={{ padding: '12px 15px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <img src={item.image} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.name}</div>
                                                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: {stockData.unit}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ padding: '4px 10px', background: '#e2e8f0', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                                                    {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {/* Quick Adjust Buttons */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button onClick={() => adjustStock(item.id, -10)} style={quickBtnStyle}>-10</button>
                                                    <button onClick={() => adjustStock(item.id, -1)} style={quickBtnStyle}>-1</button>
                                                    <input
                                                        type="number"
                                                        value={s}
                                                        onChange={(e) => updateItemStock(item.id, 'stock', e.target.value)}
                                                        style={{ width: '70px', padding: '6px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                    />
                                                    <button onClick={() => adjustStock(item.id, 1)} style={quickBtnStyle}>+1</button>
                                                    <button onClick={() => adjustStock(item.id, 10)} style={quickBtnStyle}>+10</button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>≤</span>
                                                    <input
                                                        type="number"
                                                        value={th}
                                                        onChange={(e) => updateItemStock(item.id, 'low_stock_threshold', Number(e.target.value))}
                                                        style={{ width: '55px', padding: '5px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                                    />
                                                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{stockData.unit}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <button
                                                    onClick={() => updateItemStock(item.id, 'out_of_stock', !isOut)}
                                                    style={{
                                                        padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                                        fontWeight: 800, fontSize: '0.78rem',
                                                        background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
                                                        color: isOut ? '#991b1b' : isLow ? '#92400e' : '#166534',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {isOut ? '🔴 Out of Stock' : isLow ? '⚠️ Low Stock' : '🟢 In Stock'}
                                                </button>
                                            </td>
                                            <td style={{ padding: '12px 15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => saveIndividualStock(item)}
                                                    style={{ padding: '6px 14px', borderRadius: '8px', background: '#059669', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
                                                >
                                                    Save Stock
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────
    // COMPONENT 2: MENU MANAGER (PRODUCT CATALOG MANAGEMENT)
    // ─────────────────────────────────────────────────────────────
    const MenuManager = () => {
        const [editingItem, setEditingItem] = useState(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [filterCategory, setFilterCategory] = useState('all');
        const [tempVariations, setTempVariations] = useState([]);
        const [tempFlavors, setTempFlavors] = useState([]);
        const [tempAddons, setTempAddons] = useState([]);

        useEffect(() => {
            if (editingItem) {
                setTempVariations(editingItem.variations || []);
                setTempFlavors(editingItem.flavors || []);
                setTempAddons(editingItem.addons || []);
            }
        }, [editingItem]);

        const handleSubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const itemData = {
                name: formData.get('name'),
                description: formData.get('description'),
                price: Number(formData.get('price')),
                promo_price: formData.get('promoPrice') ? Number(formData.get('promoPrice')) : null,
                unit: formData.get('unit') || 'kg',
                min_order_note: formData.get('minOrderNote') || '',
                category_id: formData.get('categoryId'),
                image: editingItem.image || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80',
                variations: tempVariations,
                flavors: tempFlavors,
                addons: tempAddons,
                stock: Number(formData.get('stock') || 0),
                low_stock_threshold: Number(formData.get('lowStockThreshold') || 5),
                out_of_stock: formData.get('outOfStock') === 'on' || Number(formData.get('stock') || 0) === 0
            };

            let finalItem;
            if (editingItem.id === 'new') {
                if (!itemData.category_id) { showMessage('Please select a category first.'); return; }
                const { data, error } = await supabase.from('menu_items').insert([itemData]).select().single();
                if (error) { console.error(error); showMessage(`Error saving product: ${error.message}`); return; }
                finalItem = data;
                setItems([...items, finalItem]);
            } else {
                const { data, error } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id).select().single();
                if (error) { console.error(error); showMessage(`Error updating product: ${error.message}`); return; }
                finalItem = data;
                setItems(items.map(i => i.id === finalItem.id ? finalItem : i));
            }

            setEditingItem(null);
            showMessage('Product catalog details saved successfully!');
        };

        const deleteItem = async (id) => {
            if (window.confirm('Are you sure you want to delete this product?')) {
                const { error } = await supabase.from('menu_items').delete().eq('id', id);
                if (error) { console.error(error); showMessage(`Error deleting product: ${error.message}`); return; }
                setItems(items.filter(i => i.id !== id));
                showMessage('Product deleted.');
            }
        };

        const filteredItems = items.filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
            return matchesSearch && matchesCategory;
        });

        if (!editingItem) return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>🍽️ Product Catalog & Menu Editor</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Create, update pricing, descriptions, images, and category assignments.</p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Search catalog..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, width: '220px', padding: '8px 14px', fontSize: '0.85rem' }}
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ ...inputStyle, width: '180px', padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setEditingItem({ id: 'new', category_id: categories[0]?.id, stock: 20, low_stock_threshold: 5, unit: 'kg' })} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                            <Plus size={18} /> Add New Product
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <th style={{ padding: '12px' }}>Product</th>
                                <th style={{ padding: '12px' }}>Category</th>
                                <th style={{ padding: '12px' }}>Price / Unit</th>
                                <th style={{ padding: '12px' }}>Min Order Tag</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No products found in catalog.</td></tr>
                            ) : filteredItems.map(item => (
                                <tr key={item.id} style={{ background: '#f8fafc' }}>
                                    <td style={{ padding: '12px 15px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img src={item.image} style={{ width: '45px', height: '45px', borderRadius: '10px', objectFit: 'cover' }} alt="" />
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{item.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.description || 'No description'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ padding: '4px 10px', background: '#e2e8f0', borderRadius: '16px', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                                            {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {item.promo_price ? (
                                            <div>
                                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.75rem', marginRight: '4px' }}>₱{item.price}</span>
                                                <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.92rem' }}>₱{item.promo_price} /{item.unit || 'kg'}</span>
                                            </div>
                                        ) : (
                                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>₱{item.price} /{item.unit || 'kg'}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {item.min_order_note ? (
                                            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 800 }}>
                                                {item.min_order_note}
                                            </span>
                                        ) : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '12px 15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => setEditingItem(item)} style={{ padding: '6px 12px', borderRadius: '8px', background: '#f1f5f9', color: 'var(--primary)', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Edit2 size={15} /> Edit
                                            </button>
                                            <button onClick={() => deleteItem(item.id)} style={{ padding: '6px 10px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer' }} title="Delete">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );

        // Edit/Add Form
        return (
            <div style={{ background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0c250d' }}>{editingItem.id === 'new' ? '✨ Create New Product' : `✏️ Edit Product: ${editingItem.name}`}</h3>
                    <button onClick={() => setEditingItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '18px', marginBottom: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Product Name</label>
                            <input name="name" defaultValue={editingItem.name} placeholder="e.g. Beef Shortloin St. Helens" required style={inputStyle} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Category</label>
                            <select name="categoryId" defaultValue={editingItem.category_id} style={inputStyle} required>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Description</label>
                            <textarea name="description" defaultValue={editingItem.description} placeholder="Short product description..." style={{ ...inputStyle, minHeight: '80px' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Price (₱)</label>
                                <input name="price" type="number" step="0.01" defaultValue={editingItem.price} placeholder="1850" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Promo Price (₱ - Optional)</label>
                                <input name="promoPrice" type="number" step="0.01" defaultValue={editingItem.promo_price || ''} placeholder="Discount price" style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Unit</label>
                                <input name="unit" defaultValue={editingItem.unit || 'kg'} placeholder="kg, slab, box, sack" required style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Current Stock Qty</label>
                                <input name="stock" type="number" defaultValue={editingItem.stock ?? 20} placeholder="Stock level" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Low Stock Alert Threshold</label>
                                <input name="lowStockThreshold" type="number" defaultValue={editingItem.low_stock_threshold || editingItem.lowStockThreshold || 5} placeholder="Alert limit" required style={inputStyle} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Minimum Order Note / Tag (Optional)</label>
                            <input name="minOrderNote" defaultValue={editingItem.min_order_note || editingItem.minOrderNote || ''} placeholder="e.g. Minimum 1 Slab, Wholesale min 1 box" style={inputStyle} />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>Product Image</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                {editingItem.image && <img src={editingItem.image} style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover' }} alt="" />}
                                <input type="file" accept="image/*" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setEditingItem({ ...editingItem, image: reader.result });
                                        reader.readAsDataURL(file);
                                    }
                                }} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                            <input name="outOfStock" type="checkbox" defaultChecked={editingItem.out_of_stock} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                            <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155', cursor: 'pointer' }}>Mark product as Out of Stock</label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" style={{ padding: '12px 28px', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,139,0,0.3)' }}>
                            Save Product Details
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────
    // OTHER EXISTING SUB-COMPONENTS (CATEGORIES, ORDERS, SETTINGS)
    // ─────────────────────────────────────────────────────────────
    const CategoryManager = () => {
        const [editingCat, setEditingCat] = useState(null);

        const handleSaveCat = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get('name');

            if (editingCat.id === 'new') {
                const { data, error } = await supabase.from('categories').insert([{ name, sort_order: categories.length + 1 }]).select().single();
                if (error) { showMessage(`Error: ${error.message}`); return; }
                setCategories([...categories, data]);
            } else {
                const { data, error } = await supabase.from('categories').update({ name }).eq('id', editingCat.id).select().single();
                if (error) { showMessage(`Error: ${error.message}`); return; }
                setCategories(categories.map(c => c.id === data.id ? data : c));
            }
            setEditingCat(null);
            showMessage('Category saved!');
        };

        const deleteCat = async (id) => {
            if (window.confirm('Delete category? Products under this category might lose their link.')) {
                const { error } = await supabase.from('categories').delete().eq('id', id);
                if (error) { showMessage(`Error: ${error.message}`); return; }
                setCategories(categories.filter(c => c.id !== id));
                showMessage('Category deleted.');
            }
        };

        return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>🏷️ Category Management</h2>
                    <button onClick={() => setEditingCat({ id: 'new', name: '' })} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                        <Plus size={18} /> Add Category
                    </button>
                </div>

                {editingCat && (
                    <form onSubmit={handleSaveCat} style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '14px' }}>
                        <input name="name" defaultValue={editingCat.name} placeholder="Category Name (e.g. High End Beef)" required style={inputStyle} />
                        <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', background: '#059669', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save</button>
                        <button type="button" onClick={() => setEditingCat(null)} style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
                    </form>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {categories.map((cat, idx) => (
                        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{cat.name}</span>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Sort order: #{idx + 1}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => setEditingCat(cat)} style={{ border: 'none', background: '#e2e8f0', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={15} color="#0f172a" /></button>
                                <button onClick={() => deleteCat(cat.id)} style={{ border: 'none', background: '#fee2e2', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={15} color="#ef4444" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const OrderHistory = () => {
        const updateOrderStatus = async (orderId, status) => {
            const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
            if (error) { showMessage(`Error: ${error.message}`); return; }
            setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
            showMessage(`Order status changed to "${status}"`);
        };

        return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <h2 style={{ margin: '0 0 24px', fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>🛒 Customer Orders History</h2>
                {orders.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>No orders placed yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {orders.map(order => (
                            <div key={order.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>Order #{order.order_number || order.id.slice(0, 8)}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '12px' }}>{new Date(order.timestamp).toLocaleString()}</span>
                                    </div>
                                    <select
                                        value={order.status || 'Pending'}
                                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                        style={{ padding: '6px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="Pending">🟡 Pending</option>
                                        <option value="Preparing">🟠 Preparing</option>
                                        <option value="Ready">🟢 Ready</option>
                                        <option value="Completed">✅ Completed</option>
                                        <option value="Cancelled">❌ Cancelled</option>
                                    </select>
                                </div>
                                <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px' }}>
                                    <strong>Customer:</strong> {order.customer_details?.name || 'Guest'} ({order.customer_details?.phone || 'N/A'}) • <strong>Type:</strong> {order.order_type} • <strong>Payment:</strong> {order.payment_method}
                                </div>
                                <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1rem' }}>
                                    Total: ₱{order.total_amount}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const OrderTypeManager = () => (
        <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.4rem', fontWeight: 800, color: '#0c250d' }}>🚚 Order Types</h2>
            <div style={{ display: 'flex', gap: '15px' }}>
                {orderTypes.map(t => (
                    <div key={t.id} style={{ padding: '16px 24px', background: '#f0fdf4', borderRadius: '14px', border: '1px solid #bbf7d0', fontWeight: 800, color: '#166534' }}>
                        ✓ {t.name} (Active)
                    </div>
                ))}
            </div>
        </div>
    );

    const PaymentSettings = () => (
        <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.4rem', fontWeight: 800, color: '#0c250d' }}>💳 Payment Methods</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {paymentSettings.map(p => (
                    <div key={p.id} style={{ padding: '20px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 6px', color: '#0c250d' }}>{p.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Account: {p.account_number || p.accountNumber || 'N/A'}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const StoreGeneralSettings = () => {
        const handleSave = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const settingsObj = {
                store_name: formData.get('storeName'),
                address: formData.get('address'),
                contact: formData.get('contact'),
                manual_status: formData.get('manualStatus'),
                open_time: formData.get('openTime'),
                close_time: formData.get('closeTime'),
                logo_url: storeSettings.logo_url,
                banner_images: storeSettings.banner_images
            };

            const { error } = await supabase.from('store_settings').upsert([settingsObj]);
            if (error) { showMessage(`Error: ${error.message}`); return; }
            setStoreSettings(settingsObj);
            showMessage('🎉 Store general settings saved successfully!');
        };

        return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: '0 0 24px', fontSize: '1.4rem', fontWeight: 800, color: '#0c250d' }}>⚙️ General Store Settings</h2>
                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Store Name</label>
                            <input name="storeName" defaultValue={storeSettings.store_name} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Address</label>
                            <input name="address" defaultValue={storeSettings.address} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Contact Hotline</label>
                            <input name="contact" defaultValue={storeSettings.contact} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Opening Time</label>
                            <input name="openTime" type="time" defaultValue={storeSettings.open_time} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Closing Time</label>
                            <input name="closeTime" type="time" defaultValue={storeSettings.close_time} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>Manual Status</label>
                            <select name="manualStatus" defaultValue={storeSettings.manual_status} style={inputStyle}>
                                <option value="auto">Auto (Hours Schedule)</option>
                                <option value="open">Always Open</option>
                                <option value="closed">Always Closed</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" style={{ marginTop: '24px', padding: '12px 28px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}>
                        Save Settings
                    </button>
                </form>
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────
    // MAIN LAYOUT RENDER (LUXURY DARK GREEN & GOLD BRAND THEME)
    // ─────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
            {/* Sidebar Navigation */}
            <aside style={{
                width: '260px',
                background: 'linear-gradient(180deg, #091f0a 0%, #0d2b0e 100%)',
                color: 'white',
                padding: '28px 18px',
                position: 'fixed',
                height: '100vh',
                boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px', paddingLeft: '6px' }}>
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Logo" style={{ height: '42px', width: '42px', borderRadius: '50%', border: '2px solid #F9B700', background: 'white', objectFit: 'cover' }} />
                        <div>
                            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#F9B700', lineHeight: 1.1 }}>Chilled & Frozen</div>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Admin Portal</span>
                        </div>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <SidebarItem
                            icon={<Package size={18} />}
                            label="Inventory & Stocks"
                            active={activeTab === 'inventory'}
                            onClick={() => setActiveTab('inventory')}
                            badge={items.filter(i => i.out_of_stock || (i.stock !== undefined && i.stock <= (i.low_stock_threshold || 5))).length}
                        />
                        <SidebarItem
                            icon={<Utensils size={18} />}
                            label="Menu Catalog"
                            active={activeTab === 'menu'}
                            onClick={() => setActiveTab('menu')}
                        />
                        <SidebarItem
                            icon={<Tag size={18} />}
                            label="Categories"
                            active={activeTab === 'categories'}
                            onClick={() => setActiveTab('categories')}
                        />
                        <SidebarItem
                            icon={<ShoppingBag size={18} />}
                            label="Orders History"
                            active={activeTab === 'orders'}
                            onClick={() => setActiveTab('orders')}
                            badge={orders.filter(o => o.status === 'Pending').length}
                        />
                        <SidebarItem
                            icon={<Truck size={18} />}
                            label="Order Types"
                            active={activeTab === 'orderTypes'}
                            onClick={() => setActiveTab('orderTypes')}
                        />
                        <SidebarItem
                            icon={<CreditCard size={18} />}
                            label="Payment Methods"
                            active={activeTab === 'payment'}
                            onClick={() => setActiveTab('payment')}
                        />
                        <SidebarItem
                            icon={<Settings size={18} />}
                            label="General Settings"
                            active={activeTab === 'settings'}
                            onClick={() => setActiveTab('settings')}
                        />
                    </nav>
                </div>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    <LogOut size={18} /> Sign Out Admin
                </button>
            </aside>

            {/* Main Workspace Area */}
            <main style={{ marginLeft: '260px', flex: 1, padding: '32px 40px', maxWidth: '1280px' }}>
                {/* Notification Banner */}
                {message && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        left: '58%',
                        transform: 'translateX(-50%)',
                        background: message.toLowerCase().includes('error') ? '#ef4444' : '#059669',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '14px',
                        zIndex: 5000,
                        fontWeight: 800,
                        boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        {message}
                    </div>
                )}

                {/* Top Header Bar */}
                <header style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    marginBottom: '28px',
                    background: 'white',
                    padding: '16px 28px',
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                            {activeTab === 'inventory' && '📦 Stock & Inventory Control Center'}
                            {activeTab === 'menu' && '🍽️ Menu & Product Catalog Editor'}
                            {activeTab === 'categories' && '🏷️ Store Categories'}
                            {activeTab === 'orders' && '🛒 Customer Orders Manager'}
                            {activeTab === 'orderTypes' && '🚚 Order & Fulfillment Methods'}
                            {activeTab === 'payment' && '💳 Payment Methods'}
                            {activeTab === 'settings' && '⚙️ Store General Settings'}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{
                            padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800,
                            background: '#dcfce7', color: '#166534'
                        }}>
                            🟢 Store Active
                        </span>
                        <a href="/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0c250d', color: '#F9B700', textDecoration: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}>
                            <span>View Live Store</span> <ExternalLink size={14} />
                        </a>
                    </div>
                </header>

                {/* Tab Views */}
                {activeTab === 'inventory' && <InventoryManager />}
                {activeTab === 'menu' && <MenuManager />}
                {activeTab === 'categories' && <CategoryManager />}
                {activeTab === 'orders' && <OrderHistory />}
                {activeTab === 'orderTypes' && <OrderTypeManager />}
                {activeTab === 'payment' && <PaymentSettings />}
                {activeTab === 'settings' && <StoreGeneralSettings />}
            </main>
        </div>
    );
};

const SidebarItem = ({ icon, label, active, onClick, badge }) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px',
        background: active ? '#F9B700' : 'transparent',
        color: active ? '#081708' : 'rgba(255,255,255,0.85)',
        border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: active ? 800 : 600,
        textAlign: 'left', width: '100%', transition: 'all 0.2s ease',
        boxShadow: active ? '0 4px 15px rgba(249,183,0,0.35)' : 'none'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {icon} <span>{label}</span>
        </div>
        {badge > 0 && (
            <span style={{
                background: active ? '#081708' : '#ef4444',
                color: active ? '#F9B700' : 'white',
                padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800
            }}>
                {badge}
            </span>
        )}
    </button>
);

const quickBtnStyle = {
    padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white',
    color: '#0f172a', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
};

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.92rem' };

export default AdminDashboard;
