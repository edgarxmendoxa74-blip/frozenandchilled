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
    Truck
} from 'lucide-react';
import { categories as initialCategories, menuItems as initialItems } from '../data/MenuData';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('menu'); // menu, categories, orders, payment, orderTypes
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
            { id: 'dine-in', name: 'Dine-in' },
            { id: 'pickup', name: 'Pickup' },
            { id: 'delivery', name: 'Delivery' }
        ];
    });

    const [paymentSettings, setPaymentSettings] = useState(() => {
        const saved = localStorage.getItem('paymentSettings');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) {
                // Migration for existing users
                return [
                    { id: 'gcash', name: 'GCash', accountNumber: parsed.gcash?.number || '', accountName: parsed.gcash?.name || '', qrUrl: parsed.gcash?.qrUrl || '' },
                    { id: 'paymaya', name: 'PayMaya', accountNumber: parsed.paymaya?.number || '', accountName: parsed.paymaya?.name || '', qrUrl: parsed.paymaya?.qrUrl || '' }
                ];
            }
            return parsed;
        }
        return [
            { id: 'gcash', name: 'GCash', accountNumber: '', accountName: '', qrUrl: '' },
            { id: 'paymaya', name: 'PayMaya', accountNumber: '', accountName: '', qrUrl: '' }
        ];
    });

    const [storeSettings, setStoreSettings] = useState(() => {
        const saved = localStorage.getItem('storeSettings');
        return saved ? JSON.parse(saved) : {
            manual_status: 'auto', // auto, open, closed
            open_time: '10:00',
            close_time: '01:00',
            store_name: 'Chilled And Frozen Hub',
            address: '',
            contact: '',
            logo_url: '',
            banner_images: []
        };
    });

    // --- FETCH DATA FROM SUPABASE ---
    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const { data: catData, error: catError } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
                if (catError) throw catError;
                if (catData) setCategories(catData);

                const { data: itemData, error: itemError } = await supabase.from('menu_items').select('*').order('sort_order', { ascending: true });
                if (itemError) throw itemError;
                if (itemData) setItems(itemData);

                const { data: payData, error: payError } = await supabase.from('payment_settings').select('*');
                if (payError) throw payError;
                if (payData) setPaymentSettings(payData);

                const { data: typeData, error: typeError } = await supabase.from('order_types').select('*');
                if (typeError) throw typeError;
                if (typeData) setOrderTypes(typeData);

                const { data: storeData, error: storeError } = await supabase.from('store_settings').select('*').limit(1).single();
                if (storeError && storeError.code !== 'PGRST116') throw storeError; // Ignore if no settings record yet
                if (storeData) setStoreSettings(storeData);

                const { data: orderData, error: orderError } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
                if (orderError) throw orderError;
                if (orderData) setOrders(orderData);
            } catch (err) {
                console.error('Error fetching admin data:', err);
                showMessage(`Error loading data: ${err.message || 'Unknown error'}`);
            }
        };
        fetchAdminData();
    }, []);

    // --- HELPERS ---

    // --- HELPER FUNC ---
    const handleFileUpload = async (e, methodId) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const qr_url = reader.result;
                const { error } = await supabase.from('payment_settings').update({ qr_url }).eq('id', methodId);
                if (error) {
                    console.error(error);
                    showMessage(`Error saving QR code: ${error.message}`);
                    return;
                }
                setPaymentSettings(prev => prev.map(m => m.id === methodId ? { ...m, qr_url } : m));
                showMessage('QR code updated!');
            };
            reader.readAsDataURL(file);
        }
    };

    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_bypass');
        navigate('/admin');
    };

    // --- COMPONENT: MENU MANAGER ---
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
                stock: Number(formData.get('stock') || 0),
                low_stock_threshold: Number(formData.get('lowStockThreshold') || 5),
                unit: formData.get('unit') || 'kg',
                min_order_note: formData.get('minOrderNote') || '',
                category_id: formData.get('categoryId'),
                image: editingItem.image || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80',
                variations: tempVariations,
                flavors: tempFlavors,
                addons: tempAddons,
                out_of_stock: formData.get('outOfStock') === 'on' || Number(formData.get('stock') || 0) === 0
            };

            let finalItem;
            if (editingItem.id === 'new') {
                if (!itemData.category_id) { showMessage('Please select a category first.'); return; }
                const { data, error } = await supabase.from('menu_items').insert([itemData]).select().single();
                if (error) { console.error(error); showMessage(`Error saving: ${error.message}`); return; }
                finalItem = data;
                setItems([...items, finalItem]);
            } else {
                const { data, error } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id).select().single();
                if (error) { console.error(error); showMessage(`Error updating: ${error.message}`); return; }
                finalItem = data;
                setItems(items.map(i => i.id === finalItem.id ? finalItem : i));
            }

            setEditingItem(null);
            showMessage('Product & inventory saved successfully!');
        };

        const deleteItem = async (id) => {
            if (window.confirm('Delete this product?')) {
                const { error } = await supabase.from('menu_items').delete().eq('id', id);
                if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
                setItems(items.filter(i => i.id !== id));
                showMessage('Product deleted.');
            }
        };

        const moveItem = async (id, direction) => {
            const index = items.findIndex(i => i.id === id);
            if (index === -1) return;
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= items.length) return;

            const newItems = [...items];
            const [removed] = newItems.splice(index, 1);
            newItems.splice(newIndex, 0, removed);

            const updatedItems = newItems.map((item, idx) => ({ ...item, sort_order: idx }));
            setItems(updatedItems);

            const { error } = await supabase.from('menu_items').upsert(updatedItems);
            if (error) {
                console.error('Error syncing order:', error);
                showMessage('Error saving item order.');
            } else {
                showMessage('Item order updated!');
            }
        };

        const filteredItems = items.filter(item => {
            const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
            return matchesSearch && matchesCategory;
        });

        const lowStockItems = items.filter(i => (i.stock !== undefined && i.stock <= (i.low_stock_threshold || i.lowStockThreshold || 5)));

        // Render List
        if (!editingItem) return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                {/* Low Stock Alert Section */}
                {lowStockItems.length > 0 && (
                    <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#991b1b', marginBottom: '10px' }}>
                            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Low Stock Alert ({lowStockItems.length} Products)</h3>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#7f1d1d', margin: '0 0 15px' }}>The following items are running low on stock and need to be replenished soon:</p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {lowStockItems.map(item => (
                                <div key={item.id} style={{ background: 'white', border: '1px solid #f87171', padding: '8px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937' }}>{item.name}</span>
                                    <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}>
                                        {item.stock} {item.unit || 'kg'} left
                                    </span>
                                    <button onClick={() => setEditingItem(item)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Update Stock</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Inventory & Menu List</h2>
                    <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...inputStyle, width: '250px' }}
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{ ...inputStyle, width: '180px' }}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={() => setEditingItem({ id: 'new', category_id: categories[0]?.id, stock: 20, low_stock_threshold: 5, unit: 'kg' })} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                            <Plus size={18} /> Add Product
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '10px' }}>Product</th>
                                <th style={{ padding: '10px' }}>Category</th>
                                <th style={{ padding: '10px' }}>Price</th>
                                <th style={{ padding: '10px' }}>Stock Level</th>
                                <th style={{ padding: '10px' }}>Status</th>
                                <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No products found matching your criteria.</td></tr>
                            ) : filteredItems.map(item => {
                                const isLow = item.stock !== undefined && item.stock <= (item.low_stock_threshold || item.lowStockThreshold || 5);
                                const isOut = item.out_of_stock || item.stock === 0;

                                return (
                                    <tr key={item.id} style={{ background: isOut ? '#fef2f2' : isLow ? '#fffbe6' : '#f8fafc' }}>
                                        <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                            <img src={item.image} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{item.name}</div>
                                                {item.min_order_note && <div style={{ fontSize: '0.75rem', color: 'var(--primary-dark)', fontWeight: 600 }}>{item.min_order_note}</div>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ padding: '4px 10px', background: '#e2e8f0', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            {item.promo_price ? (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem' }}>₱{item.price}</span>
                                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>₱{item.promo_price}</span>
                                                </div>
                                            ) : <span style={{ fontWeight: 700 }}>₱{item.price} /{item.unit || 'kg'}</span>}
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 800, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669', fontSize: '0.95rem' }}>
                                                {item.stock !== undefined ? `${item.stock} ${item.unit || 'kg'}` : 'N/A'}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                Alert at ≤ {item.low_stock_threshold || item.lowStockThreshold || 5} {item.unit || 'kg'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            {isOut ? (
                                                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>Out of Stock</span>
                                            ) : isLow ? (
                                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>⚠️ Low Stock</span>
                                            ) : (
                                                <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>In Stock</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => moveItem(item.id, 'up')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Move Up"><ChevronUp size={18} /></button>
                                                <button onClick={() => moveItem(item.id, 'down')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Move Down"><ChevronDown size={18} /></button>
                                                <button onClick={() => setEditingItem(item)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Edit Product & Inventory"><Edit2 size={18} /></button>
                                                <button onClick={() => deleteItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );

        // Render Editor (Simplified for brevity but functional)
        return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3>{editingItem.id === 'new' ? 'New Product' : 'Edit Product'}</h3>
                    <button onClick={() => setEditingItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                        <input name="name" defaultValue={editingItem.name} placeholder="Product Name" required style={inputStyle} />
                        <textarea name="description" defaultValue={editingItem.description} placeholder="Description" style={inputStyle} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Current Stock</label>
                                <input name="stock" type="number" defaultValue={editingItem.stock ?? 20} placeholder="Stock Qty" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Low Stock Threshold Alert</label>
                                <input name="lowStockThreshold" type="number" defaultValue={editingItem.low_stock_threshold || editingItem.lowStockThreshold || 5} placeholder="Alert Threshold" required style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Unit (kg, slab, box, sack)</label>
                                <input name="unit" defaultValue={editingItem.unit || 'kg'} placeholder="e.g. kg, slab, box" required style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '5px' }}>Minimum Order Note / Tag (Optional)</label>
                            <input name="minOrderNote" defaultValue={editingItem.min_order_note || editingItem.minOrderNote || ''} placeholder="e.g. Minimum 1 Slab, Wholesale min 1 box" style={inputStyle} />
                        </div>
                        <select name="categoryId" defaultValue={editingItem.category_id} style={inputStyle}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ fontWeight: 600 }}>Product Image</label>
                            {editingItem.image && <img src={editingItem.image} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} />}
                            <input type="file" accept="image/*" onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setEditingItem({ ...editingItem, image: reader.result });
                                    reader.readAsDataURL(file);
                                }
                            }} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input name="outOfStock" type="checkbox" defaultChecked={editingItem.out_of_stock} style={{ width: '20px', height: '20px' }} />
                            <label style={{ fontWeight: 600 }}>Mark as Out of Stock</label>
                        </div>
                    </div>

                    {/* Variations */}
                    <SectionLabel title="Variations" onAdd={() => setTempVariations([...tempVariations, { name: 'Size', price: 0 }])} />
                    {tempVariations.map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input value={v.name} onChange={e => { const n = [...tempVariations]; n[i].name = e.target.value; setTempVariations(n); }} placeholder="Name" style={inputStyle} />
                            <input type="number" value={v.price} onChange={e => { const n = [...tempVariations]; n[i].price = Number(e.target.value); setTempVariations(n); }} placeholder="Price" style={inputStyle} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={v.disabled} onChange={e => { const n = [...tempVariations]; n[i].disabled = e.target.checked; setTempVariations(n); }} />
                                <label style={{ fontSize: '0.75rem' }}>Disabled</label>
                            </div>
                            <button type="button" onClick={() => setTempVariations(tempVariations.filter((_, idx) => idx !== i))} style={{ color: 'red', border: 'none', background: 'none' }}><X size={18} /></button>
                        </div>
                    ))}

                    {/* Flavors */}
                    <SectionLabel title="Flavors" onAdd={() => setTempFlavors([...tempFlavors, { name: '', disabled: false }])} />
                    {tempFlavors.map((f, i) => {
                        const name = typeof f === 'string' ? f : f.name;
                        const disabled = typeof f === 'object' ? f.disabled : false;
                        return (
                            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                <input
                                    value={name}
                                    onChange={e => {
                                        const n = [...tempFlavors];
                                        if (typeof n[i] === 'string') n[i] = { name: e.target.value, disabled: false };
                                        else n[i] = { ...n[i], name: e.target.value };
                                        setTempFlavors(n);
                                    }}
                                    placeholder="Flavor Name (e.g. Buffalo)"
                                    style={inputStyle}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                    <input
                                        type="checkbox"
                                        checked={disabled}
                                        onChange={e => {
                                            const n = [...tempFlavors];
                                            if (typeof n[i] === 'string') n[i] = { name: n[i], disabled: e.target.checked };
                                            else n[i] = { ...n[i], disabled: e.target.checked };
                                            setTempFlavors(n);
                                        }}
                                    />
                                    <label style={{ fontSize: '0.75rem' }}>Disabled</label>
                                </div>
                                <button type="button" onClick={() => setTempFlavors(tempFlavors.filter((_, idx) => idx !== i))} style={{ color: 'red', border: 'none', background: 'none' }}><X size={18} /></button>
                            </div>
                        );
                    })}

                    {/* Addons */}
                    <SectionLabel title="Add-ons" onAdd={() => setTempAddons([...tempAddons, { name: 'Addon', price: 0 }])} />
                    {tempAddons.map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input value={v.name} onChange={e => { const n = [...tempAddons]; n[i].name = e.target.value; setTempAddons(n); }} placeholder="Name" style={inputStyle} />
                            <input type="number" value={v.price} onChange={e => { const n = [...tempAddons]; n[i].price = Number(e.target.value); setTempAddons(n); }} placeholder="Price" style={inputStyle} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={v.disabled} onChange={e => { const n = [...tempAddons]; n[i].disabled = e.target.checked; setTempAddons(n); }} />
                                <label style={{ fontSize: '0.75rem' }}>Disabled</label>
                            </div>
                            <button type="button" onClick={() => setTempAddons(tempAddons.filter((_, idx) => idx !== i))} style={{ color: 'red', border: 'none', background: 'none' }}><X size={18} /></button>
                        </div>
                    ))}

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px' }}>Save Product</button>
                </form>
            </div>
        );
    };

    // --- COMPONENT: CATEGORY MANAGER ---
    const CategoryManager = () => {
        const [newCat, setNewCat] = useState('');
        const [editingCatId, setEditingCatId] = useState(null);
        const [editCatName, setEditCatName] = useState('');

        const addCategory = async (e) => {
            e.preventDefault();
            if (!newCat.trim()) return;
            const { data, error } = await supabase.from('categories').insert([{ name: newCat, sort_order: categories.length }]).select().single();
            if (error) { console.error(error); showMessage(`Error adding category: ${error.message}`); return; }
            setCategories([...categories, data]);
            setNewCat('');
            showMessage('Category added!');
        };

        const startEdit = (cat) => {
            setEditingCatId(cat.id);
            setEditCatName(cat.name);
        };

        const saveEdit = async (id) => {
            if (!editCatName.trim()) return;
            const { data, error } = await supabase.from('categories').update({ name: editCatName }).eq('id', id).select().single();
            if (error) { console.error(error); showMessage(`Error updating: ${error.message}`); return; }
            setCategories(categories.map(c => c.id === id ? data : c));
            setEditingCatId(null);
            showMessage('Category updated!');
        };

        const moveCategory = async (id, direction) => {
            const index = categories.findIndex(c => c.id === id);
            if (index === -1) return;
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= categories.length) return;

            const newCats = [...categories];
            const [removed] = newCats.splice(index, 1);
            newCats.splice(newIndex, 0, removed);

            const updatedCats = newCats.map((cat, idx) => ({ ...cat, sort_order: idx }));
            setCategories(updatedCats);

            const { error } = await supabase.from('categories').upsert(updatedCats);
            if (error) {
                console.error('Error syncing order:', error);
                showMessage('Error saving category order.');
            } else {
                showMessage('Category order updated!');
            }
        };

        const deleteCategory = async (id) => {
            if (items.some(i => i.category_id === id)) {
                alert('Cannot delete category because it has products.');
                return;
            }
            if (window.confirm('Delete category?')) {
                const { error } = await supabase.from('categories').delete().eq('id', id);
                if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
                setCategories(categories.filter(c => c.id !== id));
                showMessage('Category deleted.');
            }
        };

        return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                <h2 style={{ marginBottom: '30px' }}>Categories Management</h2>
                <form onSubmit={addCategory} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                    <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New Category Name (e.g. Desserts)" style={{ ...inputStyle, flex: 1 }} />
                    <button type="submit" className="btn-primary" style={{ padding: '10px 25px' }}>Add Category</button>
                </form>
                <div style={{ display: 'grid', gap: '15px' }}>
                    {categories.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                            {editingCatId === c.id ? (
                                <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                    <input value={editCatName} onChange={e => setEditCatName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                    <button onClick={() => saveEdit(c.id)} className="btn-primary" style={{ padding: '5px 15px' }}>Save</button>
                                    <button onClick={() => setEditingCatId(null)} style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '10px', padding: '5px 15px' }}>Cancel</button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c.name}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{items.filter(i => i.category_id === c.id).length} products</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => moveCategory(c.id, 'up')} style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }} title="Move Up"><ChevronUp size={20} /></button>
                                        <button onClick={() => moveCategory(c.id, 'down')} style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }} title="Move Down"><ChevronDown size={20} /></button>
                                        <button onClick={() => startEdit(c)} style={{ color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }} title="Edit"><Edit2 size={20} /></button>
                                        <button onClick={() => deleteCategory(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }} title="Delete"><Trash2 size={20} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- COMPONENT: ORDER TYPE MANAGER ---
    const OrderTypeManager = () => {
        const FIXED_TYPES = [
            { id: 'pickup', name: 'Pick Up', defaultActive: true },
            { id: 'delivery', name: 'Delivery', defaultActive: true }
        ];

        const [localTypes, setLocalTypes] = useState([]);

        useEffect(() => {
            // Merge fixed types with db state
            const merged = FIXED_TYPES.map(ft => {
                const existing = orderTypes.find(t => t.id === ft.id);
                return existing ? existing : { ...ft, is_active: ft.defaultActive };
            });
            setLocalTypes(merged);
        }, [orderTypes]);

        const toggleType = async (type) => {
            const newStatus = !type.is_active;

            // Optimistic update
            const updated = localTypes.map(t => t.id === type.id ? { ...t, is_active: newStatus, name: type.name } : t);
            setLocalTypes(updated);
            setOrderTypes(updated);

            // Update DB
            const { error } = await supabase.from('order_types').upsert({
                id: type.id,
                name: type.name, // Ensure name is saved (e.g. "Take Out")
                is_active: newStatus
            });

            if (error) {
                console.error(error);
                showMessage(`Error updating: ${error.message}`);
                // Revert on error would go here
            } else {
                showMessage(`${type.name} is now ${newStatus ? 'Active' : 'Inactive'}`);
            }
        };

        return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                <h2 style={{ marginBottom: '10px' }}>Order Types Management</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Manage the availability of service options.</p>

                <div style={{ display: 'grid', gap: '15px' }}>
                    {localTypes.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '10px',
                                    background: t.is_active ? 'var(--primary)' : '#cbd5e1',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white'
                                }}>

                                    {t.id === 'pickup' && <ShoppingBag size={20} />}
                                    {t.id === 'delivery' && <Truck size={20} />}
                                </div>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '1.1rem', display: 'block' }}>{t.name}</span>
                                    <span style={{ fontSize: '0.85rem', color: t.is_active ? '#166534' : 'var(--text-muted)' }}>
                                        {t.is_active ? 'Currently Available' : 'Unavailable'}
                                    </span>
                                </div>
                            </div>

                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={t.is_active !== false}
                                    onChange={() => toggleType(t)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: t.is_active ? 'var(--primary)' : '#ccc',
                                    transition: '.4s', borderRadius: '34px'
                                }}></span>
                                <span style={{
                                    position: 'absolute', content: '""', height: '20px', width: '20px', left: '3px', bottom: '3px',
                                    backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                    transform: t.is_active ? 'translateX(24px)' : 'translateX(0)'
                                }}></span>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- COMPONENT: PAYMENT SETTINGS ---
    const PaymentSettings = () => {
        const [editingMethodId, setEditingMethodId] = useState(null);
        const [showAddMethod, setShowAddMethod] = useState(false);

        const handleSaveMethod = async (e, methodId) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = {
                name: formData.get('name'),
                account_number: formData.get('accountNumber'),
                account_name: formData.get('accountName'),
            };
            const { data, error } = await supabase.from('payment_settings').update(updateData).eq('id', methodId).select().single();
            if (error) { console.error(error); showMessage(`Error updating: ${error.message}`); return; }
            setPaymentSettings(paymentSettings.map(m => m.id === methodId ? data : m));
            setEditingMethodId(null);
            showMessage('Payment method updated!');
        };

        const handleAddMethod = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newMethod = {
                name: formData.get('name'),
                account_number: formData.get('accountNumber'),
                account_name: formData.get('accountName'),
                qr_url: ''
            };
            const { data, error } = await supabase.from('payment_settings').insert([newMethod]).select().single();
            if (error) { console.error(error); showMessage(`Error adding: ${error.message}`); return; }
            setPaymentSettings([...paymentSettings, data]);
            setShowAddMethod(false);
            showMessage('Payment method added!');
        };

        const deleteMethod = async (id) => {
            if (window.confirm('Delete this payment method?')) {
                const { error } = await supabase.from('payment_settings').delete().eq('id', id);
                if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
                setPaymentSettings(paymentSettings.filter(m => m.id !== id));
                showMessage('Payment method deleted.');
            }
        };

        return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ margin: 0 }}>Payment Methods Management</h2>
                    <button onClick={() => setShowAddMethod(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                        <Plus size={18} /> Add Method
                    </button>
                </div>

                {showAddMethod && (
                    <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Add New Payment Method</h3>
                            <button onClick={() => setShowAddMethod(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddMethod} style={{ display: 'grid', gap: '15px' }}>
                            <input name="name" placeholder="Method Name (e.g. Bank Transfer, GCash)" required style={inputStyle} />
                            <input name="accountNumber" placeholder="Account Number" required style={inputStyle} />
                            <input name="accountName" placeholder="Account Name" required style={inputStyle} />
                            <button type="submit" className="btn-primary">Save Method</button>
                        </form>
                    </div>
                )}

                <div style={{ display: 'grid', gap: '20px' }}>
                    {paymentSettings.map(method => (
                        <div key={method.id} style={{ background: '#f8fafc', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                            {editingMethodId === method.id ? (
                                <form onSubmit={(e) => handleSaveMethod(e, method.id)} style={{ display: 'grid', gap: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <h3 style={{ margin: 0 }}>Edit {method.name}</h3>
                                        <button type="button" onClick={() => setEditingMethodId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                                    </div>
                                    <input name="name" defaultValue={method.name} placeholder="Method Name" required style={inputStyle} />
                                    <input name="accountNumber" defaultValue={method.account_number} placeholder="Account Number" required style={inputStyle} />
                                    <input name="accountName" defaultValue={method.account_name} placeholder="Account Name" required style={inputStyle} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>QR Code Image (Optional)</label>
                                        {method.qr_url && <img src={method.qr_url} style={{ width: '100px', height: '100px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #ddd' }} />}
                                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, method.id)} style={inputStyle} />
                                    </div>

                                    <button type="submit" className="btn-primary">Save Changes</button>
                                </form>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {method.name}
                                            </h3>
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{method.account_number}</span>
                                                <button onClick={() => { navigator.clipboard.writeText(method.account_number); showMessage('Number copied!'); }} style={{ border: 'none', background: '#e2e8f0', color: 'var(--primary)', borderRadius: '5px', padding: '5px', cursor: 'pointer' }} title="Copy Number">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '5px' }}>{method.account_name}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => setEditingMethodId(method.id)} style={{ color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}><Edit2 size={20} /></button>
                                            <button onClick={() => deleteMethod(method.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                    {method.qr_url && (
                                        <div style={{ marginTop: '15px' }}>
                                            <img src={method.qr_url} style={{ width: '150px', height: '150px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }} alt="QR Code" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --- COMPONENT: ORDERS LIST ---
    const OrderHistory = () => {
        const stats = orders.reduce((acc, order) => {
            acc.totalOrders++;
            if (order.status !== 'Cancelled') {
                acc.totalSales += Number(order.total_amount || 0);
            }
            if (order.status === 'Pending' || !order.status) acc.pendingOrders++;
            return acc;
        }, { totalOrders: 0, totalSales: 0, pendingOrders: 0 });

        const updateOrderStatus = async (orderId, newStatus) => {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) { console.error(error); showMessage(`Error updating status: ${error.message}`); return; }
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            showMessage('Order status updated!');
        };

        const deleteOrder = async (orderId) => {
            if (window.confirm('Are you sure you want to delete this order?')) {
                const { error } = await supabase.from('orders').delete().eq('id', orderId);
                if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
                setOrders(orders.filter(o => o.id !== orderId));
                showMessage('Order deleted.');
            }
        };

        const printReceipt = (order) => {
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Receipt - ${order.id}</title>
                        <style>
                            body { font-family: 'Courier New', Courier, monospace; padding: 10px; width: 57mm; margin: 0; font-size: 11px; line-height: 1.2; color: #000; }
                            .center { text-align: center; }
                            .logo { max-width: 30mm; max-height: 30mm; margin: 0 auto 5px; display: block; object-fit: contain; }
                            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
                            .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
                            .total { font-weight: bold; font-size: 13px; margin-top: 5px; }
                            @media print { 
                                body { width: 57mm; padding: 0; }
                                @page { margin: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="center">
                            ${storeSettings.logo_url ? `<img src="${storeSettings.logo_url}" class="logo">` : ''}
                            <div style="font-weight:bold; font-size: 14px; text-transform: uppercase;">${storeSettings.store_name}</div>
                            <div style="margin-top: 2px;">${storeSettings.address}</div>
                            <div>Tel: ${storeSettings.contact}</div>
                        </div>
                        <div class="divider"></div>
                        <div>
                            <strong>OR#:</strong> ${order.id.toString().slice(-6).toUpperCase()}<br>
                            <strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}<br>
                            <strong>Type:</strong> ${(order.order_type || 'N/A').toUpperCase()}<br>
                            <strong>Cust:</strong> ${order.customer_details?.name}
                        </div>
                        <div class="divider"></div>
                        <div style="font-weight:bold; margin-bottom: 5px;">ITEMS:</div>
                        ${(order.items || []).map(item => `<div class="item"><span>• ${item}</span></div>`).join('')}
                        <div class="divider"></div>
                        <div class="item total">
                            <span>TOTAL</span>
                            <span>₱${order.total_amount}</span>
                        </div>
                        <div class="divider"></div>
                        <div class="center" style="margin-top: 10px; font-style: italic;">
                            *** THANK YOU! ***<br>
                            Please come again.
                        </div>
                        <script>
                            window.onload = () => {
                                window.print();
                                setTimeout(() => window.close(), 500);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
            showMessage('Receipt generated! Check your print window.');
        };

        const copyToClipboard = async (text, successMsg = 'Copied to clipboard!') => {
            try {
                await navigator.clipboard.writeText(text);
                showMessage(successMsg);
            } catch (err) {
                console.error('Failed to copy:', err);
                showMessage('Failed to copy. Please try again.');
            }
        };

        const copyCustomerDetails = (order) => {
            let details = `Customer: ${order.customer_details?.name || 'N/A'}\n`;
            if (order.customer_details?.phone) details += `Phone: ${order.customer_details.phone}\n`;
            if (order.customer_details?.address) details += `Address: ${order.customer_details.address}\n`;
            if (order.customer_details?.landmark) details += `Landmark: ${order.customer_details.landmark}\n`;
            if (order.customer_details?.pickup_time) details += `Pickup Time: ${order.customer_details.pickup_time}\n`;
            copyToClipboard(details, 'Customer details copied!');
        };

        const copyOrderItems = (order) => {
            let itemsText = 'Order Items:\n';
            itemsText += (order.items || []).map((item, i) => `${i + 1}. ${item}`).join('\n');
            copyToClipboard(itemsText, 'Items list copied!');
        };

        const copyFullOrder = (order) => {
            let fullText = `ORDER SUMMARY\n`;
            fullText += `${'='.repeat(40)}\n\n`;
            fullText += `Order Type: ${(order.order_type || 'N/A').toUpperCase()}\n`;
            fullText += `Payment: ${order.payment_method || 'N/A'}\n`;
            fullText += `Date: ${new Date(order.timestamp).toLocaleString()}\n`;
            fullText += `Status: ${order.status || 'Pending'}\n\n`;

            fullText += `CUSTOMER DETAILS:\n`;
            fullText += `Name: ${order.customer_details?.name || 'N/A'}\n`;
            if (order.customer_details?.phone) fullText += `Phone: ${order.customer_details.phone}\n`;
            if (order.customer_details?.address) fullText += `Address: ${order.customer_details.address}\n`;
            if (order.customer_details?.landmark) fullText += `Landmark: ${order.customer_details.landmark}\n`;
            if (order.customer_details?.pickup_time) fullText += `Pickup Time: ${order.customer_details.pickup_time}\n`;

            fullText += `\nORDER ITEMS:\n`;
            fullText += (order.items || []).map((item, i) => `${i + 1}. ${item}`).join('\n');

            fullText += `\n\n${'='.repeat(40)}\n`;
            fullText += `TOTAL AMOUNT: ${order.total_amount}\n`;
            fullText += `${'='.repeat(40)}`;

            copyToClipboard(fullText, 'Full order copied!');
        };

        return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ margin: 0 }}>Orders Management</h2>
                </div>

                {/* Stats Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '15px', border: '1px solid #dbeafe' }}>
                        <div style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: 600 }}>Total Orders</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a' }}>{stats.totalOrders}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '15px', border: '1px solid #dcfce7' }}>
                        <div style={{ color: '#166534', fontSize: '0.9rem', fontWeight: 600 }}>Total Sales</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#14532d' }}>₱{stats.totalSales}</div>
                    </div>
                    <div style={{ background: '#fff7ed', padding: '20px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                        <div style={{ color: '#9a3412', fontSize: '0.9rem', fontWeight: 600 }}>Pending Orders</div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c2d12' }}>{stats.pendingOrders}</div>
                    </div>
                </div>

                {orders.length === 0 ? <p className="text-muted">No orders recorded yet.</p> : (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        {orders.slice().reverse().map((order, idx) => (
                            <div key={order.id || idx} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <span style={{ fontWeight: 800, color: 'var(--primary)', marginRight: '10px' }}>{(order.order_type || 'N/A').toUpperCase()}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(order.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select
                                                id={`status-${order.id}`}
                                                defaultValue={order.status || 'Pending'}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '0.85rem',
                                                    outline: 'none',
                                                    background: order.status === 'Completed' ? '#dcfce7' : order.status === 'Cancelled' ? '#fee2e2' : '#f8fafc',
                                                    color: order.status === 'Completed' ? '#166534' : order.status === 'Cancelled' ? '#991b1b' : 'inherit',
                                                    fontWeight: 600
                                                }}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Preparing">Preparing</option>
                                                <option value="Ready">Ready</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                            <button
                                                onClick={() => updateOrderStatus(order.id, document.getElementById(`status-${order.id}`).value)}
                                                className="btn-primary"
                                                style={{ padding: '6px 15px', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                            >
                                                <Save size={14} /> Save
                                            </button>
                                        </div>
                                        <button onClick={() => copyCustomerDetails(order)} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }} title="Copy Customer Details"><Copy size={18} /></button>
                                        <button onClick={() => copyOrderItems(order)} style={{ color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }} title="Copy Items List"><Copy size={18} /></button>
                                        <button onClick={() => copyFullOrder(order)} style={{ color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }} title="Copy Full Order"><Copy size={18} /></button>
                                        <button onClick={() => printReceipt(order)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Print Receipt"><Printer size={18} /></button>
                                        <button onClick={() => deleteOrder(order.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Delete Order"><Trash2 size={18} /></button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '10px', fontSize: '0.95rem' }}>
                                    <strong>{order.customer_details?.name}</strong> • {order.payment_method}
                                    {order.customer_details?.phone && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{order.customer_details.phone}</div>}
                                    {order.customer_details?.address && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Address: {order.customer_details.address}</div>}
                                </div>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', fontSize: '0.9rem' }}>
                                    {order.items.map((item, i) => (
                                        <div key={i} style={{ marginBottom: '4px' }}>• {item}</div>
                                    ))}
                                </div>
                                <div style={{ marginTop: '15px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>
                                    Total Amount: ₱{order.total_amount}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // --- COMPONENT: STORE GENERAL SETTINGS ---
    const StoreGeneralSettings = () => {
        const handleSave = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = {
                store_name: formData.get('storeName'),
                address: formData.get('address'),
                contact: formData.get('contact'),
                open_time: formData.get('openTime'),
                close_time: formData.get('closeTime'),
                manual_status: formData.get('manualStatus')
            };

            const payload = storeSettings.id ? { id: storeSettings.id, ...updateData } : updateData;
            const { data, error } = await supabase.from('store_settings').upsert(payload).select().single();
            if (error) {
                console.error(error);
                showMessage(`Error saving: ${error.message}`);
                return;
            }
            setStoreSettings(data);
            showMessage('General settings saved!');
        };

        const handleBannerUpload = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const newBanners = [...(storeSettings.banner_images || []), reader.result];
                    let error;
                    if (storeSettings.id) {
                        const res = await supabase.from('store_settings').update({ banner_images: newBanners }).eq('id', storeSettings.id);
                        error = res.error;
                    } else {
                        const res = await supabase.from('store_settings').upsert({ banner_images: newBanners }).select().single();
                        error = res.error;
                        if (res.data) setStoreSettings(res.data);
                    }
                    if (error) {
                        console.error(error);
                        showMessage(`Error saving banner: ${error.message}`);
                        return;
                    }
                    if (storeSettings.id) setStoreSettings({ ...storeSettings, banner_images: newBanners });
                    showMessage('Banner uploaded!');
                };
                reader.readAsDataURL(file);
            }
        };

        const removeBanner = async (index) => {
            const newBanners = (storeSettings.banner_images || []).filter((_, i) => i !== index);
            if (!storeSettings.id) {
                setStoreSettings({ ...storeSettings, banner_images: newBanners });
                return;
            }
            const { error } = await supabase.from('store_settings').update({ banner_images: newBanners }).eq('id', storeSettings.id);
            if (error) {
                console.error(error);
                showMessage(`Error removing: ${error.message}`);
                return;
            }
            setStoreSettings({ ...storeSettings, banner_images: newBanners });
            showMessage('Banner removed.');
        };

        const handleLogoUpload = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const logo_url = reader.result;
                    let error;
                    if (storeSettings.id) {
                        const res = await supabase.from('store_settings').update({ logo_url }).eq('id', storeSettings.id);
                        error = res.error;
                    } else {
                        const res = await supabase.from('store_settings').upsert({ logo_url }).select().single();
                        error = res.error;
                        if (res.data) setStoreSettings(res.data);
                    }
                    if (error) {
                        console.error(error);
                        showMessage(`Error saving logo: ${error.message}`);
                        return;
                    }
                    if (storeSettings.id) setStoreSettings({ ...storeSettings, logo_url });
                    showMessage('Logo updated!');
                };
                reader.readAsDataURL(file);
            }
        };

        const removeLogo = async () => {
            if (!storeSettings.id) {
                setStoreSettings({ ...storeSettings, logo_url: '' });
                return;
            }
            const { error } = await supabase.from('store_settings').update({ logo_url: '' }).eq('id', storeSettings.id);
            if (error) {
                console.error(error);
                showMessage(`Error removing logo: ${error.message}`);
                return;
            }
            setStoreSettings({ ...storeSettings, logo_url: '' });
            showMessage('Logo removed.');
        };

        return (
            <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
                <h2 style={{ marginBottom: '30px' }}>Store Settings</h2>

                <form onSubmit={handleSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Clock size={20} /> Store Availability
                            </h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Manual Status Toggle</label>
                                    <select name="manualStatus" defaultValue={storeSettings.manual_status} style={inputStyle}>
                                        <option value="auto">Auto (Based on Hours)</option>
                                        <option value="open">Always Open</option>
                                        <option value="closed">Always Closed</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Opening Time</label>
                                        <input name="openTime" type="time" defaultValue={storeSettings.open_time} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Closing Time</label>
                                        <input name="closeTime" type="time" defaultValue={storeSettings.close_time} style={inputStyle} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={20} /> Store Information
                            </h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Store Name</label><input name="storeName" defaultValue={storeSettings.store_name} style={inputStyle} /></div>
                                <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Address</label><input name="address" defaultValue={storeSettings.address} style={inputStyle} /></div>
                                <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Contact Number</label><input name="contact" defaultValue={storeSettings.contact} style={inputStyle} /></div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Camera size={20} /> Store Logo
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {storeSettings.logo_url && (
                                    <div style={{ position: 'relative', width: '120px' }}>
                                        <img src={storeSettings.logo_url} style={{ width: '120px', height: '120px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '10px' }} />
                                        <button
                                            type="button"
                                            onClick={removeLogo}
                                            style={{
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '-10px',
                                                background: 'rgba(239, 68, 68, 0.9)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '28px',
                                                height: '28px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleLogoUpload} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ImageIcon size={20} /> Hero Slideshow Banners
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                {(storeSettings.banner_images || []).map((url, i) => (
                                    <div key={i} style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow)' }}>
                                        <img src={url} style={{ width: '100%', height: '140px', objectFit: 'cover' }} alt={`Banner ${i}`} />
                                        <button
                                            type="button"
                                            onClick={() => removeBanner(i)}
                                            style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                background: 'rgba(239, 68, 68, 0.9)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '32px',
                                                height: '32px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <X size={18} />
                                        </button>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '5px 10px', fontSize: '0.7rem', textAlign: 'center' }}>
                                            Banner {i + 1}
                                        </div>
                                    </div>
                                ))}
                                <label style={{
                                    height: '140px',
                                    border: '3px dashed var(--primary)',
                                    borderRadius: '16px',
                                    background: '#fff5f5',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    transition: 'all 0.3s',
                                    fontWeight: 700
                                }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = 'var(--primary-dark)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                >
                                    <Plus size={32} />
                                    <span style={{ fontSize: '0.9rem' }}>Add New Banner</span>
                                    <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: '40px', width: '100%', padding: '15px' }}>Save All Settings</button>
                </form>
            </div>
        );
    };


    // --- MAIN RENDER ---
    return (
        <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter' }}>
            {/* Sidebar */}
            <aside style={{ width: '260px', background: 'var(--primary)', color: 'white', padding: '30px 20px', position: 'fixed', height: '100vh', boxShadow: '5px 0 15px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '50px', paddingLeft: '10px' }}>
                    <Package size={28} color="var(--secondary)" />
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>Chilled & Frozen Hub</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <SidebarItem icon={<List size={20} />} label="Inventory & Products" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
                    <SidebarItem icon={<Tag size={20} />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
                    <SidebarItem icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                    <SidebarItem icon={<Settings size={20} />} label="Order Types" active={activeTab === 'orderTypes'} onClick={() => setActiveTab('orderTypes')} />
                    <SidebarItem icon={<CreditCard size={20} />} label="Payment Methods" active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} />
                    <SidebarItem icon={<LayoutDashboard size={20} />} label="General Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'white',
                        padding: '12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        position: 'absolute',
                        bottom: '30px',
                        left: '20px',
                        width: 'calc(100% - 40px)'
                    }}
                >
                    <LogOut size={20} /> Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: '260px', flex: 1, padding: '40px', maxWidth: '1200px' }}>
                {message && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: message.toLowerCase().includes('error') ? '#ef4444' : '#10b981',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        zIndex: 5000,
                        fontWeight: 700,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'slideDown 0.3s ease-out forwards'
                    }}>
                        {message.toLowerCase().includes('error') ? <X size={18} /> : <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '2px' }}><Plus size={16} style={{ transform: 'rotate(45deg)' }} /></div>}
                        {message}
                        <style>{`
                            @keyframes slideDown {
                                0% { transform: translate(-50%, -100%); opacity: 0; }
                                80% { transform: translate(-50%, 10px); }
                                100% { transform: translate(-50%, 0); opacity: 1; }
                            }
                        `}</style>
                    </div>
                )}

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

const SidebarItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
        border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
        textAlign: 'left', width: '100%', transition: 'all 0.2s'
    }}>
        {icon} {label}
    </button>
);

const SectionLabel = ({ title, onAdd }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #eee' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</label>
        <button type="button" onClick={onAdd} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>+ Add</button>
    </div>
);

const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' };

export default AdminDashboard;
