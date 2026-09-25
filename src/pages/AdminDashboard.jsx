import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { safeSetCache } from '../storageCache';
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
    ExternalLink,
    BarChart2,
    TrendingUp,
    DollarSign,
    Activity,
    Users,
    Eye
} from 'lucide-react';
import { categories as initialCategories, menuItems as initialItems } from '../data/MenuData';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('orders'); // categories, orders, orderTypes, payment, settings
    
    // Safe tab switching with validation
    const switchTab = (tabName) => {
        const validTabs = ['menu', 'categories', 'orders', 'orderTypes', 'payment', 'settings', 'analytics'];
        if (validTabs.includes(tabName)) {
            setActiveTab(tabName);
            console.log(`Switched to tab: ${tabName}`);
        } else {
            console.error(`Invalid tab: ${tabName}`);
            showMessage(`Error: Invalid tab "${tabName}"`);
        }
    };
    const [message, setMessage] = useState('');

    // --- STATE MANAGEMENT ---
    const isUUID = (str) => Boolean(str && typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    // Explains why a menu change didn't reach the database (and so won't show on the website).
    // An update blocked by row-level security matches zero rows, which .single() reports as PGRST116.
    const describeSaveError = (err) => {
        if (err?.code === 'PGRST116' || err?.code === '42501' || /row-level security|permission denied/i.test(err?.message || '')) {
            return localStorage.getItem('admin_test_user') === 'true'
                ? 'the database refused the change. You are logged in with the offline test account — log out and sign in with your real Supabase admin account.'
                : 'the database refused the change (check the Supabase row-level security policies).';
        }
        return err?.message || 'database connection issue';
    };

    const normalizeItem = (item) => ({
        ...item,
        category_id: item.category_id || item.categoryId || '',
        low_stock_threshold: item.low_stock_threshold ?? item.lowStockThreshold ?? 5,
        min_order_note: item.min_order_note || item.minOrderNote || '',
    });

    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('menuItems');
        const raw = saved ? JSON.parse(saved) : initialItems;
        return Array.isArray(raw) ? raw.map(normalizeItem) : raw;
    });

    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('categories');
        const rawCats = saved ? JSON.parse(saved) : initialCategories;
        const unique = [];
        const seen = new Set();
        for (const cat of rawCats) {
            const key = (cat.id || cat.name || '').toLowerCase().trim();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(cat);
            }
        }
        return unique;
    });

    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('orders');
        return saved ? JSON.parse(saved) : [];
    });

    const [_orderTypes, setOrderTypes] = useState(() => {
        const saved = localStorage.getItem('orderTypes');
        return saved ? JSON.parse(saved) : [
            { id: 'pickup', name: 'Pickup' },
            { id: 'delivery', name: 'Delivery' },
            { id: 'lalamove-delivery', name: 'Lalamove Delivery' }
        ];
    });

    const DEFAULT_DELIVERY_LOCATIONS = [
        { id: 'loc_1', name: 'Poblacion', charge: 35 },
        { id: 'loc_2', name: 'San Antonio', charge: 35 },
        { id: 'loc_3', name: 'Mangorocoro', charge: 35 },
        { id: 'loc_4', name: 'Progreso', charge: 35 },
        { id: 'loc_5', name: 'Pili', charge: 35 },
        { id: 'loc_6', name: 'Lanjagan', charge: 35 },
        { id: 'loc_7', name: 'Taguhangin', charge: 35 },
        { id: 'loc_8', name: 'Bugtong Bukid', charge: 35 },
        { id: 'loc_9', name: 'Brgy. Rojas', charge: 35 },
        { id: 'loc_10', name: 'Pinantan Elizalde', charge: 35 },
        { id: 'loc_11', name: 'Puente Bunglas', charge: 35 },
        { id: 'loc_12', name: 'Bat-os', charge: 35 },
        { id: 'loc_13', name: 'Malayu-an', charge: 40 },
        { id: 'loc_14', name: 'Barrido', charge: 40 },
        { id: 'loc_15', name: 'Culasi', charge: 45 },
        { id: 'loc_16', name: 'Luca', charge: 45 },
        { id: 'loc_17', name: 'Bay-ang', charge: 50 }
    ];

    const [deliveryLocations, setDeliveryLocations] = useState(() => {
        const saved = localStorage.getItem('deliveryLocations');
        if (saved) {
            try { return JSON.parse(saved); } catch { /* ignore parse error */ }
        }
        return DEFAULT_DELIVERY_LOCATIONS;
    });

    const [paymentSettings, setPaymentSettings] = useState(() => {
        const saved = localStorage.getItem('paymentSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Normalize camelCase keys from old cached data + deduplicate
                const unique = [];
                const seen = new Set();
                for (const item of parsed) {
                    const key = (item.name || item.id || '').toLowerCase().trim();
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push({
                            ...item,
                            account_number: item.account_number || item.accountNumber || '',
                            account_name: item.account_name || item.accountName || '',
                        });
                    }
                }
                return unique;
            }
        }
        return [
            { id: 'gcash', name: 'GCash', account_number: '09947246294', account_name: 'Chilled and Frozen Hub', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GCash%3A%2009947246294%20(Chilled%20and%20Frozen%20Hub)', is_active: true },
            { id: 'cod', name: 'Cash on Delivery', account_number: 'N/A', account_name: 'Cash Payment', is_active: true },
            { id: 'maya', name: 'PayMaya', account_number: '09947246294', account_name: 'Chilled and Frozen Hub', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PayMaya%3A%2009947246294%20(Chilled%20and%20Frozen%20Hub)', is_active: true }
        ];
    });

    const [storeSettings, setStoreSettings] = useState(() => {
        const saved = localStorage.getItem('storeSettings');
        return saved ? JSON.parse(saved) : {
            manual_status: 'auto',
            open_time: '08:00',
            close_time: '19:00',
            store_name: 'Chilled and Frozen Hub',
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
                // Clear old localStorage categories if they have string IDs to force reload with UUIDs
                const savedCategories = localStorage.getItem('categories');
                if (savedCategories) {
                    try {
                        const parsed = JSON.parse(savedCategories);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            // Check if any category has a non-UUID ID
                            const hasStringIds = parsed.some(cat => cat.id && !isUUID(cat.id));
                            if (hasStringIds) {
                                console.log('🧹 Found old string-based category IDs, clearing localStorage to reload with UUIDs');
                                localStorage.removeItem('categories');
                                localStorage.removeItem('menuItems'); // Also clear menu items as they reference categories
                            }
                        }
                    } catch (e) {
                        console.warn('Error parsing saved categories, clearing localStorage');
                        localStorage.removeItem('categories');
                    }
                }

                const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
                if (catData && catData.length > 0) {
                    setCategories(catData);
                    localStorage.setItem('categories', JSON.stringify(catData));
                } else {
                    // No categories in database, use fallback from MenuData.js with UUIDs
                    console.log('📦 No categories in database, using MenuData.js fallback with UUIDs');
                    setCategories(initialCategories);
                    localStorage.setItem('categories', JSON.stringify(initialCategories));
                }

                const { data: itemData } = await supabase.from('menu_items').select('*').order('sort_order', { ascending: true });
                if (itemData && itemData.length > 0) {
                    setItems(itemData.map(normalizeItem));
                } else {
                    // No items in database, use fallback from MenuData.js with UUID category references
                    console.log('📦 No menu items in database, using MenuData.js fallback with UUID category references');
                    setItems(initialItems.map(normalizeItem));
                    safeSetCache('menuItems', initialItems.map(normalizeItem));
                }

                const { data: payData } = await supabase.from('payment_settings').select('*');
                if (payData && payData.length > 0) {
                    // Deduplicate fetched payment methods by name or id
                    const uniquePay = [];
                    const seen = new Set();
                    for (const p of payData) {
                        const key = (p.name || p.id || '').toLowerCase().trim();
                        if (!seen.has(key)) {
                            seen.add(key);
                            uniquePay.push(p);
                        }
                    }
                    setPaymentSettings(uniquePay);
                    localStorage.setItem('paymentSettings', JSON.stringify(uniquePay));
                }

                const { data: locData } = await supabase.from('delivery_locations').select('*');
                if (locData && locData.length > 0) {
                    setDeliveryLocations(locData);
                    localStorage.setItem('deliveryLocations', JSON.stringify(locData));
                }

                const { data: typeData } = await supabase.from('order_types').select('*');
                if (typeData && typeData.length > 0) {
                    setOrderTypes(typeData);
                    localStorage.setItem('orderTypes', JSON.stringify(typeData));
                }

                const { data: storeData } = await supabase.from('store_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
                if (storeData) setStoreSettings(storeData);

                const { data: orderData } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
                if (orderData && orderData.length > 0) {
                    setOrders(orderData);
                    localStorage.setItem('orders', JSON.stringify(orderData));
                }
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

    // Writes to the single most recent store_settings row (reads pick the newest by updated_at),
    // inserting only when the table is empty. Throws on failure so callers can report it.
    const persistStoreSettings = async (changes) => {
        const payload = { ...changes, updated_at: new Date().toISOString() };
        // Look up the row id fresh: a cached id in localStorage may be stale or from another project.
        const { data: latest, error: lookupError } = await supabase.from('store_settings').select('id').order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (lookupError) throw lookupError;
        const id = latest?.id;
        const { data, error } = id
            ? await supabase.from('store_settings').update(payload).eq('id', id).select().single()
            : await supabase.from('store_settings').insert([payload]).select().single();
        if (error) throw error;
        setStoreSettings(data);
        localStorage.setItem('storeSettings', JSON.stringify(data));
        return data;
    };

    const handleLogout = async () => {
        try {
            localStorage.removeItem('admin_bypass');
            localStorage.removeItem('admin_test_user');
            localStorage.removeItem('admin_test_email');
            await supabase.auth.signOut();
            console.log('Admin logged out successfully');
            navigate('/admin');
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if signOut fails
            navigate('/admin');
        }
    };

    const getItemBoxes = (item) => {
        if (!item) return [];
        const totalStock = parseFloat(item.stock) || 0;
        const isOutOfStock = Boolean(item.out_of_stock || totalStock <= 0);

        if (Array.isArray(item.boxes) && item.boxes.length > 0) {
            return item.boxes.map(b => ({
                ...b,
                disabled: isOutOfStock || Boolean(b.disabled || b.ordered) || (b.weight && b.weight > totalStock)
            }));
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
                });
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

    // 
    // COMPONENT 1: MENU MANAGER (PRODUCT CATALOG MANAGEMENT)
    // 
    const MenuManager = () => {
        const [editingItem, setEditingItem] = useState(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [filterCategory, setFilterCategory] = useState('all');
        const [tempVariations, setTempVariations] = useState([]);
        const [tempFlavors, setTempFlavors] = useState([]);
        const [tempAddons, setTempAddons] = useState([]);
        const [tempBoxes, setTempBoxes] = useState([]);

        useEffect(() => {
            if (editingItem) {
                setTempVariations(editingItem.variations || []);
                setTempFlavors(editingItem.flavors || []);
                setTempAddons(editingItem.addons || []);
                const currentBoxes = editingItem.boxes && editingItem.boxes.length > 0 ? editingItem.boxes : getItemBoxes(editingItem);
                setTempBoxes(currentBoxes);
            }
        }, [editingItem]);

        const handleSubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            // Validation
            const name = formData.get('name')?.trim();
            const categoryId = formData.get('categoryId');
            const price = Number(formData.get('price'));
            const promoPrice = formData.get('promoPrice') ? Number(formData.get('promoPrice')) : null;
            
            if (!name || name.length === 0) {
                showMessage('❌ Product name is required');
                return;
            }
            
            if (name.length < 3) {
                showMessage('❌ Product name must be at least 3 characters');
                return;
            }
            
            if (!categoryId) {
                showMessage('❌ Please select a category');
                return;
            }
            
            if (!price || price <= 0) {
                showMessage('❌ Price must be a valid positive number');
                return;
            }
            
            if (price > 1000000) {
                showMessage('❌ Price seems too high. Please verify.');
                return;
            }
            
            if (promoPrice !== null && promoPrice <= 0) {
                showMessage('❌ Promo price must be a positive number');
                return;
            }
            
            if (promoPrice !== null && promoPrice >= price) {
                showMessage('❌ Promo price must be less than regular price');
                return;
            }
            
            const itemData = {
                name,
                description: formData.get('description'),
                price,
                promo_price: promoPrice,
                category_id: categoryId,
                image: editingItem.image || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80',
                variations: tempVariations,
                flavors: tempFlavors,
                addons: tempAddons,
                out_of_stock: formData.get('outOfStock') === 'on'
            };

            if (editingItem.id === 'new') {
                itemData.unit = 'kg';
                itemData.stock = 0;
                itemData.low_stock_threshold = 5;
                itemData.boxes = [];
            }

            let finalItem;
            if (editingItem.id === 'new') {
                if (!itemData.category_id) {
                    showMessage('❌ Please select a category first.');
                    return;
                }
                // A change that isn't in the database never reaches the website menu,
                // so a failed save is reported instead of being kept only in this browser.
                try {
                    const { data, error } = await supabase.from('menu_items').insert([itemData]).select().single();
                    if (error) throw error;
                    finalItem = data;
                    showMessage('✅ Product created successfully!');
                } catch (err) {
                    console.error('Supabase product insert error:', err);
                    showMessage(`❌ Product NOT saved to the website: ${describeSaveError(err)}`);
                    return;
                }
                const updated = [...items, finalItem];
                setItems(updated);
                safeSetCache('menuItems', updated);
            } else {
                try {
                    let res;
                    if (isUUID(editingItem.id)) {
                        res = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id).select().single();
                    } else {
                        res = await supabase.from('menu_items').update(itemData).eq('name', editingItem.name).select().single();
                    }
                    if (res.error) throw res.error;
                    finalItem = res.data;
                    showMessage('✅ Product updated successfully!');
                } catch (err) {
                    console.error('Supabase product update error:', err);
                    showMessage(`❌ Changes NOT saved to the website: ${describeSaveError(err)}`);
                    return;
                }
                const updated = items.map(i => i.id === editingItem.id || i.name === editingItem.name ? { ...i, ...finalItem } : i);
                setItems(updated);
                safeSetCache('menuItems', updated);
            }

            window.dispatchEvent(new Event('store_data_updated'));
            setEditingItem(null);
        };

        const deleteItem = async (id) => {
            if (window.confirm('Are you sure you want to delete this product?')) {
                const target = items.find(i => i.id === id);
                try {
                    const query = supabase.from('menu_items').delete();
                    const { data, error } = await (isUUID(id) ? query.eq('id', id) : query.eq('name', target?.name)).select('id');
                    if (error) throw error;
                    // A delete blocked by row-level security returns no error, just zero rows.
                    if (!data || data.length === 0) throw new Error('the database did not delete the product (not signed in as a real admin account?)');
                    showMessage('✓ Product deleted successfully!');
                } catch (err) {
                    console.error('Delete error:', err);
                    showMessage(`❌ Product NOT deleted from the website: ${describeSaveError(err)}`);
                    return;
                }

                const updated = items.filter(i => i.id !== id);
                setItems(updated);
                safeSetCache('menuItems', updated);
                
                // Dispatch event with small delay to ensure listener is ready
                setTimeout(() => {
                    window.dispatchEvent(new Event('store_data_updated'));
                }, 100);
            }
        };

        const deleteAllItems = async () => {
            if (!window.confirm(`⚠️ Are you sure you want to DELETE ALL ${items.length} products? This action cannot be undone!`)) return;
            
            try {
                // Delete from Supabase
                const result = await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000').select('id');
                if (result.error) throw result.error;
                if (items.length > 0 && (!result.data || result.data.length === 0)) {
                    throw new Error('the database did not delete any products (not signed in as a real admin account?)');
                }
                showMessage('✓ All products deleted successfully!');
            } catch (err) {
                console.error('Error deleting all items:', err);
                showMessage(`❌ Products NOT deleted from the website: ${describeSaveError(err)}`);
                return;
            }
            
            setItems([]);
            safeSetCache('menuItems', []);
            
            // Dispatch event with small delay
            setTimeout(() => {
                window.dispatchEvent(new Event('store_data_updated'));
            }, 100);
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
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}> Product Catalog & Menu Editor</h2>
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
                        <button 
                            onClick={deleteAllItems} 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 800, cursor: 'pointer' }}
                            title="Delete all products"
                        >
                            <Trash2 size={18} /> Delete All
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
                                <th style={{ padding: '12px' }}>Stock & Boxes</th>
                                <th style={{ padding: '12px' }}>Variations & Add-ons</th>
                                <th style={{ padding: '12px' }}>Min Order Tag</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No products found in catalog.</td></tr>
                            ) : filteredItems.map(item => (
                                <tr key={item.id} style={{ background: '#f8fafc' }}>
                                    <td style={{ padding: '12px 15px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img src={item.image} style={{ width: '45px', height: '45px', borderRadius: '10px', objectFit: 'cover' }} alt="" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80'; }} />
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
                                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.75rem', marginRight: '4px' }}>{item.price}</span>
                                                <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '0.92rem' }}>{item.promo_price} /{item.unit || 'kg'}</span>
                                            </div>
                                        ) : (
                                            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{item.price} /{item.unit || 'kg'}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: item.out_of_stock || (item.stock || 0) <= 0 ? '#dc2626' : '#059669' }}>
                                                {item.out_of_stock || (item.stock || 0) <= 0 ? 'Out of Stock' : `Stock: ${item.stock} ${item.unit || 'kg'}`}
                                            </span>
                                            {(() => {
                                                const boxes = getItemBoxes(item).filter(b => !b.disabled && !b.ordered);
                                                if (boxes.length === 0) return null;
                                                return (
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                        {boxes.map((b, idx) => (
                                                            <span key={b.id || idx} style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '1px 6px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700 }}>
                                                                📦 {b.name}: {b.weight} kg
                                                            </span>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {item.variations && item.variations.length > 0 && (
                                                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {item.variations.length} Variation{item.variations.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {item.flavors && item.flavors.length > 0 && (
                                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {item.flavors.length} Flavor{item.flavors.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {item.addons && item.addons.length > 0 && (
                                                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                                                    {item.addons.length} Add-on{item.addons.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {(!item.variations || item.variations.length === 0) && 
                                             (!item.flavors || item.flavors.length === 0) && 
                                             (!item.addons || item.addons.length === 0) && (
                                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>None</span>
                                            )}
                                        </div>
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
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0c250d' }}>{editingItem.id === 'new' ? ' Create New Product' : ` Edit Product: ${editingItem.name}`}</h3>
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
                        </div>

                        {/* Add-ons Section */}
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155' }}>Product Add-ons</label>
                                <button
                                    type="button"
                                    onClick={() => setTempAddons([...tempAddons, { name: '', price: 0, disabled: false }])}
                                    style={{ background: '#059669', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Plus size={14} /> Add Add-on
                                </button>
                            </div>
                            {tempAddons.map((addon, index) => (
                                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="e.g. Extra Sauce, Gift Wrap"
                                        value={addon.name}
                                        onChange={(e) => {
                                            const updated = [...tempAddons];
                                            updated[index].name = e.target.value;
                                            setTempAddons(updated);
                                        }}
                                        style={{ ...inputStyle, flex: 1, fontSize: '0.85rem' }}
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Price"
                                        value={addon.price}
                                        onChange={(e) => {
                                            const updated = [...tempAddons];
                                            updated[index].price = Number(e.target.value);
                                            setTempAddons(updated);
                                        }}
                                        style={{ ...inputStyle, width: '100px', fontSize: '0.85rem' }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={addon.disabled}
                                            onChange={(e) => {
                                                const updated = [...tempAddons];
                                                updated[index].disabled = e.target.checked;
                                                setTempAddons(updated);
                                            }}
                                        />
                                        Disabled
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setTempAddons(tempAddons.filter((_, i) => i !== index))}
                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {tempAddons.length === 0 && (
                                <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                                    No add-ons created. Add optional extras customers can purchase with this product.
                                </p>
                            )}
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

    // 
    // OTHER EXISTING SUB-COMPONENTS (CATEGORIES, ORDERS, SETTINGS)
    // 
    const CategoryManager = () => {
        const [editingCat, setEditingCat] = useState(null);
        const [isLoading, setIsLoading] = useState(false);

        // Check if category name already exists
        const isDuplicateName = (name, excludeId = null) => {
            return categories.some(cat => 
                cat.name.toLowerCase().trim() === name.toLowerCase().trim() && 
                cat.id !== excludeId
            );
        };

        // Count items in category
        const getCategoryItemCount = (categoryId) => {
            return items.filter(item => 
                item.category_id === categoryId || 
                item.categoryId === categoryId
            ).length;
        };

        const handleSaveCat = async (e) => {
            e.preventDefault();
            setIsLoading(true);
            
            const formData = new FormData(e.target);
            const name = formData.get('name')?.trim();
            
            // Validation
            if (!name) {
                showMessage('❌ Category name cannot be empty!');
                setIsLoading(false);
                return;
            }

            if (name.length < 2) {
                showMessage('❌ Category name must be at least 2 characters long!');
                setIsLoading(false);
                return;
            }

            if (isDuplicateName(name, editingCat?.id)) {
                showMessage('❌ Category with this name already exists!');
                setIsLoading(false);
                return;
            }

            let savedCat;
            if (editingCat.id === 'new') {
                try {
                    const { data, error } = await supabase
                        .from('categories')
                        .insert([{ name, sort_order: categories.length + 1 }])
                        .select()
                        .single();
                    
                    if (error) throw error;
                    savedCat = data;
                    console.log('✅ Category created successfully:', data);
                } catch (err) {
                    console.error('❌ Supabase category insert error:', err);
                    showMessage(`❌ Category NOT saved to the website: ${describeSaveError(err)}`);
                    setIsLoading(false);
                    return;
                }
                
                const updated = [...categories, savedCat];
                setCategories(updated);
                localStorage.setItem('categories', JSON.stringify(updated));
                showMessage('✅ Category created successfully!');
            } else {
                try {
                    let res;
                    if (isUUID(editingCat.id)) {
                        res = await supabase
                            .from('categories')
                            .update({ name })
                            .eq('id', editingCat.id)
                            .select()
                            .single();
                    } else {
                        res = await supabase
                            .from('categories')
                            .update({ name })
                            .eq('name', editingCat.name)
                            .select()
                            .single();
                    }
                    
                    if (res.error) throw res.error;
                    savedCat = res.data;
                    console.log('✅ Category updated successfully:', res.data);
                } catch (err) {
                    console.error('❌ Supabase category update error:', err);
                    showMessage(`❌ Category NOT saved to the website: ${describeSaveError(err)}`);
                    setIsLoading(false);
                    return;
                }
                
                const updated = categories.map(c => 
                    c.id === editingCat.id || c.name === editingCat.name ? 
                    { ...c, ...savedCat } : c
                );
                setCategories(updated);
                localStorage.setItem('categories', JSON.stringify(updated));
                showMessage('✅ Category updated successfully!');
            }

            window.dispatchEvent(new Event('store_data_updated'));
            setEditingCat(null);
            setIsLoading(false);
        };

        const deleteCat = async (id) => {
            console.log('🚀 Delete function called with ID:', id);
            
            const target = categories.find(c => c.id === id);
            console.log('🎯 Target category found:', target);
            
            if (!target) {
                console.error('❌ Category not found with ID:', id);
                showMessage('❌ Category not found!');
                return;
            }

            // Check if this is a UUID or string ID from MenuData.js fallback
            const isValidUUID = isUUID(id);
            console.log('🔍 ID validation - Is UUID:', isValidUUID, 'ID:', id);

            const itemCount = getCategoryItemCount(id);
            console.log('📊 Item count in category:', itemCount);
            
            // Enhanced confirmation message for CASCADE delete
            const confirmMessage = itemCount > 0 
                ? `⚠️ WARNING: This category "${target.name}" contains ${itemCount} product(s).\n\n🚨 IMPORTANT: Deleting this category will PERMANENTLY DELETE all ${itemCount} product(s) inside it due to database constraints.\n\nThis action cannot be undone. Continue?`
                : `Delete category "${target.name}"?\n\nThis action cannot be undone.`;

            console.log('❓ Showing confirmation dialog');
            const confirmed = window.confirm(confirmMessage);
            console.log('✅ User confirmed:', confirmed);
            
            if (!confirmed) {
                console.log('❌ User cancelled deletion');
                return;
            }

            console.log('⏳ Starting delete operation...');
            setIsLoading(true);
            
            try {
                let deleteResult;
                
                // Only try database delete if we have a valid UUID
                if (isValidUUID) {
                    console.log('🗑️ Attempting database delete with UUID:', id);
                    
                    deleteResult = await supabase
                        .from('categories')
                        .delete()
                        .eq('id', id)
                        .select('id');

                    // A delete blocked by row-level security returns no error, just zero rows.
                    if (!deleteResult.error && (!deleteResult.data || deleteResult.data.length === 0)) {
                        showMessage('❌ Category NOT deleted from the website: the database refused the change (not signed in as a real admin account?)');
                        setIsLoading(false);
                        return;
                    }

                    console.log('📝 Delete result:', deleteResult);
                    
                    if (deleteResult?.error) {
                        console.error('❌ Supabase delete error:', deleteResult.error);
                        
                        // Check if it's a foreign key constraint error
                        if (deleteResult.error.message?.includes('foreign key') || deleteResult.error.code === '23503') {
                            showMessage(`❌ Cannot delete category: It still contains products. All products in this category will be deleted automatically.`);
                        } else if (deleteResult.error.code === 'PGRST116') {
                            console.log('⚠️ Category not found in database, cleaning up locally');
                        } else {
                            showMessage(`❌ Error deleting category: ${deleteResult.error.message}`);
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        console.log('✅ Database delete successful');
                    }
                } else {
                    console.log('⚠️ Non-UUID category ID detected, this is likely from MenuData.js fallback. Skipping database delete.');
                    console.log('💡 This category will be removed from local state only.');
                }
                
            } catch (err) {
                console.error('❌ Exception during delete:', err);
                showMessage(`❌ Error deleting category: ${err.message || 'Unknown error'}`);
                setIsLoading(false);
                return;
            }
            
            console.log('🔄 Updating local state...');
            
            // Update local state - remove the deleted category
            const updated = categories.filter(c => c.id !== id);
            console.log('📝 Filtered categories:', updated.length, 'remaining');
            
            // Re-order remaining categories
            const reordered = updated.map((cat, index) => ({
                ...cat,
                sort_order: index + 1
            }));
            
            setCategories(reordered);
            localStorage.setItem('categories', JSON.stringify(reordered));
            console.log('💾 Local state updated');
            
            // Also clean up items from local state if they were cascade deleted
            const updatedItems = items.filter(item => 
                item.category_id !== id && 
                item.categoryId !== id
            );
            setItems(updatedItems);
            safeSetCache('menuItems', updatedItems);
            console.log('🧹 Items cleaned up, removed:', items.length - updatedItems.length, 'items');
            
            if (itemCount > 0) {
                showMessage(`✅ Category "${target.name}" and ${itemCount} product(s) deleted successfully!`);
            } else {
                showMessage(`✅ Category "${target.name}" deleted successfully!`);
            }
            
            console.log('🎉 Delete operation completed');
            window.dispatchEvent(new Event('store_data_updated'));
            setIsLoading(false);
        };

        const uniqueCategories = [];
        const seenCatNames = new Set();
        for (const cat of categories) {
            const nameKey = (cat.name || cat.id || '').toLowerCase().trim();
            if (!seenCatNames.has(nameKey)) {
                seenCatNames.add(nameKey);
                uniqueCategories.push(cat);
            }
        }

        // Sort categories by sort_order
        uniqueCategories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                            🏷️ Category Management
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                            Organize your products into categories for better navigation
                        </p>
                    </div>
                    <button 
                        onClick={() => setEditingCat({ id: 'new', name: '' })} 
                        disabled={isLoading}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 18px', 
                            borderRadius: '12px', 
                            background: isLoading ? '#94a3b8' : 'var(--primary)', 
                            color: 'white', 
                            border: 'none', 
                            fontWeight: 800, 
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        <Plus size={18} /> Add Category
                    </button>
                </div>

                {editingCat && (
                    <form onSubmit={handleSaveCat} style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <input 
                            name="name" 
                            defaultValue={editingCat.name} 
                            placeholder="Category Name (e.g. High End Beef)" 
                            required 
                            disabled={isLoading}
                            style={{
                                ...inputStyle,
                                opacity: isLoading ? 0.7 : 1
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            style={{ 
                                padding: '10px 20px', 
                                borderRadius: '10px', 
                                background: isLoading ? '#94a3b8' : '#059669', 
                                color: 'white', 
                                border: 'none', 
                                fontWeight: 700, 
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1
                            }}
                        >
                            {isLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setEditingCat(null)} 
                            disabled={isLoading}
                            style={{ 
                                padding: '10px 15px', 
                                borderRadius: '10px', 
                                border: '1px solid #cbd5e1', 
                                background: 'white', 
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                opacity: isLoading ? 0.7 : 1
                            }}
                        >
                            Cancel
                        </button>
                    </form>
                )}

                {uniqueCategories.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px', 
                        color: '#94a3b8',
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: '2px dashed #e2e8f0'
                    }}>
                        <Tag size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ margin: '0 0 8px', fontWeight: 600 }}>No Categories Yet</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Create your first category to organize your products</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {uniqueCategories.map((cat, idx) => {
                            const itemCount = getCategoryItemCount(cat.id);
                            return (
                                <div key={cat.id || cat.name || idx} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    padding: '18px 20px', 
                                    background: '#f8fafc', 
                                    borderRadius: '14px', 
                                    border: '1px solid #e2e8f0',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ 
                                            fontWeight: 800, 
                                            fontSize: '1rem', 
                                            color: '#0f172a',
                                            marginBottom: '4px'
                                        }}>
                                            {cat.name}
                                        </div>
                                        <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}>
                                            <span>Order: #{cat.sort_order || idx + 1}</span>
                                            <span style={{
                                                background: itemCount > 0 ? '#dcfce7' : '#f1f5f9',
                                                color: itemCount > 0 ? '#166534' : '#64748b',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.7rem',
                                                fontWeight: 600
                                            }}>
                                                {itemCount} item{itemCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            onClick={() => setEditingCat(cat)} 
                                            disabled={isLoading}
                                            title="Edit Category"
                                            style={{ 
                                                border: 'none', 
                                                background: '#e2e8f0', 
                                                padding: '8px 10px', 
                                                borderRadius: '8px', 
                                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                                opacity: isLoading ? 0.5 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Edit2 size={16} color="#0f172a" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                console.log('🖱️ Delete button clicked for category:', cat);
                                                console.log('🆔 Category ID:', cat.id, 'Type:', typeof cat.id);
                                                console.log('📝 Category Name:', cat.name);
                                                deleteCat(cat.id);
                                            }} 
                                            disabled={isLoading}
                                            title={`Delete Category (${itemCount} items)`}
                                            style={{ 
                                                border: 'none', 
                                                background: '#fee2e2', 
                                                padding: '8px 10px', 
                                                borderRadius: '8px', 
                                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                                opacity: isLoading ? 0.5 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {isLoading && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}>
                        <div style={{
                            background: 'white',
                            padding: '20px 30px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
                        }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                border: '2px solid #e2e8f0',
                                borderTop: '2px solid var(--primary)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <span style={{ fontWeight: 600 }}>Processing...</span>
                        </div>
                    </div>
                )}
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

        const deleteOrder = async (orderId, orderNumber) => {
            if (!window.confirm(`Delete Order #${orderNumber}? This cannot be undone.`)) return;
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) { showMessage(`Error: ${error.message}`); return; }
            const updated = orders.filter(o => o.id !== orderId);
            setOrders(updated);
            localStorage.setItem('orders', JSON.stringify(updated));
            showMessage(` Order #${orderNumber} deleted.`);
        };

        const exportOrdersCSV = () => {
            if (orders.length === 0) { showMessage('No orders to export.'); return; }

            const headers = ['Order #', 'Date', 'Customer Name', 'Phone', 'Order Type', 'Payment Method', 'Delivery Location', 'Address', 'Items', 'Subtotal', 'Delivery Charge', 'Total', 'Status'];

            const rows = orders.map(o => {
                const cd = o.customer_details || {};
                const items = Array.isArray(o.items) ? o.items.join(' | ') : (o.items || '');
                const deliveryCharge = o.total_amount && o.subtotal ? (o.total_amount - o.subtotal) : '';
                return [
                    o.order_number || o.id?.slice(0, 8) || '',
                    o.timestamp ? new Date(o.timestamp).toLocaleString() : '',
                    cd.name || '',
                    cd.phone || '',
                    o.order_type || '',
                    o.payment_method || '',
                    cd.delivery_location || '',
                    cd.address || '',
                    `"${items.replace(/"/g, '""')}"`,
                    o.subtotal || '',
                    deliveryCharge,
                    o.total_amount || '',
                    o.status || ''
                ];
            });

            const csvContent = [headers, ...rows]
                .map(row => row.join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showMessage(` Exported ${orders.length} orders to CSV!`);
        };

        return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}> Customer Orders History</h2>
                    <button
                        onClick={exportOrdersCSV}
                        disabled={orders.length === 0}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: orders.length === 0 ? '#e2e8f0' : 'linear-gradient(135deg, #0c250d 0%, #1a4a1c 100%)', color: orders.length === 0 ? '#94a3b8' : '#F9B700', fontWeight: 800, fontSize: '0.88rem', cursor: orders.length === 0 ? 'not-allowed' : 'pointer', boxShadow: orders.length === 0 ? 'none' : '0 4px 12px rgba(12,37,13,0.25)', fontFamily: 'Outfit, sans-serif' }}
                    >
                        <FileText size={16} /> Export CSV ({orders.length})
                    </button>
                </div>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <select
                                            value={order.status || 'Pending'}
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                            style={{ padding: '6px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="Pending"> Pending</option>
                                            <option value="Preparing"> Preparing</option>
                                            <option value="Ready"> Ready</option>
                                            <option value="Completed"> Completed</option>
                                            <option value="Cancelled"> Cancelled</option>
                                        </select>
                                        <button
                                            onClick={() => deleteOrder(order.id, order.order_number || order.id.slice(0, 8))}
                                            title="Delete order"
                                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '10px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '10px' }}>
                                    <strong>Customer:</strong> {order.customer_details?.name || 'Guest'} ({order.customer_details?.phone || 'N/A'})  <strong>Type:</strong> {order.order_type}  <strong>Payment:</strong> {order.payment_method}
                                </div>
                                <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '1rem' }}>
                                    Total: {order.total_amount}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const OrderTypeManager = () => {
        const [isLocModalOpen, setIsLocModalOpen] = useState(false);
        const [editingLoc, setEditingLoc] = useState(null);
        const [locForm, setLocForm] = useState({ id: '', name: '', charge: 35 });
        const [searchLoc, setSearchLoc] = useState('');

        const handleSaveLocation = async (e) => {
            e.preventDefault();
            if (!locForm.name.trim()) return;

            const newLoc = {
                id: locForm.id || 'loc_' + Date.now(),
                name: locForm.name.trim(),
                charge: Number(locForm.charge) || 0
            };

            let updatedList = [];
            if (editingLoc) {
                updatedList = deliveryLocations.map(l => l.id === newLoc.id || l.name === newLoc.name ? newLoc : l);
            } else {
                updatedList = [...deliveryLocations, newLoc];
            }

            setDeliveryLocations(updatedList);
            localStorage.setItem('deliveryLocations', JSON.stringify(updatedList));

            const { error } = await supabase.from('delivery_locations').upsert([newLoc]);
            if (error) {
                showMessage(` Saved on this device only, not to the database: ${error.message}`);
                setIsLocModalOpen(false);
                return;
            }

            showMessage(editingLoc ? ` Delivery charge for ${newLoc.name} updated!` : ` Added delivery location ${newLoc.name}!`);
            setIsLocModalOpen(false);
        };

        const handleDeleteLocation = async (id, name) => {
            if (!window.confirm(`Delete delivery location "${name}"?`)) return;
            const updated = deliveryLocations.filter(l => (l.id ? l.id !== id : l.name !== name));
            setDeliveryLocations(updated);
            localStorage.setItem('deliveryLocations', JSON.stringify(updated));

            const { error } = id
                ? await supabase.from('delivery_locations').delete().eq('id', id)
                : await supabase.from('delivery_locations').delete().eq('name', name);
            if (error) {
                showMessage(` Removed on this device only, not from the database: ${error.message}`);
                return;
            }

            showMessage(` Delivery location "${name}" removed.`);
        };

        const filteredLocations = deliveryLocations.filter(l =>
            l.name.toLowerCase().includes(searchLoc.toLowerCase())
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Fulfillment Summary Cards */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                         Fulfillment Methods
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 20px' }}>
                        Supported checkout order types for store customers.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div style={{ padding: '18px', background: '#f0fdf4', borderRadius: '16px', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ background: '#166534', color: 'white', borderRadius: '50%', padding: '10px', display: 'flex' }}><ShoppingBag size={22} /></div>
                            <div>
                                <h4 style={{ margin: '0 0 2px', fontSize: '1.05rem', color: '#166534', fontWeight: 900 }}>Pickup</h4>
                                <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}> Active (Free / Store Claim)</span>
                            </div>
                        </div>
                        <div style={{ padding: '18px', background: '#f0fdf4', borderRadius: '16px', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ background: '#166534', color: 'white', borderRadius: '50%', padding: '10px', display: 'flex' }}><Truck size={22} /></div>
                            <div>
                                <h4 style={{ margin: '0 0 2px', fontSize: '1.05rem', color: '#166534', fontWeight: 900 }}>Delivery</h4>
                                <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}> Active ({deliveryLocations.length} Barangay Rates)</span>
                            </div>
                        </div>
                        <div style={{ padding: '18px', background: '#fffbeb', borderRadius: '16px', border: '1.5px solid #fef3c7', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ background: '#d97706', color: 'white', borderRadius: '50%', padding: '10px', display: 'flex' }}><Truck size={22} /></div>
                            <div>
                                <h4 style={{ margin: '0 0 2px', fontSize: '1.05rem', color: '#92400e', fontWeight: 900 }}>Lalamove Delivery</h4>
                                <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 700 }}> Active (Customer/Store Rider Booking)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Location Rates Manager */}
                <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                                 Barangay Delivery Rates
                            </h3>
                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                Customize delivery charges per location/barangay
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="Search barangay..."
                                value={searchLoc}
                                onChange={(e) => setSearchLoc(e.target.value)}
                                style={{ ...inputStyle, width: '200px', padding: '8px 14px' }}
                            />
                            <button
                                onClick={() => {
                                    setEditingLoc(null);
                                    setLocForm({ id: 'loc_' + Date.now(), name: '', charge: 35 });
                                    setIsLocModalOpen(true);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#0c250d',
                                    color: '#F9B700',
                                    border: 'none',
                                    padding: '10px 18px',
                                    borderRadius: '12px',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Plus size={16} /> Add Barangay Location
                            </button>
                        </div>
                    </div>

                    {/* Table of Locations */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                    <th style={{ padding: '14px 16px', fontWeight: 800, fontSize: '0.85rem', color: '#475569' }}>BARANGAY / LOCATION</th>
                                    <th style={{ padding: '14px 16px', fontWeight: 800, fontSize: '0.85rem', color: '#475569' }}>DELIVERY FEE ()</th>
                                    <th style={{ padding: '14px 16px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLocations.map((loc, idx) => (
                                    <tr key={loc.id || loc.name || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0c250d', fontSize: '0.95rem' }}>
                                             {loc.name}
                                        </td>
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '0.9rem' }}>
                                                {loc.charge}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditingLoc(loc);
                                                        setLocForm({ id: loc.id || 'loc_' + Date.now(), name: loc.name, charge: loc.charge });
                                                        setIsLocModalOpen(true);
                                                    }}
                                                    style={{ border: '1px solid #cbd5e1', background: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                >
                                                    <Edit2 size={14} /> Edit Fee
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                                                    style={{ border: 'none', background: '#fee2e2', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="Delete Location"
                                                >
                                                    <Trash2 size={14} color="#ef4444" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL FOR ADD/EDIT LOCATION */}
                {isLocModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '24px', maxWidth: '420px', width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', overflow: 'hidden'
                        }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #091f0a 0%, #0d2b0e 100%)',
                                color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Truck color="#F9B700" size={22} />
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'white' }}>
                                        {editingLoc ? `Edit Delivery Fee: ${editingLoc.name}` : 'Add New Delivery Barangay'}
                                    </h3>
                                </div>
                                <button onClick={() => setIsLocModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
                            </div>

                            <form onSubmit={handleSaveLocation} style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px', color: '#334155' }}>
                                            Barangay / Location Name *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Poblacion, San Antonio"
                                            value={locForm.name}
                                            onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                                            required
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px', color: '#334155' }}>
                                            Delivery Charge Fee () *
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="e.g. 35"
                                            value={locForm.charge}
                                            onChange={(e) => setLocForm({ ...locForm, charge: e.target.value })}
                                            required
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                    <button type="button" onClick={() => setIsLocModalOpen(false)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#0c250d', color: '#F9B700', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Save size={16} /> Save Rate</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const PaymentSettings = () => {
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [editingMethod, setEditingMethod] = useState(null);
        const [isUploadingQR, setIsUploadingQR] = useState(false);
        const [uploadStatus, setUploadStatus] = useState(''); // local  avoids parent re-render
        const [formData, setFormData] = useState({
            id: '',
            name: '',
            account_number: '',
            account_name: '',
            instructions: '',
            qr_url: '',
            is_active: true
        });

        // Ref always mirrors latest formData  safe to read in async handlers
        const formDataRef = React.useRef(formData);
        React.useEffect(() => { formDataRef.current = formData; }, [formData]);

        const isCashMethod = (name) => {
            if (!name) return false;
            const lower = (name || '').toLowerCase().trim();
            if (lower.includes('gcash') || lower.includes('maya') || lower.includes('paymaya')) return false;
            return lower.includes('cash') || lower.includes('cod');
        };

        const resetModal = () => {
            setIsModalOpen(false);
            setEditingMethod(null);
            setUploadStatus('');
            setFormData({ id: '', name: '', account_number: '', account_name: '', instructions: '', qr_url: '', is_active: true });
        };

        const openAddModal = () => {
            setEditingMethod(null);
            setUploadStatus('');
            setFormData({ id: '', name: '', account_number: '', account_name: '', instructions: '', qr_url: '', is_active: true });
            setIsModalOpen(true);
        };

        const openEditModal = (method) => {
            setEditingMethod(method);
            setUploadStatus('');
            setFormData({
                id: method.id || '',
                name: method.name || '',
                account_number: method.account_number || method.accountNumber || '',
                account_name: method.account_name || method.accountName || '',
                instructions: method.instructions || '',
                qr_url: method.qr_url || '',
                is_active: method.is_active !== undefined ? method.is_active : true
            });
            setIsModalOpen(true);
        };

        const handleQRUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Validate file type and size
            if (!file.type.startsWith('image/')) {
                setUploadStatus(' Please select an image file.');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setUploadStatus(' Image must be under 5MB.');
                return;
            }

            setIsUploadingQR(true);
            setUploadStatus('Reading image');

            // Step 1: Convert to base64 immediately (always works, no network needed)
            const toBase64 = (f) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(f);
            });

            let base64Value = '';
            try {
                base64Value = await toBase64(file);
            } catch {
                setIsUploadingQR(false);
                setUploadStatus(' Error reading image file.');
                return;
            }

            // Set base64 immediately  this is the guaranteed fallback
            setFormData(prev => ({ ...prev, qr_url: base64Value }));
            setUploadStatus(' QR ready. Trying cloud upload');

            // Step 2: Try Supabase Storage for a proper public URL
            try {
                const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
                const fileName = `qr_${Date.now()}.${fileExt}`;
                const filePath = `qr-codes/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(filePath, file, { upsert: true });

                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('products').getPublicUrl(filePath);
                    if (urlData?.publicUrl) {
                        setFormData(prev => ({ ...prev, qr_url: urlData.publicUrl }));
                        setUploadStatus(' QR uploaded to cloud storage!');
                        setIsUploadingQR(false);
                        return;
                    }
                }
            } catch {
                // Storage not configured  base64 already saved above, that's fine
            }

            setUploadStatus(' QR code ready (stored as image data).');
            setIsUploadingQR(false);
        };

        const handleSaveMethod = async (e) => {
            e.preventDefault();
            // Use ref to get the absolute latest values regardless of React batching
            const current = formDataRef.current;

            if (!current.name.trim()) {
                showMessage('Please enter a payment method name');
                return;
            }

            const isCash = isCashMethod(current.name);
            const methodPayload = {
                name: current.name.trim(),
                account_number: (current.account_number || '').trim() || 'N/A',
                account_name: (current.account_name || '').trim() || 'N/A',
                instructions: (current.instructions || '').trim(),
                qr_url: isCash ? null : (current.qr_url || null),
                is_active: current.is_active
            };

            const isEditing = editingMethod && editingMethod.id;
            const isRealUUID = isEditing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingMethod.id);

            try {
                let saved;
                if (isEditing) {
                    if (isRealUUID) {
                        const { data, error } = await supabase
                            .from('payment_settings')
                            .update(methodPayload)
                            .eq('id', editingMethod.id)
                            .select()
                            .single();
                        if (error) throw error;
                        saved = data;
                    } else {
                        // Fallback: match by name for non-UUID legacy IDs
                        const { data, error } = await supabase
                            .from('payment_settings')
                            .update(methodPayload)
                            .eq('name', editingMethod.name)
                            .select()
                            .single();
                        if (error) throw error;
                        saved = data;
                    }
                    const updatedList = paymentSettings.map(p =>
                        p.id === editingMethod.id ? (saved || { ...methodPayload, id: editingMethod.id }) : p
                    );
                    setPaymentSettings(updatedList);
                    localStorage.setItem('paymentSettings', JSON.stringify(updatedList));
                } else {
                    const { data, error } = await supabase
                        .from('payment_settings')
                        .insert([methodPayload])
                        .select()
                        .single();
                    if (error) throw error;
                    saved = data;
                    const updatedList = [...paymentSettings, saved || { ...methodPayload, id: 'pay_' + Date.now() }];
                    setPaymentSettings(updatedList);
                    localStorage.setItem('paymentSettings', JSON.stringify(updatedList));
                }
            } catch (err) {
                console.warn('Supabase payment sync, using local fallback:', err.message);
                // Offline/error fallback  save locally so the UI reflects the change
                const fallbackId = isEditing ? editingMethod.id : 'pay_' + Date.now();
                const fallback = { ...methodPayload, id: fallbackId };
                const updatedList = isEditing
                    ? paymentSettings.map(p => p.id === editingMethod.id ? fallback : p)
                    : [...paymentSettings, fallback];
                setPaymentSettings(updatedList);
                localStorage.setItem('paymentSettings', JSON.stringify(updatedList));
            }

            showMessage(isEditing ? ' Payment method updated!' : ' New payment method added!');
            resetModal();
        };

        const handleDeleteMethod = async (id, name) => {
            if (paymentSettings.length <= 1) {
                showMessage(' You must keep at least one payment method active!');
                return;
            }
            if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

            const updatedList = paymentSettings.filter(p => p.id !== id);
            setPaymentSettings(updatedList);
            localStorage.setItem('paymentSettings', JSON.stringify(updatedList));

            // Match by name: the table can hold duplicate rows per method, and checkout lists every active one.
            const { error } = await supabase.from('payment_settings').delete().eq('name', name);
            if (error) {
                showMessage(` Could not delete "${name}" from the database: ${error.message}`);
                return;
            }

            showMessage(` "${name}" deleted.`);
        };

        const toggleActiveStatus = async (method) => {
            const updated = { ...method, is_active: !method.is_active };
            const updatedList = paymentSettings.map(p => p.id === method.id ? updated : p);
            setPaymentSettings(updatedList);
            localStorage.setItem('paymentSettings', JSON.stringify(updatedList));

            // Match by name so duplicate rows for the same method are all switched together.
            const { error } = await supabase.from('payment_settings').update({ is_active: updated.is_active }).eq('name', method.name);
            if (error) {
                showMessage(` Could not update ${method.name} in the database: ${error.message}`);
                return;
            }

            showMessage(`${method.name} is now ${updated.is_active ? ' Active' : ' Inactive'}`);
        };

        return (
            <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                             Payment Methods Manager
                        </h2>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                            Manage customer payment channels (GCash, Maya, Bank Transfer, COD, etc.)
                        </p>
                    </div>
                    <button onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0c250d', color: '#F9B700', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(12,37,13,0.25)' }}>
                        <Plus size={18} /> Add Payment Method
                    </button>
                </div>

                {/* Payment Method Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
                    {paymentSettings.map(p => {
                        const accNo = p.account_number || p.accountNumber || 'N/A';
                        const accName = p.account_name || p.accountName || 'N/A';
                        const isActive = p.is_active !== undefined ? p.is_active : true;

                        return (
                            <div key={p.id} style={{ padding: '22px', background: isActive ? '#fff' : '#f8fafc', borderRadius: '16px', border: isActive ? '1.5px solid #cbd5e1' : '1px dashed #cbd5e1', boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.04)' : 'none', opacity: isActive ? 1 : 0.7, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    {/* Title row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ background: isActive ? '#f0fdf4' : '#f1f5f9', color: isActive ? '#166534' : '#64748b', padding: '8px', borderRadius: '10px' }}>
                                                <CreditCard size={20} />
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0c250d', fontWeight: 900 }}>{p.name}</h4>
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {p.id}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleActiveStatus(p)} style={{ padding: '4px 10px', borderRadius: '20px', border: 'none', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#166534' : '#991b1b' }}>
                                            {isActive ? ' Active' : ' Inactive'}
                                        </button>
                                    </div>

                                    {/* Account details */}
                                    <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', marginBottom: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '4px' }}>
                                            <span style={{ color: '#64748b', fontWeight: 600 }}>Number/Phone:</span> <strong style={{ color: '#0c250d' }}>{accNo}</strong>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                                            <span style={{ color: '#64748b', fontWeight: 600 }}>Account Name:</span> <strong style={{ color: '#0c250d' }}>{accName}</strong>
                                        </div>
                                        {p.instructions && (
                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                                                "{p.instructions}"
                                            </div>
                                        )}
                                    </div>

                                    {/* QR thumbnail */}
                                    {p.qr_url && !isCashMethod(p.name) && (
                                        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                            <img src={p.qr_url} alt={`${p.name} QR`} style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', padding: '4px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>QR Code</div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                    <button onClick={() => openEditModal(p)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#0c250d', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                                        <Edit2 size={14} /> Edit
                                    </button>
                                    <button onClick={() => handleDeleteMethod(p.id, p.name)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }} title="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ADD / EDIT MODAL */}
                {isModalOpen && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={resetModal}>
                        <div style={{ background: 'white', borderRadius: '24px', maxWidth: '500px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

                            {/* Modal Header */}
                            <div style={{ background: 'linear-gradient(135deg, #091f0a 0%, #0d2b0e 100%)', color: 'white', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CreditCard color="#F9B700" size={22} />
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'white' }}>
                                        {editingMethod ? `Edit: ${editingMethod.name}` : 'Add New Payment Method'}
                                    </h3>
                                </div>
                                <button onClick={resetModal} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Scrollable form body */}
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                <form onSubmit={handleSaveMethod} id="payment-method-form">
                                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                        <div>
                                            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px', color: '#334155' }}>Payment Method Name *</label>
                                            <input type="text" placeholder="e.g. GCash, Maya, Bank Transfer, COD" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={inputStyle} />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px', color: '#334155' }}>Account / Phone Number</label>
                                            <input type="text" placeholder="e.g. 09947246294 or Account No." value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} style={inputStyle} />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px', color: '#334155' }}>Account Name / Holder</label>
                                            <input type="text" placeholder="e.g. Chilled and Frozen Hub" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} style={inputStyle} />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px', color: '#334155' }}>Instructions for Customer (Optional)</label>
                                            <textarea placeholder="e.g. Send screenshot of payment upon checkout." value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                                        </div>

                                        {/* QR Upload  hidden for Cash/COD */}
                                        {!isCashMethod(formData.name) && (
                                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1.5px dashed #cbd5e1' }}>
                                                <label style={{ display: 'block', fontWeight: 800, fontSize: '0.82rem', marginBottom: '10px', color: '#334155' }}> QR Code Image</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    {/* Preview box */}
                                                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#e2e8f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                                                        {formData.qr_url ? (
                                                            <img src={formData.qr_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="QR Preview" onError={(e) => { e.currentTarget.style.display='none'; }} />
                                                        ) : (
                                                            <ImageIcon size={28} color="#94a3b8" />
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '10px', background: isUploadingQR ? '#e2e8f0' : '#0c250d', color: isUploadingQR ? '#64748b' : '#F9B700', fontWeight: 800, fontSize: '0.82rem', cursor: isUploadingQR ? 'not-allowed' : 'pointer' }}>
                                                            <Camera size={15} />
                                                            {isUploadingQR ? 'Processing' : 'Upload QR Code'}
                                                            <input type="file" accept="image/*" onChange={handleQRUpload} disabled={isUploadingQR} style={{ display: 'none' }} />
                                                        </label>
                                                        {formData.qr_url && !isUploadingQR && (
                                                            <button type="button" onClick={() => { setFormData(prev => ({ ...prev, qr_url: '' })); setUploadStatus(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginLeft: '8px', padding: '8px 12px', borderRadius: '10px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                                                                <X size={13} /> Remove
                                                            </button>
                                                        )}
                                                        {uploadStatus && (
                                                            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: uploadStatus.startsWith('') ? '#ef4444' : '#059669', fontWeight: 600 }}>{uploadStatus}</p>
                                                        )}
                                                        {!uploadStatus && (
                                                            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>PNG or JPG. Shown to customers during checkout.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input type="checkbox" id="is_active_chk" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} style={{ width: '18px', height: '18px', accentColor: '#0c250d', cursor: 'pointer' }} />
                                            <label htmlFor="is_active_chk" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0c250d', cursor: 'pointer' }}>Enable this payment method for checkout</label>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                                        <button type="button" onClick={resetModal} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
                                        <button type="submit" disabled={isUploadingQR} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: isUploadingQR ? '#94a3b8' : '#0c250d', color: '#F9B700', fontWeight: 900, cursor: isUploadingQR ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit, sans-serif' }}>
                                            <Save size={16} /> {isUploadingQR ? 'Wait' : 'Save Method'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    const StoreGeneralSettings = () => {
        const [banners, setBanners] = useState(() => {
            if (Array.isArray(storeSettings.banner_images) && storeSettings.banner_images.length > 0) {
                return storeSettings.banner_images;
            }
            return [
                'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80'
            ];
        });

        const [newBannerUrl, setNewBannerUrl] = useState('');
        const [isUploading, setIsUploading] = useState(false);

        // Saves slideshow changes immediately so the homepage matches what the admin sees.
        const saveBanners = async (updated, successMsg) => {
            const previous = banners;
            setBanners(updated);
            setStoreSettings(prev => ({ ...prev, banner_images: updated }));
            try {
                await persistStoreSettings({ banner_images: updated });
                showMessage(successMsg);
            } catch (err) {
                setStoreSettings(prev => ({ ...prev, banner_images: previous }));
                showMessage(` Could not save slideshow: ${err.message}`);
            }
        };

        const handleAddBanner = (e) => {
            e.preventDefault();
            if (!newBannerUrl.trim()) return;
            setNewBannerUrl('');
            saveBanners([...banners, newBannerUrl.trim()], ' Slide image added!');
        };

        const handleRemoveBanner = (index) => {
            if (banners.length <= 1) {
                showMessage(' You should keep at least 1 hero banner image!');
                return;
            }
            saveBanners(banners.filter((_, i) => i !== index), ' Slide image deleted!');
        };

        const handleFileUpload = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIsUploading(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `banner_${Date.now()}.${fileExt}`;
                const filePath = `banners/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(filePath, file);

                if (uploadError) {
                    // Fallback to data URL if Supabase bucket isn't public/configured
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setIsUploading(false);
                        saveBanners([...banners, reader.result], ' Hero banner image uploaded!');
                    };
                    reader.readAsDataURL(file);
                    return;
                }

                const { data } = supabase.storage.from('products').getPublicUrl(filePath);
                if (data?.publicUrl) {
                    await saveBanners([...banners, data.publicUrl], ' Hero banner image uploaded to Supabase!');
                }
            } catch (err) {
                console.error(err);
                showMessage('Error uploading banner image');
            } finally {
                setIsUploading(false);
            }
        };

        const handleMoveBanner = (fromIndex, toIndex) => {
            if (toIndex < 0 || toIndex >= banners.length) return;
            const updated = [...banners];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);
            saveBanners(updated, ' Slide order updated!');
        };

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
                logo_url: storeSettings.logo_url || '/logo.png',
                banner_images: banners
            };

            try {
                await persistStoreSettings(settingsObj);
                showMessage(' Store general settings & Hero Slideshow updated successfully!');
            } catch (err) {
                showMessage(` Could not save settings: ${err.message}`);
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* General Settings Form */}
                <div style={{ background: 'white', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <h2 style={{ margin: '0 0 24px', fontSize: '1.4rem', fontWeight: 800, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                         General Store Settings
                    </h2>
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

                        {/* HERO SLIDESHOW MANAGER SECTION */}
                        <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '2px dashed #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0c250d', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <ImageIcon color="#F9B700" size={22} /> Hero Section Slideshow Banners ({banners.length})
                                    </h3>
                                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                        Manage background slide images displayed in the main website Hero section
                                    </p>
                                </div>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: '#f1f5f9',
                                    color: '#0c250d',
                                    padding: '10px 18px',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    border: '1px solid #cbd5e1'
                                }}>
                                    <Camera size={16} /> {isUploading ? 'Uploading...' : 'Upload Image File'}
                                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={isUploading} />
                                </label>
                            </div>

                            {/* Add Image by URL Input */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                                <input
                                    type="url"
                                    placeholder="Paste Image URL (https://...)"
                                    value={newBannerUrl}
                                    onChange={(e) => setNewBannerUrl(e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddBanner}
                                    style={{
                                        background: '#0c250d',
                                        color: '#F9B700',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        fontSize: '0.88rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Plus size={16} /> Add Slide Image
                                </button>
                            </div>

                            {/* Banner Cards Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                {banners.map((url, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            position: 'relative',
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            border: '2px solid #e2e8f0',
                                            background: '#f8fafc',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                        }}
                                    >
                                        <img
                                            src={url}
                                            alt={`Slide ${idx + 1}`}
                                            style={{
                                                width: '100%',
                                                height: '150px',
                                                objectFit: 'cover',
                                                display: 'block'
                                            }}
                                            onError={(e) => {
                                                e.target.src = 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80';
                                            }}
                                        />

                                        {/* Slide Badge */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '10px',
                                            background: '#0c250d',
                                            color: '#F9B700',
                                            padding: '4px 10px',
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            fontWeight: 800
                                        }}>
                                            Slide #{idx + 1}
                                        </div>

                                        {/* Actions Bar */}
                                        <div style={{
                                            padding: '10px 14px',
                                            background: 'white',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderTop: '1px solid #e2e8f0'
                                        }}>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => handleMoveBanner(idx, idx - 1)}
                                                    style={{ border: '1px solid #cbd5e1', background: idx === 0 ? '#f1f5f9' : 'white', borderRadius: '6px', padding: '4px 8px', cursor: idx === 0 ? 'default' : 'pointer' }}
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === banners.length - 1}
                                                    onClick={() => handleMoveBanner(idx, idx + 1)}
                                                    style={{ border: '1px solid #cbd5e1', background: idx === banners.length - 1 ? '#f1f5f9' : 'white', borderRadius: '6px', padding: '4px 8px', cursor: idx === banners.length - 1 ? 'default' : 'pointer' }}
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveBanner(idx)}
                                                style={{ border: 'none', background: '#fee2e2', color: '#ef4444', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            type="submit"
                            style={{
                                marginTop: '32px',
                                padding: '14px 32px',
                                borderRadius: '14px',
                                background: '#0c250d',
                                color: '#F9B700',
                                border: 'none',
                                fontWeight: 900,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 15px rgba(12,37,13,0.25)'
                            }}
                        >
                            <Save size={18} /> Save All Store & Slideshow Settings
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    // 
    // MAIN LAYOUT RENDER (LUXURY DARK GREEN & GOLD BRAND THEME)
    // 
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
                justifyContent: 'space-between'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px', paddingLeft: '6px' }}>
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Logo" style={{ height: '42px', width: '42px', borderRadius: '50%', border: '2px solid #F9B700', background: 'white', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                        <div>
                            <div style={{ fontSize: '1.02rem', fontWeight: 900, color: '#F9B700', lineHeight: 1.1 }}>Chilled & Frozen</div>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Admin Portal</span>
                        </div>
                    </div>

                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <SidebarItem
                            icon={<List size={18} />}
                            label="Inventory View"
                            active={false}
                            onClick={() => {
                                try {
                                    navigate('/admin/inventory');
                                    console.log('Navigated to inventory page');
                                } catch (error) {
                                    console.error('Navigation error:', error);
                                    showMessage('Error navigating to inventory page');
                                }
                            }}
                        />
                        <SidebarItem
                            icon={<Tag size={18} />}
                            label="Categories"
                            active={activeTab === 'categories'}
                            onClick={() => switchTab('categories')}
                        />
                        <SidebarItem
                            icon={<ShoppingBag size={18} />}
                            label="Orders History"
                            active={activeTab === 'orders'}
                            onClick={() => switchTab('orders')}
                            badge={orders.filter(o => o.status === 'Pending').length}
                        />
                        <SidebarItem
                            icon={<BarChart2 size={18} />}
                            label="Sales Analytics"
                            active={activeTab === 'analytics'}
                            onClick={() => switchTab('analytics')}
                        />
                        <SidebarItem
                            icon={<Truck size={18} />}
                            label="Order Types"
                            active={activeTab === 'orderTypes'}
                            onClick={() => switchTab('orderTypes')}
                        />
                        <SidebarItem
                            icon={<CreditCard size={18} />}
                            label="Payment Methods"
                            active={activeTab === 'payment'}
                            onClick={() => switchTab('payment')}
                        />
                        <SidebarItem
                            icon={<Settings size={18} />}
                            label="General Settings"
                            active={activeTab === 'settings'}
                            onClick={() => switchTab('settings')}
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
                        background: /error|could not|not saved|not to the database|not from the database|❌/i.test(message) ? '#ef4444' : '#059669',
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
                    justifyContent: 'space-between',
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
                            {activeTab === 'menu' && ' Menu & Product Catalog Editor'}
                            {activeTab === 'categories' && ' Store Categories'}
                            {activeTab === 'orders' && ' Customer Orders Manager'}
                            {activeTab === 'analytics' && ' Sales Analytics'}
                            {activeTab === 'orderTypes' && ' Order & Fulfillment Methods'}
                            {activeTab === 'payment' && ' Payment Methods'}
                            {activeTab === 'settings' && ' Store General Settings'}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{
                            padding: '6px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800,
                            background: '#dcfce7', color: '#166534'
                        }}>
                             Store Active
                        </span>
                        <a href="/" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0c250d', color: '#F9B700', textDecoration: 'none', padding: '8px 16px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 800 }}>
                            <span>View Live Store</span> <ExternalLink size={14} />
                        </a>
                    </div>
                </header>

                {/* Tab Views */}
                {activeTab === 'menu' && <MenuManager />}
                {activeTab === 'categories' && <CategoryManager />}
                {activeTab === 'orders' && <OrderHistory />}
                {activeTab === 'analytics' && <SalesAnalytics />}
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

const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.92rem' };

// ========== SALES ANALYTICS COMPONENT ==========
const SalesAnalytics = () => {
    const [orders, setOrders] = useState([]);
    const [items, setItems] = useState([]);
    const [dateRange, setDateRange] = useState('30');

    useEffect(() => {
        const savedOrders = localStorage.getItem('orders');
        const savedItems = localStorage.getItem('menuItems');
        if (savedOrders) setOrders(JSON.parse(savedOrders));
        if (savedItems) setItems(JSON.parse(savedItems));
    }, []);

    // Store visits (one per browser per day), recorded by the storefront
    const [visits, setVisits] = useState([]);
    const [visitsError, setVisitsError] = useState('');
    useEffect(() => {
        const fetchVisits = async () => {
            const since = new Date();
            since.setDate(since.getDate() - parseInt(dateRange) + 1);
            const { data, error } = await supabase
                .from('store_visits')
                .select('visit_date, ordered')
                .gte('visit_date', since.toLocaleDateString('en-CA'))
                .limit(100000);
            if (error) {
                setVisitsError(error.message);
                return;
            }
            setVisitsError('');
            setVisits(data || []);
        };
        fetchVisits();
    }, [dateRange]);

    const totalVisits = visits.length;
    const orderedVisits = visits.filter(v => v.ordered).length;
    const browsedOnlyVisits = totalVisits - orderedVisits;
    const conversionRate = totalVisits > 0 ? (orderedVisits / totalVisits) * 100 : 0;

    // Orders store total_amount / timestamp; older local copies may use total / created_at
    const orderTotal = (o) => Number(o.total_amount ?? o.total) || 0;
    const orderDate = (o) => o.timestamp || o.created_at;

    // Filter orders by date range
    const now = new Date();
    const rangeMs = parseInt(dateRange) * 24 * 60 * 60 * 1000;
    const filteredOrders = orders.filter(o => {
        if (!orderDate(o)) return true;
        return (now - new Date(orderDate(o))) <= rangeMs;
    });

    // Stats computation
    const completedOrders = filteredOrders.filter(o => o.status === 'Completed' || o.status === 'Confirmed');
    const pendingOrders = filteredOrders.filter(o => o.status === 'Pending');
    const cancelledOrders = filteredOrders.filter(o => o.status === 'Cancelled');

    const totalRevenue = completedOrders.reduce((sum, o) => sum + orderTotal(o), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const totalItems = completedOrders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0);

    // Daily sales for chart
    const dailySales = {};
    const daysToShow = Math.min(parseInt(dateRange), 30);
    for (let i = daysToShow - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailySales[key] = 0;
    }
    completedOrders.forEach(o => {
        if (!orderDate(o)) return;
        const d = new Date(orderDate(o));
        const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dailySales[key] !== undefined) {
            dailySales[key] += orderTotal(o);
        }
    });
    const maxDailySale = Math.max(...Object.values(dailySales), 1);

    // Top products
    const productCount = {};
    completedOrders.forEach(o => {
        if (!o.items) return;
        o.items.forEach(item => {
            // Items are saved as text like "Chicken Breast (x2) - Box A (...)"
            const match = typeof item === 'string' ? item.match(/^(.*?) (x(d+))/) : null;
            const name = match ? match[1] : (item.name || (typeof item === 'string' ? item : 'Unknown'));
            const qty = match ? Number(match[2]) : (item.quantity || 1);
            productCount[name] = (productCount[name] || 0) + qty;
        });
    });
    const topProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    const maxProductCount = topProducts.length > 0 ? topProducts[0][1] : 1;

    // Order type breakdown
    const orderTypeCount = {};
    filteredOrders.forEach(o => {
        const type = o.order_type || o.orderType || 'Unknown';
        orderTypeCount[type] = (orderTypeCount[type] || 0) + 1;
    });

    const statCardStyle = (gradient) => ({
        background: gradient,
        borderRadius: '20px',
        padding: '22px 24px',
        color: 'white',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        position: 'relative',
        overflow: 'hidden'
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Date Range Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#475569' }}>Date Range:</span>
                {['7', '14', '30', '90'].map(d => (
                    <button
                        key={d}
                        onClick={() => setDateRange(d)}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '12px',
                            border: dateRange === d ? '2px solid #0c250d' : '1px solid #cbd5e1',
                            background: dateRange === d ? '#0c250d' : 'white',
                            color: dateRange === d ? '#F9B700' : '#475569',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {d} Days
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={statCardStyle('linear-gradient(135deg, #059669 0%, #10b981 100%)')}>
                    <div style={{ opacity: 0.12, position: 'absolute', right: -8, top: -8 }}><DollarSign size={80} /></div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '6px' }}>₱{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>{completedOrders.length} completed orders</div>
                </div>
                <div style={statCardStyle('linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)')}>
                    <div style={{ opacity: 0.12, position: 'absolute', right: -8, top: -8 }}><ShoppingBag size={80} /></div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '6px' }}>{filteredOrders.length}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>{pendingOrders.length} pending</div>
                </div>
                <div style={statCardStyle('linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)')}>
                    <div style={{ opacity: 0.12, position: 'absolute', right: -8, top: -8 }}><TrendingUp size={80} /></div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Order Value</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '6px' }}>₱{avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>{totalItems} items sold</div>
                </div>
                <div style={statCardStyle('linear-gradient(135deg, #dc2626 0%, #f87171 100%)')}>
                    <div style={{ opacity: 0.12, position: 'absolute', right: -8, top: -8 }}><Activity size={80} /></div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cancelled</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '6px' }}>{cancelledOrders.length}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.8 }}>
                        {filteredOrders.length > 0 ? ((cancelledOrders.length / filteredOrders.length) * 100).toFixed(1) : 0}% rate
                    </div>
                </div>
            </div>

            {/* Store Visits: ordered vs. browsed only */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 900, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                    👥 Store Visits (last {dateRange} days)
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '0.78rem', color: '#64748b' }}>
                    Each visitor is counted once per day. A visit counts as "ordered" when that visitor sent an order.
                </p>
                {visitsError ? (
                    <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 700 }}>Could not load store visits: {visitsError}</div>
                ) : (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                            {[
                                { label: 'Total Visits', value: totalVisits, sub: 'store visitors', color: '#0c250d', bg: '#f1f5f9', icon: <Users size={18} /> },
                                { label: 'Visited & Ordered', value: orderedVisits, sub: 'sent an order', color: '#059669', bg: '#ecfdf5', icon: <ShoppingBag size={18} /> },
                                { label: 'Visited Only', value: browsedOnlyVisits, sub: 'browsed, no order', color: '#d97706', bg: '#fffbeb', icon: <Eye size={18} /> },
                                { label: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, sub: 'visitors who ordered', color: '#7c3aed', bg: '#f5f3ff', icon: <TrendingUp size={18} /> }
                            ].map(s => (
                                <div key={s.label} style={{ background: s.bg, borderRadius: '14px', padding: '14px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: s.color, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        {s.icon} {s.label}
                                    </div>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: s.color, marginTop: '6px' }}>{s.value}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.sub}</div>
                                </div>
                            ))}
                        </div>
                        {/* Ordered vs. visited-only split */}
                        <div style={{ display: 'flex', height: '14px', borderRadius: '8px', overflow: 'hidden', background: '#e2e8f0' }}>
                            {totalVisits > 0 && (
                                <>
                                    <div title={`Ordered: ${orderedVisits}`} style={{ width: `${(orderedVisits / totalVisits) * 100}%`, background: '#059669' }} />
                                    <div title={`Visited only: ${browsedOnlyVisits}`} style={{ width: `${(browsedOnlyVisits / totalVisits) * 100}%`, background: '#f59e0b' }} />
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, flexWrap: 'wrap' }}>
                            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#059669', marginRight: '6px' }} />Ordered</span>
                            <span><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b', marginRight: '6px' }} />Visited only</span>
                            {totalVisits === 0 && <span style={{ color: '#94a3b8' }}>No visits recorded yet in this period.</span>}
                        </div>
                    </>
                )}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                {/* Daily Sales Bar Chart */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 900, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                        📊 Daily Sales Revenue
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '200px', padding: '0 4px' }}>
                        {Object.entries(dailySales).map(([day, amount]) => (
                            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                <div
                                    style={{
                                        width: '100%',
                                        maxWidth: '32px',
                                        height: `${Math.max((amount / maxDailySale) * 100, 2)}%`,
                                        background: amount > 0 
                                            ? 'linear-gradient(180deg, #059669 0%, #10b981 100%)' 
                                            : '#e2e8f0',
                                        borderRadius: '6px 6px 2px 2px',
                                        transition: 'height 0.5s ease',
                                        minHeight: '4px',
                                        position: 'relative'
                                    }}
                                    title={`${day}: ₱${amount.toLocaleString()}`}
                                />
                                <span style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 700, transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                                    {day}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Status Distribution */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 900, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                        📋 Order Status
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { label: 'Completed', count: completedOrders.length, color: '#059669', bg: '#ecfdf5' },
                            { label: 'Pending', count: pendingOrders.length, color: '#d97706', bg: '#fffbeb' },
                            { label: 'Cancelled', count: cancelledOrders.length, color: '#dc2626', bg: '#fef2f2' }
                        ].map(s => (
                            <div key={s.label}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: s.color }}>{s.label}</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: s.color }}>{s.count}</span>
                                </div>
                                <div style={{ height: '10px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${filteredOrders.length > 0 ? (s.count / filteredOrders.length) * 100 : 0}%`,
                                        background: s.color,
                                        borderRadius: '999px',
                                        transition: 'width 0.6s ease'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Type Breakdown */}
                    <h4 style={{ margin: '24px 0 12px', fontSize: '0.88rem', fontWeight: 800, color: '#475569' }}>By Order Type</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(orderTypeCount).map(([type, count]) => (
                            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>{type}</span>
                                <span style={{ background: '#0c250d', color: '#F9B700', padding: '2px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Products */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 900, color: '#0c250d', fontFamily: 'Outfit, sans-serif' }}>
                    🏆 Top Selling Products
                </h3>
                {topProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '0.9rem' }}>
                        No sales data available for this period
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {topProducts.map(([name, count], idx) => (
                            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: idx === 0 ? 'linear-gradient(135deg, rgba(249,183,0,0.08) 0%, rgba(249,183,0,0.02) 100%)' : '#f8fafc', borderRadius: '14px', border: idx === 0 ? '1.5px solid rgba(249,183,0,0.3)' : '1px solid #e2e8f0' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: idx === 0 ? '#F9B700' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7f32' : '#e2e8f0',
                                    color: idx < 3 ? 'white' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900,
                                    fontSize: '0.85rem',
                                    flexShrink: 0
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '120px', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(count / maxProductCount) * 100}%`,
                                            background: idx === 0 ? '#F9B700' : 'linear-gradient(90deg, #059669, #10b981)',
                                            borderRadius: '999px',
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                    <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#059669', minWidth: '40px', textAlign: 'right' }}>{count} sold</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
