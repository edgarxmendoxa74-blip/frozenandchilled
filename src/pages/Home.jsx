import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Plus,
    Minus,
    X,
    MessageSquare,
    MapPin,
    Phone,
    Info,
    Facebook,
    Star,
    Coffee,
    UtensilsCrossed,
    Clock,
    User,
    Trash2,
    Copy,
    CreditCard,
    Banknote,
    ChevronLeft,
    ChevronRight,
    Truck,
    CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { categories as initialCategories, menuItems } from '../data/MenuData';
import { supabase } from '../supabaseClient';
import { recordStoreVisit, markVisitOrdered } from '../visitTracking';

// Delivery locations with charge from store
const DELIVERY_LOCATIONS = [
    { name: 'Poblacion', charge: 35 },
    { name: 'San Antonio', charge: 35 },
    { name: 'Mangorocoro', charge: 35 },
    { name: 'Progreso', charge: 35 },
    { name: 'Pili', charge: 35 },
    { name: 'Lanjagan', charge: 35 },
    { name: 'Taguhangin', charge: 35 },
    { name: 'Bugtong Bukid', charge: 35 },
    { name: 'Brgy. Rojas', charge: 35 },
    { name: 'Pinantan Elizalde', charge: 35 },
    { name: 'Puente Bunglas', charge: 35 },
    { name: 'Bat-os', charge: 35 },
    { name: 'Malayu-an', charge: 40 },
    { name: 'Barrido', charge: 40 },
    { name: 'Culasi', charge: 45 },
    { name: 'Luca', charge: 45 },
    { name: 'Bay-ang', charge: 50 }
];

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

const Home = () => {
    const [cart, setCart] = useState([]);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('oysters'); // Will update after load
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [deliveryLocations, setDeliveryLocations] = useState(() => {
        const saved = localStorage.getItem('deliveryLocations');
        if (saved) {
            try { return JSON.parse(saved); } catch { /* ignore parse error */ }
        }
        return DEFAULT_DELIVERY_LOCATIONS;
    });

    const [paymentSettings, setPaymentSettings] = useState([]);
    const [orderTypes, setOrderTypes] = useState([
        { id: 'pickup', name: 'Pickup' },
        { id: 'delivery', name: 'Delivery' },
        { id: 'lalamove-delivery', name: 'Lalamove Delivery' }
    ]);
    const [storeSettings, setStoreSettings] = useState({
        manual_status: 'auto',
        open_time: '08:00',
        close_time: '19:00',
        store_name: 'Chilled and Frozen Hub',
        address: 'Caltex Road, Banaba South, Batangas City',
        contact: '09947246294 / 09949314800',
        logo_url: '/chilled-frozen-logo.png',
        banner_images: [
            'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80'
        ]
    });

    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Store status logic - Store is always open for orders
    const isStoreOpen = () => true;

    const isOpen = isStoreOpen();

    // Helper to deduplicate array of objects by id or name
    const deduplicateByKey = (arr) => {
        if (!Array.isArray(arr)) return [];
        const unique = [];
        const seen = new Set();
        for (const item of arr) {
            const key = (item.name || item.id || '').toLowerCase().trim();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(item);
            }
        }
        return unique;
    };

    const normalizeItem = (item) => {
        if (!item) return item;
        return {
            ...item,
            category_id: item.category_id || item.categoryId || '',
            low_stock_threshold: item.low_stock_threshold ?? item.lowStockThreshold ?? 5,
            min_order_note: item.min_order_note || item.minOrderNote || '',
        };
    };

    // Count this store visit (once per browser per day) for Sales Analytics
    useEffect(() => {
        recordStoreVisit();
    }, []);

    // Load data from Supabase (localStorage is used only as an offline fallback)
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1 & 2. Categories and menu items.
                // The database is the source of truth. The browser copy is only an offline fallback:
                // merging it in let stale local categories/items override database ids and hide products.
                const readCache = (key) => {
                    try {
                        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch { return []; }
                };
                const dedupeByName = (list) => {
                    const seen = new Set();
                    return list.filter(x => {
                        const key = (x.name || '').trim().toLowerCase();
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                };

                const [{ data: catData, error: catError }, { data: itemData, error: itemError }] = await Promise.all([
                    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                    supabase.from('menu_items').select('*').order('sort_order', { ascending: true })
                ]);

                let finalCats;
                if (!catError && catData && catData.length > 0) {
                    finalCats = dedupeByName(catData);
                    localStorage.setItem('categories', JSON.stringify(finalCats));
                } else {
                    const cachedCats = readCache('categories');
                    finalCats = cachedCats.length > 0 ? cachedCats : initialCategories;
                }
                setCategories(finalCats);
                if (finalCats.length > 0) setActiveCategory(prev => prev || finalCats[0].id);

                let combinedItems;
                if (!itemError && itemData && itemData.length > 0) {
                    combinedItems = itemData.map(normalizeItem);
                    localStorage.setItem('menuItems', JSON.stringify(combinedItems));
                } else {
                    const cachedItems = readCache('menuItems');
                    combinedItems = (cachedItems.length > 0 ? cachedItems : menuItems).map(normalizeItem);
                }
                setItems(combinedItems);

                // 3. Fetch Payment Settings (deduplicated & merged with local storage)
                const savedPaymentsRaw = localStorage.getItem('paymentSettings');
                let savedPaymentsList = [];
                if (savedPaymentsRaw) {
                    try {
                        const parsed = JSON.parse(savedPaymentsRaw);
                        savedPaymentsList = Array.isArray(parsed) ? parsed : [];
                    } catch { /* ignore */ }
                }

                const { data: payData } = await supabase.from('payment_settings').select('*').eq('is_active', true);

                let combinedPayments = [];
                if (payData && payData.length > 0) {
                    combinedPayments = payData.map(p => {
                        const localMatch = savedPaymentsList.find(s =>
                            (s.id && s.id === p.id) ||
                            (s.name && s.name.toLowerCase().trim() === (p.name || '').toLowerCase().trim())
                        );
                        return {
                            ...p,
                            qr_url: p.qr_url || localMatch?.qr_url || null,
                            account_number: p.account_number || localMatch?.account_number || localMatch?.accountNumber || 'N/A',
                            account_name: p.account_name || localMatch?.account_name || localMatch?.accountName || 'N/A',
                            instructions: p.instructions || localMatch?.instructions || ''
                        };
                    });

                    for (const localP of savedPaymentsList) {
                        if (localP.is_active !== false) {
                            const existsInSupabase = combinedPayments.some(cp =>
                                (cp.id && cp.id === localP.id) ||
                                (cp.name && cp.name.toLowerCase().trim() === (localP.name || '').toLowerCase().trim())
                            );
                            if (!existsInSupabase) {
                                combinedPayments.push(localP);
                            }
                        }
                    }
                } else if (savedPaymentsList.length > 0) {
                    combinedPayments = savedPaymentsList.filter(p => p.is_active !== false);
                } else {
                    combinedPayments = [
                        { id: 'gcash', name: 'GCash', account_number: '09947246294', account_name: 'Chilled and Frozen Hub', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GCash%3A%2009947246294%20(Chilled%20and%20Frozen%20Hub)', is_active: true },
                        { id: 'cod', name: 'Cash on Delivery', account_number: 'N/A', account_name: 'Cash Payment', is_active: true },
                        { id: 'maya', name: 'PayMaya', account_number: '09947246294', account_name: 'Chilled and Frozen Hub', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PayMaya%3A%2009947246294%20(Chilled%20and%20Frozen%20Hub)', is_active: true }
                    ];
                }

                setPaymentSettings(deduplicateByKey(combinedPayments));

                // 3b. Fetch Delivery Locations
                const savedLocsRaw = localStorage.getItem('deliveryLocations');
                let savedLocsList = savedLocsRaw ? JSON.parse(savedLocsRaw) : [];

                const { data: locData } = await supabase.from('delivery_locations').select('*');
                let combinedLocs = [];
                if (locData && locData.length > 0) {
                    combinedLocs = [...locData];
                    for (const savedLoc of savedLocsList) {
                        const idx = combinedLocs.findIndex(l => (l.id && l.id === savedLoc.id) || (l.name && l.name.toLowerCase().trim() === (savedLoc.name || '').toLowerCase().trim()));
                        if (idx !== -1) {
                            combinedLocs[idx] = { ...combinedLocs[idx], ...savedLoc };
                        } else {
                            combinedLocs.push(savedLoc);
                        }
                    }
                } else {
                    combinedLocs = savedLocsList.length > 0 ? savedLocsList : DEFAULT_DELIVERY_LOCATIONS;
                }
                setDeliveryLocations(combinedLocs);

                // 4. Fetch Order Types
                const { data: typeData } = await supabase.from('order_types').select('*').eq('is_active', true);
                if (typeData && typeData.length > 0) {
                    const merged = deduplicateByKey([...typeData]);
                    setOrderTypes(merged);
                } else {
                    const savedOrderTypes = localStorage.getItem('orderTypes');
                    if (savedOrderTypes) {
                        const parsed = deduplicateByKey([...JSON.parse(savedOrderTypes)]);
                        if (parsed.length > 0) setOrderTypes(parsed);
                    }
                }

                // 5. Fetch Store Settings
                const savedStoreRaw = localStorage.getItem('storeSettings');
                const savedStore = savedStoreRaw ? JSON.parse(savedStoreRaw) : null;

                const { data: storeData } = await supabase.from('store_settings').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
                if (storeData) {
                    // Database is the source of truth; localStorage is only an offline fallback
                    // (it can hold stale data from other projects served on the same localhost port).
                    setStoreSettings(prev => ({
                        ...prev,
                        ...storeData,
                        banner_images: storeData.banner_images?.length > 0 ? storeData.banner_images : prev.banner_images
                    }));
                    localStorage.setItem('storeSettings', JSON.stringify(storeData));
                } else if (savedStore) {
                    setStoreSettings(savedStore);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const handleReload = () => {
            fetchData();
        };

        window.addEventListener('storage', handleReload);
        window.addEventListener('store_data_updated', handleReload);
        window.addEventListener('focus', handleReload);

        return () => {
            window.removeEventListener('storage', handleReload);
            window.removeEventListener('store_data_updated', handleReload);
            window.removeEventListener('focus', handleReload);
        };
    }, []);

    // Slideshow functions
    const nextBanner = () => {
        const count = (storeSettings.banner_images || []).length;
        if (count > 0) setCurrentBannerIndex(prev => (prev + 1) % count);
    };

    const prevBanner = () => {
        const count = (storeSettings.banner_images || []).length;
        if (count > 0) setCurrentBannerIndex(prev => (prev - 1 + count) % count);
    };

    useEffect(() => {
        const bannerCount = (storeSettings.banner_images || []).length;
        if (bannerCount === 0) return;
        const timer = setInterval(() => {
            setCurrentBannerIndex(prev => (prev + 1) % bannerCount);
        }, 5000);
        return () => clearInterval(timer);
    }, [storeSettings.banner_images]);

    // Selection state for products with options
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectionOptions, setSelectionOptions] = useState({
        box: null,
        variation: null,
        flavors: [],
        addons: []
    });

    // Helper: Get available box/weight stocks for any menu item connected to live inventory
    const getItemBoxes = (item) => {
        if (!item) return [];
        const totalStock = parseFloat(item.stock) || 0;
        const isOutOfStock = Boolean(item.out_of_stock || totalStock <= 0);

        if (Array.isArray(item.boxes) && item.boxes.length > 0) {
            return item.boxes.map(b => ({
                ...b,
                disabled: isOutOfStock || Boolean(b.disabled || b.ordered) || (b.stockQty !== undefined && Number(b.stockQty) < 1)
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

    const getItemAvailableStock = (item) => {
        if (!item) return 0;
        if (item.out_of_stock) return 0;
        
        if (Array.isArray(item.boxes) && item.boxes.length > 0) {
            const availBoxes = item.boxes.filter(b => !b.disabled && !b.ordered && (b.stockQty === undefined || Number(b.stockQty) > 0));
            const totalW = availBoxes.reduce((sum, b) => sum + (parseFloat(b.weight) || 0) * (b.stockQty !== undefined ? Number(b.stockQty) : 1), 0);
            return Number(totalW.toFixed(3));
        }
        return Number(item.stock || 0);
    };

    // Order type and payment state
    const [orderType, setOrderType] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [orderCopied, setOrderCopied] = useState(false);
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        phone: '',
        table_number: '',
        address: '',
        landmark: '',
        pickup_time: '',
        delivery_location: '',
        lalamove_note: ''
    });

    const openProductSelection = (item) => {
        const availableBoxes = getItemBoxes(item);
        const firstBox = availableBoxes.find(b => !b.disabled && !b.ordered) || null;
        const firstVariation = (item.variations || []).find(v => !v.disabled && !v.ordered) || null;

        let initialFlavor = [];
        if (item.flavors && item.flavors.length > 0) {
            const first = item.flavors[0];
            const name = typeof first === 'string' ? first : (first.disabled ? null : first.name);
            if (!name) {
                const valid = item.flavors.find(f => typeof f === 'string' || !f.disabled);
                if (valid) {
                    initialFlavor = [typeof valid === 'string' ? valid : valid.name];
                }
            } else {
                initialFlavor = [name];
            }
        }

        setSelectedProduct(item);
        setSelectionOptions({
            box: firstBox,
            variation: firstVariation,
            flavors: initialFlavor,
            addons: []
        });
    };

    const addToCart = (item, options) => {
        const boxKey = options.box ? (options.box.id || options.box.name) : '';
        const cartItemId = `${item.id}-${boxKey}-${options.variation?.name || ''}-${(options.flavors || []).sort().join(',')}-${(options.addons || []).map(a => a.name).join(',')}`;
        const existing = cart.find(i => i.cartItemId === cartItemId);

        const itemPricePerKg = Number(item.promo_price || item.price);
        let basePrice;

        if (options.box) {
            // Use box's own price if set in inventory, otherwise compute from box's pricePerKg or item price
            if (options.box.price !== undefined && options.box.price !== null && options.box.price !== '') {
                basePrice = Number(options.box.price);
            } else {
                const boxPKg = (options.box.pricePerKg !== undefined && options.box.pricePerKg !== '') ? Number(options.box.pricePerKg) : itemPricePerKg;
                basePrice = Number((options.box.weight * boxPKg).toFixed(2));
            }
        } else {
            const variationPrice = options.variation ? Number(options.variation.price) : 0;
            if (item.name?.toLowerCase().includes('pork ribs')) {
                basePrice = itemPricePerKg + variationPrice;
            } else {
                basePrice = variationPrice > 0 ? variationPrice : itemPricePerKg;
            }
        }

        const addonsPrice = (options.addons || []).reduce((sum, a) => sum + Number(a.price), 0);
        const finalPrice = Number((basePrice + addonsPrice).toFixed(2));

        if (existing) {
            setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, {
                ...item,
                cartItemId,
                selectedBox: options.box,
                pricePerKg: itemPricePerKg,
                selectedVariation: options.variation,
                selectedFlavors: options.flavors,
                selectedAddons: options.addons,
                finalPrice,
                quantity: 1
            }]);
        }
        setSelectedProduct(null);
        // Go straight to checkout: order type → payment method → send via Messenger
        setIsCartOpen(false);
        setOrderCopied(false);
        setIsCheckoutOpen(true);
    };

    const addOneToCart = (cartItemId) => {
        setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i));
    };

    const removeFromCart = (cartItemId) => {
        setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity > 1 ? i.quantity - 1 : i.quantity } : i));
    };

    const deleteFromCart = (cartItemId) => {
        setCart(cart.filter(i => i.cartItemId !== cartItemId));
    };

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate delivery charge based on selected location
    const getDeliveryCharge = () => {
        const selectedLocation = deliveryLocations.find(loc => loc.name === customerDetails.delivery_location);
        return selectedLocation ? selectedLocation.charge : 0;
    };
    const deliveryCharge = orderType === 'delivery' ? getDeliveryCharge() : 0;
    const cartTotal = cartSubtotal + deliveryCharge;

    // Cash on Delivery is not offered for Lalamove orders.
    const isCashMethod = (name) => {
        if (!name) return false;
        const lower = name.toLowerCase().trim();
        if (lower.includes('gcash')) return false;
        return lower.includes('cash') || lower.includes('cod');
    };
    const isLalamoveOrder = orderType.toLowerCase().includes('lalamove');
    const selectedPaymentIsCash = isCashMethod(paymentSettings.find(m => m.id === paymentMethod)?.name);

    useEffect(() => {
        if (isLalamoveOrder && selectedPaymentIsCash) setPaymentMethod('');
    }, [isLalamoveOrder, selectedPaymentIsCash]);

    const copyOrderDetails = async () => {
        const itemDetails = cart.map(item => {
            let d = `${item.name} (x${item.quantity})`;
            if (item.selectedBox) {
                d += ` - ${item.selectedBox.name} (${item.selectedBox.weight} kg @ ₱${item.pricePerKg}/kg = ₱${item.finalPrice.toLocaleString()})`;
            } else if (item.selectedVariation) {
                d += ` - ${item.selectedVariation.name}`;
            }
            if (item.selectedFlavors && item.selectedFlavors.length > 0) d += ` [${item.selectedFlavors.join(', ')}]`;
            if (item.selectedAddons && item.selectedAddons.length > 0) d += ` + ${item.selectedAddons.map(a => a.name).join(', ')}`;
            return d;
        });

        let customerInfoStr = `Name: ${customerDetails.name}`;

        if (orderType === 'pickup') customerInfoStr += `\nPhone: ${customerDetails.phone}\nPickup Time: ${customerDetails.pickup_time}`;
        if (orderType === 'delivery') customerInfoStr += `\nPhone: ${customerDetails.phone}\nDelivery Location: ${customerDetails.delivery_location}\nAddress: ${customerDetails.address}\nLandmark: ${customerDetails.landmark}`;
        if (orderType.includes('lalamove')) customerInfoStr += `\nPhone: ${customerDetails.phone}\nAddress: ${customerDetails.address}${customerDetails.landmark ? `\nLandmark: ${customerDetails.landmark}` : ''}${customerDetails.lalamove_note ? `\nNote: ${customerDetails.lalamove_note}` : ''}`;

        let totalBreakdown = `Subtotal: ₱${cartSubtotal}`;
        if (orderType === 'delivery' && deliveryCharge > 0) {
            totalBreakdown += `\nDelivery Charge (${customerDetails.delivery_location}): ₱${deliveryCharge}`;
        }
        totalBreakdown += `\nTOTAL AMOUNT: ₱${cartTotal}`;

        const selectedPaymentName = paymentSettings.find(m => m.id === paymentMethod)?.name || paymentMethod;
        const orderDetailsText = `ORDER SUMMARY\n${'='.repeat(40)}\n\nOrder Type: ${orderType.toUpperCase()}\nPayment Method: ${selectedPaymentName}\n\nCustomer Details:\n${customerInfoStr}\n\nItem Details:\n${itemDetails.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n\n${'='.repeat(40)}\n${totalBreakdown}\n${'='.repeat(40)}`;

        const copied = await copyToClipboard(orderDetailsText);
        if (copied) {
            setOrderCopied(true);
            alert('✓ Order details copied to clipboard!');
        } else {
            alert('Failed to copy. Please try again.');
        }
    };

    // Helper: Reliably copy text to clipboard (works on iOS & Android)
    const copyToClipboard = async (text) => {
        // Method 1: Modern Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.warn('Clipboard API failed, trying fallback:', err);
            }
        }

        // Method 2: Fallback using textarea (works on most mobile browsers)
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);

            // iOS needs special selection handling
            const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isIOS) {
                const range = document.createRange();
                range.selectNodeContents(textarea);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                textarea.setSelectionRange(0, 999999);
            } else {
                textarea.select();
            }

            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err) {
            console.error('Fallback copy failed:', err);
            return false;
        }
    };

    const handlePlaceOrder = async () => {
        if (!orderType) {
            alert('Please select an order type (Pickup, Delivery, or Lalamove Delivery).');
            return;
        }

        // Validate details...
        const { name, phone, address, pickup_time, delivery_location } = customerDetails;

        if (orderType === 'pickup' && (!name || !phone || !pickup_time)) { alert('Please provide Name, Phone Number, and Pickup Time.'); return; }
        if (orderType === 'delivery' && (!name || !phone || !delivery_location || !address)) { alert('Please provide Name, Phone Number, Delivery Location, and Address.'); return; }
        if (orderType.includes('lalamove') && (!name || !phone || !address)) { alert('Please provide Name, Phone Number, and Complete Address for Lalamove Delivery.'); return; }

        if (!paymentMethod) { alert('Please select a payment method.'); return; }
        if (isLalamoveOrder && selectedPaymentIsCash) { alert('Cash on Delivery is not available for Lalamove Delivery. Please choose GCash or PayMaya.'); return; }

        // --- SAVE ORDER TO SUPABASE ---
        const itemDetails = cart.map(item => {
            let d = `${item.name} (x${item.quantity})`;
            if (item.selectedBox) {
                d += ` - ${item.selectedBox.name} (${item.selectedBox.weight} kg @ ₱${item.pricePerKg}/kg = ₱${item.finalPrice.toLocaleString()})`;
            } else if (item.selectedVariation) {
                d += ` - ${item.selectedVariation.name}`;
            }
            if (item.selectedFlavors && item.selectedFlavors.length > 0) d += ` [${item.selectedFlavors.join(', ')}]`;
            if (item.selectedAddons && item.selectedAddons.length > 0) d += ` + ${item.selectedAddons.map(a => a.name).join(', ')}`;
            return d;
        });

        const newOrder = {
            order_type: orderType,
            payment_method: paymentSettings.find(m => m.id === paymentMethod)?.name || paymentMethod,
            customer_details: customerDetails,
            items: itemDetails,
            total_amount: cartTotal,
            status: 'Pending'
        };

        // Async insert (not waiting here to avoid blocking Messenger redirect, but could wait)
        supabase.from('orders').insert([newOrder]).then(({ error }) => {
            if (error) console.error('Error saving order to Supabase:', error);
        });
        markVisitOrdered();

        // --- DEDUCT STOCK & DISABLE ORDERED BOXES/VARIATIONS ---
        try {
            const updatedItemsList = [...items];
            for (const cartItem of cart) {
                const targetIdx = updatedItemsList.findIndex(i => (i.id && i.id === cartItem.id) || (i.name && i.name.toLowerCase().trim() === (cartItem.name || '').toLowerCase().trim()));
                if (targetIdx !== -1) {
                    const currentItem = updatedItemsList[targetIdx];
                    const orderedWeight = cartItem.selectedBox
                        ? Number(cartItem.selectedBox.weight)
                        : (cartItem.selectedVariation?.weight ? Number(cartItem.selectedVariation.weight) : (cartItem.quantity || 1));

                    const currentStockNum = Number(currentItem.stock || 0);
                    const newStock = Math.max(0, Number((currentStockNum - orderedWeight).toFixed(3)));

                    let updatedBoxes = currentItem.boxes;
                    if (!Array.isArray(updatedBoxes) || updatedBoxes.length === 0) {
                        updatedBoxes = getItemBoxes(currentItem);
                    }

                    if (cartItem.selectedBox && Array.isArray(updatedBoxes)) {
                        updatedBoxes = updatedBoxes.map(b => {
                            if ((b.id && b.id === cartItem.selectedBox.id) || (b.name && b.name.toLowerCase().trim() === (cartItem.selectedBox.name || '').toLowerCase().trim())) {
                                const boxStock = b.stockQty !== undefined ? Number(b.stockQty) : 1;
                                const orderedQty = Number(cartItem.quantity) || 1;
                                const newBoxStock = Math.max(0, boxStock - orderedQty);
                                if (newBoxStock <= 0) {
                                    return { ...b, stockQty: 0, disabled: true, ordered: true };
                                }
                                return { ...b, stockQty: newBoxStock };
                            }
                            return b;
                        });
                    }

                    let updatedVariations = currentItem.variations || [];
                    if (cartItem.selectedVariation && Array.isArray(updatedVariations)) {
                        updatedVariations = updatedVariations.map(v => {
                            if ((v.id && v.id === cartItem.selectedVariation.id) || (v.name && v.name.toLowerCase().trim() === (cartItem.selectedVariation.name || '').toLowerCase().trim())) {
                                return { ...v, disabled: true, ordered: true };
                            }
                            return v;
                        });
                    }

                    const hasAvailableBoxes = updatedBoxes.some(b => !b.disabled && !b.ordered);
                    const isNowOutOfStock = newStock <= 0 || (updatedBoxes.length > 0 && !hasAvailableBoxes);

                    const updatedObj = {
                        ...currentItem,
                        stock: newStock,
                        boxes: updatedBoxes,
                        variations: updatedVariations,
                        out_of_stock: isNowOutOfStock
                    };

                    updatedItemsList[targetIdx] = updatedObj;

                    // Update in Supabase database
                    if (currentItem.id) {
                        supabase.from('menu_items').update({
                            stock: newStock,
                            boxes: updatedBoxes,
                            variations: updatedVariations,
                            out_of_stock: isNowOutOfStock
                        }).eq('id', currentItem.id).then(({ error }) => {
                            if (error) console.warn('Notice updating stock/boxes in Supabase:', error.message);
                        });
                    }
                }
            }

            setItems(updatedItemsList);
            localStorage.setItem('menuItems', JSON.stringify(updatedItemsList));
            window.dispatchEvent(new Event('store_data_updated'));
        } catch (err) {
            console.error('Error auto-updating inventory stocks/boxes:', err);
        }

        // --- PREPARE MESSENGER MSG ---
        const orderDetailsStr = itemDetails.join('\n');
        let customerInfoStr = `Name: ${customerDetails.name}`;

        if (orderType === 'pickup') customerInfoStr += `\nPhone: ${customerDetails.phone}\nPickup Time: ${customerDetails.pickup_time}`;
        if (orderType === 'delivery') customerInfoStr += `\nPhone: ${customerDetails.phone}\nDelivery Location: ${customerDetails.delivery_location}\nAddress: ${customerDetails.address}\nLandmark: ${customerDetails.landmark}`;
        if (orderType.includes('lalamove')) customerInfoStr += `\nPhone: ${customerDetails.phone}\nAddress: ${customerDetails.address}${customerDetails.landmark ? `\nLandmark: ${customerDetails.landmark}` : ''}${customerDetails.lalamove_note ? `\nNote: ${customerDetails.lalamove_note}` : ''}`;

        let amountBreakdown = `Subtotal: ₱${cartSubtotal}`;
        if (orderType === 'delivery' && deliveryCharge > 0) {
            amountBreakdown += `\nDelivery Charge: ₱${deliveryCharge}`;
        }
        amountBreakdown += `\nTOTAL: ₱${cartTotal}`;

        const message = `Hello! I'd like to place an order:

Order Type: ${orderType.toUpperCase()}
Payment Method: ${paymentSettings.find(m => m.id === paymentMethod)?.name || paymentMethod}

Customer Details:
${customerInfoStr}

Item Details:
${orderDetailsStr}

${amountBreakdown}

Thank you!`;

        // Facebook Page ID or Username for Messenger
        const pageId = 'chilledandfrozenhubmeatshop';

        // Step 1: Copy order details to clipboard FIRST (before opening Messenger)
        const copied = await copyToClipboard(message);

        // Step 2: Close checkout modal
        setIsCheckoutOpen(false);

        // Step 3: Show instruction to user
        const lalamoveReminder = orderType === 'lalamove delivery'
            ? '\n\n🛵 Lalamove Delivery reminder: After sending your order, the store will confirm your order first. Once confirmed, they will let you know the Lalamove delivery charge before you proceed with booking.'
            : '';
        if (copied) {
            alert(`✅ Your order receipt is ready!\n\nMessenger will open now with your receipt already typed in — just tap SEND.\n\nIf the message box is empty, long-press and PASTE (your receipt is copied).${lalamoveReminder}`);
        } else {
            alert(`✅ Your order receipt is ready!\n\nMessenger will open now with your receipt already typed in — just tap SEND.${lalamoveReminder}`);
        }

        // Step 4: Open Messenger using the most reliable method for each platform
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // m.me opens the Messenger app on mobile or messenger.com on desktop.
        // "text" pre-fills the receipt in the message box so the customer only taps Send.
        // It is not an officially documented parameter, so the clipboard copy above stays as a backup.
        const messengerUrl = `https://m.me/${pageId}?text=${encodeURIComponent(message)}`;

        if (isMobile) {
            // On mobile, use window.location.href for m.me
            // This lets the OS handle the deep link naturally:
            //   - If Messenger app is installed → opens the app
            //   - If not installed → opens in browser
            window.location.href = messengerUrl;
        } else {
            // Desktop: open in new tab
            window.open(messengerUrl, '_blank');
        }

        // Clear cart after successful order
        setTimeout(() => {
            setCart([]);
            setCustomerDetails({ name: '', phone: '', table_number: '', address: '', landmark: '', pickup_time: '', delivery_location: '', lalamove_note: '' });
            setOrderType('');
            setPaymentMethod('');
        }, 1000);
    };

    const _formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minutes} ${ampm}`;
    };

    return (
        <div className="page-wrapper">
            <header className="app-header">
                <div className="container header-container">
                    <Link to="/" className="brand">
                        <img src="/logo.png" alt="Chilled and Frozen Hub" style={{ height: '54px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </Link>
                    <div className="header-nav">
                        <button className="btn-accent" onClick={() => setIsCartOpen(true)}>
                            <ShoppingBag size={16} />
                            <span>Cart ({cartCount})</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Enhanced Category Navigation Bar - Sticky below header */}
            <div className="category-slider" style={{ 
                background: 'linear-gradient(135deg, rgba(30, 139, 0, 0.08) 0%, rgba(255, 226, 0, 0.06) 100%)',
                borderBottom: '2px solid rgba(30, 139, 0, 0.15)',
                padding: '12px 0',
                position: 'sticky',
                top: '70px',
                zIndex: 900,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
            }}>
                <div className="category-container">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`cat-btn${activeCategory === cat.id ? ' active' : ''}`}
                            onClick={() => {
                                setActiveCategory(cat.id);
                                const el = document.getElementById(`cat-${cat.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            style={{
                                background: activeCategory === cat.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.8)',
                                color: activeCategory === cat.id ? 'white' : 'var(--primary)',
                                border: activeCategory === cat.id ? '2px solid var(--primary)' : '2px solid rgba(30, 139, 0, 0.2)',
                                fontWeight: '700',
                                transition: 'all 0.3s ease',
                                boxShadow: activeCategory === cat.id ? '0 4px 12px rgba(30, 139, 0, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hero Section */}
            <section className="hero-section" style={{ overflow: 'hidden', background: '#F4F9F4' }}>
                <div className="container hero-split">
                    <div className="hero-content animate-fade-up">
                        <span style={{
                            background: 'var(--secondary)',
                            color: 'var(--primary-dark)',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'inline-block',
                            marginBottom: '15px'
                        }}>
                            TRADER • SUPPLIER • DISTRIBUTOR
                        </span>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--accent)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '10px', lineHeight: 1.1 }}>
                            CHILLED AND <span style={{ color: 'var(--primary)' }}>FROZEN</span> HUB
                        </h1>
                        <p style={{
                            color: 'var(--primary-dark)',
                            fontWeight: 700,
                            marginBottom: '20px'
                        }}>
                            High-End Beef • Wholesale Chicken • Pork • Seafood • Rice
                        </p>
                        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '30px' }}>
                            📍 Caltex Road, Banaba South, Batangas City
                        </p>
                    </div>
                    <div className="hero-image-container">
                        {(storeSettings.banner_images || []).map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt={`Hero Banner ${i + 1}`}
                                className="hero-image"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                style={{
                                    position: i === 0 ? 'relative' : 'absolute',
                                    top: 0,
                                    left: 0,
                                    opacity: currentBannerIndex === i ? 1 : 0,
                                    transition: 'opacity 1s ease-in-out',
                                    zIndex: currentBannerIndex === i ? 1 : 0
                                }}
                            />
                        ))}
                        <button onClick={prevBanner} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}><ChevronLeft size={24} color="var(--primary)" /></button>
                        <button onClick={nextBanner} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}><ChevronRight size={24} color="var(--primary)" /></button>
                    </div>
                </div>
                
                {/* Search Bar */}
                <div className="container" style={{ marginTop: '20px', padding: '0 15px' }}>
                     <div className="search-bar" style={{ display: 'flex', gap: '10px', maxWidth: '600px', margin: '0 auto', background: 'white', padding: '6px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                         <input 
                             type="text" 
                             placeholder="Search products..." 
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', outline: 'none', fontSize: '1rem' }}
                         />
                         {searchTerm && (
                             <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 10px', color: '#94a3b8' }}>
                                 <X size={18} />
                             </button>
                         )}
                     </div>
                </div>
            </section>

            {/* ── All Menu Items grouped by Category ── */}
            <main className="container menu-section" id="menu">

                {isLoading ? (
                    // Skeleton grid
                    <div className="menu-grid" style={{ marginTop: '20px' }}>
                        {Array(8).fill(0).map((_, i) => (
                            <div key={i} className="menu-item-card" style={{ border: '1px solid #e5e7eb' }}>
                                <div className="skeleton" style={{ height: '140px', width: '100%', borderRadius: '0' }} />
                                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div className="skeleton" style={{ height: '16px', width: '80%' }} />
                                    <div className="skeleton" style={{ height: '12px', width: '100%' }} />
                                    <div className="skeleton" style={{ height: '30px', width: '100%', borderRadius: '8px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {categories.map(cat => {
                            const isItemInCategory = (item, category) => {
                                if (!item || !category) return false;
                                const itemCat = item.category_id || item.categoryId;
                                return itemCat === category.id || String(itemCat) === String(category.id);
                            };

                            let catItems = items.filter(item => isItemInCategory(item, cat));
                            if (searchTerm) {
                                catItems = catItems.filter(item => (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
                            }
                            if (catItems.length === 0) return null;
                            return (
                                <div key={cat.id} id={`cat-${cat.id}`} style={{ 
                                    marginBottom: '40px', 
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    border: '1px solid rgba(30, 139, 0, 0.1)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                                }}>
                                    {/* Enhanced Category Section Heading */}
                                    <div className="menu-category-heading" style={{
                                        background: 'linear-gradient(135deg, #1E8B00 0%, #28B400 100%)',
                                        color: 'white',
                                        padding: '16px 24px',
                                        margin: '-24px -24px 24px -24px',
                                        borderRadius: '20px 20px 0 0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>{cat.name}</h2>
                                            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                                                Premium wholesale quality meats & products
                                            </p>
                                        </div>
                                        <span className="menu-category-badge" style={{
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            color: 'white',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            border: '1px solid rgba(255, 255, 255, 0.3)'
                                        }}>
                                            {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {/* Items List Format */}
                                    <div className="menu-list-container">
                                        {catItems.map(item => {
                                            const availStock = getItemAvailableStock(item);
                                            const isItemOut = item.out_of_stock || availStock <= 0;
                                            return (
                                                <div className="menu-item-list-card" key={item.id}
                                                    style={{ opacity: isItemOut ? 0.65 : 1, padding: '16px 20px' }}
                                                >
                                                    {/* Product Thumbnail */}
                                                    <div className="menu-item-list-img-wrapper">
                                                        <img
                                                            src={item.image || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=200&q=80'}
                                                            alt={item.name}
                                                            className="menu-item-list-img"
                                                            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=200&q=80'; }}
                                                        />
                                                    </div>
                                                    {/* Middle Content */}
                                                    <div className="menu-item-list-content">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <h3 className="menu-item-list-name">{item.name}</h3>
                                                            {isItemOut && (
                                                                <span style={{ background: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800 }}>
                                                                    OUT OF STOCK
                                                                </span>
                                                            )}
                                                            {item.min_order_note && (
                                                                <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 7px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800, lineHeight: 1.2 }}>
                                                                    {item.min_order_note}
                                                                </span>
                                                            )}
                                                            {!isItemOut && availStock <= (item.low_stock_threshold || 5) && (
                                                                <span style={{ background: '#dc2626', color: 'white', padding: '2px 6px', borderRadius: '12px', fontSize: '0.62rem', fontWeight: 800 }}>
                                                                    ⚠️ Low Stock
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="menu-item-list-desc">{item.description}</p>
                                                        {!isItemOut && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>

                                                                {(() => {
                                                                    const availBoxes = getItemBoxes(item).filter(b => !b.disabled && !b.ordered);
                                                                    if (availBoxes.length === 0) return null;
                                                                    return (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857' }}>📦 Available Boxes:</span>
                                                                            {availBoxes.map((b, idx) => (
                                                                                <span key={b.id || idx} style={{
                                                                                    background: '#ecfdf5',
                                                                                    border: '1px solid #a7f3d0',
                                                                                    color: '#065f46',
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 700
                                                                                }}>
                                                                                    {b.name}: {b.weight} kg {b.stockQty !== undefined && b.stockQty > 1 ? `(${b.stockQty} left)` : ''}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Right Price & Add Button */}
                                                    <div className="menu-item-list-right">
                                                        <div style={{ textAlign: 'right' }}>
                                                            {item.promo_price ? (
                                                                <>
                                                                    <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.72rem' }}>₱{item.price}</div>
                                                                    <div className="menu-item-list-price" style={{ color: '#dc2626' }}>₱{item.promo_price} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>/{item.unit || 'kg'}</span></div>
                                                                </>
                                                            ) : (
                                                                <div className="menu-item-list-price">₱{item.price} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>/{item.unit || 'kg'}</span></div>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="btn-success"
                                                            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.78rem', width: 'auto', minWidth: '100px' }}
                                                            disabled={isItemOut || !isOpen}
                                                            onClick={() => openProductSelection(item)}
                                                        >
                                                            <Plus size={14} /> Add to Order
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Orphan items fallback */}
                        {(() => {
                            let orphanItems = items.filter(item => {
                                const isItemInCategory = (it, category) => {
                                    if (!it || !category) return false;
                                    const itemCat = it.category_id || it.categoryId;
                                    return itemCat === category.id || String(itemCat) === String(category.id);
                                };

                                return !categories.some(cat => isItemInCategory(item, cat));
                            });
                            
                            if (searchTerm) {
                                orphanItems = orphanItems.filter(item => (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
                            }
                            
                            if (orphanItems.length === 0) return null;
                            return (
                                <div id="cat-other" style={{ 
                                    marginBottom: '40px', 
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '20px',
                                    padding: '24px',
                                    border: '1px solid rgba(255, 226, 0, 0.3)',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                                }}>
                                    <div className="menu-category-heading" style={{
                                        background: 'linear-gradient(135deg, #FFE200 0%, #D4BB00 100%)',
                                        color: '#071708',
                                        padding: '16px 24px',
                                        margin: '-24px -24px 24px -24px',
                                        borderRadius: '20px 20px 0 0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800' }}>Other Premium Selections</h2>
                                            <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.85rem' }}>
                                                Additional quality products & specialty items
                                            </p>
                                        </div>
                                        <span className="menu-category-badge" style={{
                                            background: 'rgba(7, 23, 8, 0.1)',
                                            color: '#071708',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            border: '1px solid rgba(7, 23, 8, 0.2)'
                                        }}>
                                            {orphanItems.length} item{orphanItems.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="menu-list-container">
                                        {orphanItems.map(item => {
                                            const availStock = getItemAvailableStock(item);
                                            const isItemOut = item.out_of_stock || availStock <= 0;
                                            return (
                                                <div className="menu-item-list-card" key={item.id}
                                                    style={{ opacity: isItemOut ? 0.65 : 1, padding: '16px 20px' }}
                                                >
                                                    {/* Product Thumbnail */}
                                                    <div className="menu-item-list-img-wrapper">
                                                        <img
                                                            src={item.image || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=200&q=80'}
                                                            alt={item.name}
                                                            className="menu-item-list-img"
                                                            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=200&q=80'; }}
                                                        />
                                                    </div>
                                                    <div className="menu-item-list-content">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <h3 className="menu-item-list-name">{item.name}</h3>
                                                            {isItemOut && (
                                                                <span style={{ background: '#dc2626', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800 }}>
                                                                    OUT OF STOCK
                                                                </span>
                                                            )}
                                                            {item.min_order_note && (
                                                                <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 7px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800 }}>
                                                                    {item.min_order_note}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="menu-item-list-desc">{item.description}</p>
                                                        {!isItemOut && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>

                                                                {(() => {
                                                                    const availBoxes = getItemBoxes(item).filter(b => !b.disabled && !b.ordered);
                                                                    if (availBoxes.length === 0) return null;
                                                                    return (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857' }}>📦 Available Boxes:</span>
                                                                            {availBoxes.map((b, idx) => (
                                                                                <span key={b.id || idx} style={{
                                                                                    background: '#ecfdf5',
                                                                                    border: '1px solid #a7f3d0',
                                                                                    color: '#065f46',
                                                                                    padding: '2px 8px',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '0.68rem',
                                                                                    fontWeight: 700
                                                                                }}>
                                                                                    {b.name}: {b.weight} kg {b.stockQty !== undefined && b.stockQty > 1 ? `(${b.stockQty} left)` : ''}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                <div className="menu-item-list-right">
                                                    <div className="menu-item-list-price">₱{item.price} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>/{item.unit || 'kg'}</span></div>
                                                    <button
                                                        className="btn-success"
                                                        style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.78rem', width: 'auto', minWidth: '100px' }}
                                                        disabled={isItemOut || !isOpen}
                                                        onClick={() => openProductSelection(item)}
                                                    >
                                                        <Plus size={14} /> Add to Order
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="app-footer">
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand Column */}
                        <div className="footer-brand">
                            <div className="footer-logo-row">
                                <img src={storeSettings.logo_url || "/chilled-frozen-logo.png"} alt="Logo" className="footer-logo-img" onError={(e) => { e.currentTarget.src = '/chilled-frozen-logo.png'; }} />
                                <div>
                                    <h3 className="footer-brand-title">{storeSettings.store_name}</h3>
                                    <span className="footer-brand-sub">Trader • Supplier • Distributor</span>
                                </div>
                            </div>
                            <p className="footer-desc">
                                Trader, supplier, and distributor of premium chilled and frozen meats in Batangas City. Wholesale and retail beef, chicken, pork, seafood, and rice from trusted brands like Excel, St. Helens, Seara, Swift, Sadia, Alibem, and Frimesa.
                            </p>
                        </div>

                        {/* Contact Column */}
                        <div>
                            <h4 className="footer-col-title">Store Information</h4>
                            <ul className="footer-contact-list">
                                <li className="footer-contact-item">
                                    <MapPin size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{storeSettings.address}</span>
                                </li>
                                <li className="footer-contact-item">
                                    <Phone size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>{storeSettings.contact}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Business Hours & Socials */}
                        <div>
                            <h4 className="footer-col-title">Business Hours</h4>
                            <ul className="footer-contact-list" style={{ marginBottom: '14px' }}>
                                <li className="footer-contact-item">
                                    <Clock size={16} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>Mon - Sun: {storeSettings.open_time || '08:00'} - {storeSettings.close_time || '19:00'}</span>
                                </li>
                            </ul>
                            <h4 className="footer-col-title" style={{ fontSize: '0.8rem', marginBottom: '8px' }}>Connect With Us</h4>
                            <div className="footer-social-row">
                                <a href="https://facebook.com/chilledandfrozenhubmeatshop" target="_blank" rel="noreferrer" className="footer-social-link" title="Facebook Page">
                                    <Facebook size={18} />
                                </a>
                                <a href={`tel:${storeSettings.contact}`} className="footer-social-link" title="Call Store">
                                    <Phone size={18} />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>© {new Date().getFullYear()} {storeSettings.store_name}. All rights reserved.</p>
                    </div>
                </div>
            </footer>

            {/* Selection Modal with Box Weight & Instant Total Calculation */}
            {selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', maxWidth: '520px', width: '100%', borderRadius: '24px', padding: '28px', position: 'relative', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} color="#475569" /></button>
                        
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#0f172a', fontWeight: 800 }}>{selectedProduct.name}</h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>{selectedProduct.description}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                    <span style={{ background: '#f1f5f9', color: '#0f172a', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                                        ₱{Number(selectedProduct.promo_price || selectedProduct.price).toFixed(2)} / {selectedProduct.unit || 'kg'}
                                    </span>

                                </div>
                            </div>
                        </div>

                        {/* Available Box Stock Weights Section */}
                        {getItemBoxes(selectedProduct).length > 0 && (
                            <div style={{ marginBottom: '22px' }}>

                                <label style={{ fontWeight: 800, display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#1e293b' }}>
                                    Available Boxes:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                                    {getItemBoxes(selectedProduct).map(b => {
                                        const isSold = Boolean(b.disabled || b.ordered);
                                        const isSelected = (selectionOptions.box?.id === b.id || selectionOptions.box?.name === b.name) && !isSold;
                                        const itemPricePerKg = Number(selectedProduct.promo_price || selectedProduct.price);
                                        const boxPKg = (b.pricePerKg !== undefined && b.pricePerKg !== '') ? Number(b.pricePerKg) : itemPricePerKg;
                                        const computedBoxPrice = (b.price !== undefined && b.price !== null && b.price !== '') 
                                            ? Number(b.price) 
                                            : (b.weight * boxPKg);

                                        return (
                                            <button
                                                key={b.id || b.name}
                                                disabled={isSold}
                                                type="button"
                                                onClick={() => {
                                                    if (!isSold) setSelectionOptions({ ...selectionOptions, box: b });
                                                }}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: '14px',
                                                    border: isSold ? '1.5px dashed #fca5a5' : isSelected ? '2px solid #059669' : '1.5px solid #cbd5e1',
                                                    background: isSold ? '#fef2f2' : isSelected ? '#f0fdf4' : 'white',
                                                    color: isSold ? '#991b1b' : isSelected ? '#065f46' : '#334155',
                                                    cursor: isSold ? 'not-allowed' : 'pointer',
                                                    opacity: isSold ? 0.65 : 1,
                                                    textAlign: 'left',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isSelected ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none'
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSold ? '#991b1b' : isSelected ? '#059669' : '#0f172a' }}>
                                                    {b.name}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: isSold ? '#7f1d1d' : '#475569', marginTop: '2px', fontWeight: 700 }}>
                                                    ⚖️ {b.weight} kg
                                                </div>
                                                {isSold ? (
                                                    <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '4px', fontWeight: 900 }}>
                                                        ❌ NA-ORDER NA
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px', fontWeight: 800 }}>
                                                        ₱{Number(computedBoxPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selected Box Computation Summary Card */}
                                {selectionOptions.box && (
                                    <div style={{
                                        marginTop: '16px',
                                        background: 'linear-gradient(135deg, #071708 0%, #0c250d 100%)',
                                        color: 'white',
                                        padding: '18px',
                                        borderRadius: '18px',
                                        border: '1.5px solid #F9B700',
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                                    }}>
                                        <div style={{ fontSize: '0.78rem', color: '#F9B700', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800, marginBottom: '8px' }}>
                                            Selected Box Calculation:
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '10px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Selected Box</div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{selectionOptions.box.name}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Weight</div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>{selectionOptions.box.weight} kg</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Price per Kilo</div>
                                                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F9B700' }}>
                                                    ₱{((selectionOptions.box.pricePerKg !== undefined && selectionOptions.box.pricePerKg !== '') ? Number(selectionOptions.box.pricePerKg) : Number(selectedProduct.promo_price || selectedProduct.price)).toFixed(2)} / kg
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Price</div>
                                                <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#4ade80' }}>
                                                    ₱{(() => {
                                                        if (selectionOptions.box.price !== undefined && selectionOptions.box.price !== null && selectionOptions.box.price !== '') return Number(selectionOptions.box.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                        const bpkg = (selectionOptions.box.pricePerKg !== undefined && selectionOptions.box.pricePerKg !== '') ? Number(selectionOptions.box.pricePerKg) : Number(selectedProduct.promo_price || selectedProduct.price);
                                                        return (selectionOptions.box.weight * bpkg).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic', textAlign: 'center' }}>
                                            {(() => {
                                                const bpkg = (selectionOptions.box.pricePerKg !== undefined && selectionOptions.box.pricePerKg !== '') ? Number(selectionOptions.box.pricePerKg) : Number(selectedProduct.promo_price || selectedProduct.price);
                                                if (selectionOptions.box.price !== undefined && selectionOptions.box.price !== null && selectionOptions.box.price !== '') {
                                                    return `Price: ₱${Number(selectionOptions.box.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                }
                                                return `Calculation: ${selectionOptions.box.weight} kg × ₱${bpkg.toFixed(2)} = ₱${(selectionOptions.box.weight * bpkg).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Standard Variations logic (if no boxes) */}
                        {getItemBoxes(selectedProduct).length === 0 && selectedProduct.variations && selectedProduct.variations.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 700, display: 'block', marginBottom: '10px' }}>Choose Weight / Option</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {selectedProduct.variations.map(v => (
                                        <button
                                            key={v.name}
                                            disabled={v.disabled}
                                            onClick={() => setSelectionOptions({ ...selectionOptions, variation: v })}
                                            style={{
                                                padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--primary)',
                                                background: selectionOptions.variation?.name === v.name ? 'var(--primary)' : 'white',
                                                color: selectionOptions.variation?.name === v.name ? 'white' : 'var(--primary)',
                                                cursor: v.disabled ? 'not-allowed' : 'pointer',
                                                opacity: v.disabled ? 0.3 : 1
                                            }}
                                        >
                                            {v.name} (+₱{v.price}) {v.disabled && '(Out of Stock)'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Addons logic */}
                        {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 700, display: 'block', marginBottom: '10px' }}>Add-ons (Optional)</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {selectedProduct.addons.map(a => (
                                        <button
                                            key={a.name}
                                            disabled={a.disabled}
                                            onClick={() => {
                                                const exists = selectionOptions.addons.find(x => x.name === a.name);
                                                if (exists) {
                                                    setSelectionOptions({ ...selectionOptions, addons: selectionOptions.addons.filter(x => x.name !== a.name) });
                                                } else {
                                                    setSelectionOptions({ ...selectionOptions, addons: [...selectionOptions.addons, a] });
                                                }
                                            }}
                                            style={{
                                                padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--primary)',
                                                background: selectionOptions.addons.find(x => x.name === a.name) ? 'var(--primary)' : 'white',
                                                color: selectionOptions.addons.find(x => x.name === a.name) ? 'white' : 'var(--primary)',
                                                cursor: a.disabled ? 'not-allowed' : 'pointer',
                                                opacity: a.disabled ? 0.3 : 1
                                            }}
                                        >
                                            + {a.name} (₱{a.price}) {a.disabled && '(Out of Stock)'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontWeight: 700, display: 'block', marginBottom: '10px' }}>{selectedProduct.optionsLabel || selectedProduct.options_label || 'Choose'}</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {selectedProduct.flavors.map(f => {
                                        const name = typeof f === 'string' ? f : f.name;
                                        const disabled = typeof f === 'object' ? f.disabled : false;

                                        if (disabled) return null;

                                        return (
                                            <button
                                                key={name}
                                                onClick={() => {
                                                    setSelectionOptions({ ...selectionOptions, flavors: [name] });
                                                }}
                                                style={{
                                                    padding: '8px 15px', borderRadius: '10px',
                                                    border: '1px solid var(--primary)',
                                                    background: selectionOptions.flavors.includes(name) ? 'var(--primary)' : 'white',
                                                    color: selectionOptions.flavors.includes(name) ? 'white' : 'var(--primary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <button className="btn-primary" style={{ width: '100%', padding: '16px', fontWeight: 800, fontSize: '1.1rem', borderRadius: '14px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => addToCart(selectedProduct, selectionOptions)}>
                            <Plus size={18} /> Add to Cart — ₱{(() => {
                                const itemPricePerKg = Number(selectedProduct.promo_price || selectedProduct.price);
                                let base = itemPricePerKg;
                                if (selectionOptions.box) {
                                    if (selectionOptions.box.price !== undefined && selectionOptions.box.price !== null && selectionOptions.box.price !== '') {
                                        base = Number(selectionOptions.box.price);
                                    } else {
                                        const bpkg = (selectionOptions.box.pricePerKg !== undefined && selectionOptions.box.pricePerKg !== '') ? Number(selectionOptions.box.pricePerKg) : itemPricePerKg;
                                        base = selectionOptions.box.weight * bpkg;
                                    }
                                } else if (selectionOptions.variation && Number(selectionOptions.variation.price) > 0) {
                                    base = selectedProduct.name?.toLowerCase().includes('pork ribs')
                                        ? itemPricePerKg + Number(selectionOptions.variation.price)
                                        : Number(selectionOptions.variation.price);
                                }
                                const addons = (selectionOptions.addons || []).reduce((sum, a) => sum + Number(a.price), 0);
                                return Number((base + addons).toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            })()}
                        </button>
                    </div>
                </div>
            )}

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', maxWidth: '500px', width: '100%', borderRadius: '24px', padding: '30px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button onClick={() => setIsCheckoutOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        <h2 style={{ marginBottom: '18px', fontSize: '1.8rem', color: 'var(--primary)' }}>Checkout</h2>

                        {/* Order Summary */}
                        <div style={{ marginBottom: '24px', padding: '14px 16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Your Order ({cartCount})</span>
                                <button
                                    type="button"
                                    onClick={() => setIsCheckoutOpen(false)}
                                    style={{ border: '1px solid var(--primary)', background: 'white', color: 'var(--primary)', borderRadius: '10px', padding: '6px 12px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Plus size={14} /> Continue Shopping
                                </button>
                            </div>
                            {cart.length === 0 ? (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Your cart is empty. Add a product to continue.</p>
                            ) : cart.map(item => (
                                <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', padding: '8px 0', borderTop: '1px solid #e2e8f0' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{item.name} {item.quantity > 1 && `× ${item.quantity}`}</div>
                                        {item.selectedBox && (
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>📦 {item.selectedBox.name} — {item.selectedBox.weight} kg</div>
                                        )}
                                        {!item.selectedBox && item.selectedVariation?.name && (
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.selectedVariation.name}</div>
                                        )}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                        ₱{Number(item.finalPrice * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </div>
                                    <button type="button" onClick={() => deleteFromCart(item.cartItemId)} title="Remove" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {cart.length > 0 && (
                        <div style={{ marginBottom: '30px' }}>

                            {/* Order Type & Form here */}
                            <div style={{ marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <label style={{ fontWeight: 800, fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a' }}>
                                        Step 1: Choose Order Type <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                                    </label>
                                    {!orderType && (
                                        <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', fontWeight: 800, padding: '3px 8px', borderRadius: '12px' }}>
                                            Required
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                                    {orderTypes.map(type => {
                                        const typeKey = type.name.toLowerCase();
                                        const isSelected = orderType.toLowerCase() === typeKey || orderType.toLowerCase() === (type.id || '').toLowerCase() || (typeKey.includes('lalamove') && orderType.toLowerCase().includes('lalamove'));
                                        return (
                                            <button
                                                key={type.id || type.name}
                                                type="button"
                                                onClick={() => setOrderType(typeKey)}
                                                style={{
                                                    padding: '12px 10px',
                                                    fontSize: '0.86rem',
                                                    borderRadius: '12px',
                                                    border: isSelected ? '2px solid var(--primary)' : '1px solid #cbd5e1',
                                                    background: isSelected ? 'var(--primary)' : '#f8fafc',
                                                    color: isSelected ? 'white' : '#1e293b',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: isSelected ? '0 4px 12px rgba(12, 37, 13, 0.2)' : 'none'
                                                }}
                                            >
                                                {typeKey.includes('pickup') && <ShoppingBag size={16} />}
                                                {typeKey.includes('lalamove') && <Truck size={16} />}
                                                {typeKey.includes('delivery') && !typeKey.includes('lalamove') && <Truck size={16} />}
                                                {type.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {orderType && (
                                <div style={{ marginBottom: '30px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Full Name</label><input type="text" value={customerDetails.name} onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>
                                        <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Phone</label><input type="tel" value={customerDetails.phone} onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>
                                        {orderType === 'pickup' && <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Time</label><input type="time" value={customerDetails.pickup_time} onChange={(e) => setCustomerDetails({ ...customerDetails, pickup_time: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>}
                                        {orderType === 'delivery' && (
                                            <>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>
                                                        Delivery Location <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <select
                                                        value={customerDetails.delivery_location}
                                                        onChange={(e) => setCustomerDetails({ ...customerDetails, delivery_location: e.target.value })}
                                                        style={{
                                                            padding: '12px',
                                                            width: '100%',
                                                            borderRadius: '10px',
                                                            border: '1px solid #e2e8f0',
                                                            background: 'white',
                                                            fontSize: '1rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="">-- Select Barangay --</option>
                                                        {deliveryLocations.map(loc => (
                                                            <option key={loc.id || loc.name} value={loc.name}>
                                                                {loc.name} (₱{loc.charge} delivery fee)
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {customerDetails.delivery_location && (
                                                        <p style={{ fontSize: '0.85rem', color: '#059669', marginTop: '8px', fontWeight: 600 }}>
                                                            📍 Delivery Charge: ₱{deliveryLocations.find(l => l.name === customerDetails.delivery_location)?.charge || 0}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>
                                                        Complete Address <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <textarea
                                                        value={customerDetails.address}
                                                        onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                                                        placeholder="House/Lot No., Street, Subdivision..."
                                                        style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Landmark (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={customerDetails.landmark}
                                                        onChange={(e) => setCustomerDetails({ ...customerDetails, landmark: e.target.value })}
                                                        placeholder="Near school, beside sari-sari store, etc."
                                                        style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                        {!['pickup', 'delivery'].includes(orderType) && !orderType.includes('lalamove') && <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Notes / Instructions</label><textarea value={customerDetails.landmark} onChange={(e) => setCustomerDetails({ ...customerDetails, landmark: e.target.value })} placeholder="Any specific requests..." style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>}
                                        {(orderType === 'lalamove delivery' || orderType.includes('lalamove')) && (
                                            <>
                                                <div style={{ padding: '16px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '14px', border: '1.5px solid #fde68a', fontSize: '0.88rem', color: '#92400e', boxShadow: '0 2px 10px rgba(245, 158, 11, 0.08)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.95rem', color: '#b45309', marginBottom: '6px' }}>
                                                        <Truck size={18} />
                                                        <span>Lalamove Delivery</span>
                                                    </div>
                                                    <div style={{ lineHeight: '1.5', fontSize: '0.84rem' }}>
                                                        <strong style={{ color: '#78350f' }}>Booking Reminders:</strong>
                                                        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                                                            <li>The store will confirm your order on Messenger before booking.</li>
                                                            <li>Once confirmed, you or the store will arrange the Lalamove rider booking.</li>
                                                            <li>The Lalamove delivery fee is paid directly to the rider upon delivery.</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>
                                                        Complete Address <span style={{ color: '#ef4444' }}>*</span>
                                                    </label>
                                                    <textarea
                                                        value={customerDetails.address}
                                                        onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })}
                                                        placeholder="House/Lot No., Street, Subdivision, Barangay, City..."
                                                        style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Landmark (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={customerDetails.landmark}
                                                        onChange={(e) => setCustomerDetails({ ...customerDetails, landmark: e.target.value })}
                                                        placeholder="Near school, beside sari-sari store, etc."
                                                        style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Additional Notes (Optional)</label>
                                                    <textarea
                                                        value={customerDetails.lalamove_note}
                                                        onChange={(e) => setCustomerDetails({ ...customerDetails, lalamove_note: e.target.value })}
                                                        placeholder="e.g. fragile items, call before delivery, gate code..."
                                                        style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '60px' }}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment Method (shown after an order type is chosen) */}
                            {orderType && (
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ fontWeight: 800, fontSize: '1.02rem', display: 'block', marginBottom: '15px', color: '#0f172a' }}>
                                    Step 2: Choose Payment Method <span style={{ color: '#dc2626', fontWeight: 900 }}>*</span>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                    {paymentSettings.map(method => {
                                        const isCash = isCashMethod(method.name);
                                        const notAvailable = isCash && isLalamoveOrder;
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                disabled={notAvailable}
                                                onClick={() => setPaymentMethod(method.id)}
                                                title={notAvailable ? 'Not available for Lalamove Delivery' : undefined}
                                                style={{
                                                    padding: '15px', borderRadius: '15px', border: '2px solid',
                                                    borderColor: paymentMethod === method.id ? 'var(--primary)' : '#e2e8f0',
                                                    background: notAvailable ? '#f1f5f9' : paymentMethod === method.id ? '#f0f9ff' : 'white',
                                                    cursor: notAvailable ? 'not-allowed' : 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                                    opacity: notAvailable ? 0.55 : 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div style={{ marginBottom: '8px', color: notAvailable ? '#94a3b8' : 'var(--primary)' }}>{isCash ? <Banknote size={24} /> : <CreditCard size={24} />}</div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: notAvailable ? '#94a3b8' : 'var(--primary)' }}>{method.name}</div>
                                                {notAvailable && (
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#ef4444', marginTop: '4px' }}>Not available for Lalamove</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Payment Details Area */}
                                {paymentMethod && (() => {
                                    const method = paymentSettings.find(m => m.id === paymentMethod);
                                    if (!method) return null;
                                    const isCash = (name => {
                                        if (!name) return false;
                                        const lower = name.toLowerCase().trim();
                                        if (lower.includes('gcash')) return false;
                                        return lower.includes('cash') || lower.includes('cod');
                                    })(method.name);
                                    if (isCash) {
                                        return (
                                            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '20px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                                <Banknote size={32} style={{ color: '#059669', marginBottom: '10px' }} />
                                                <h4 style={{ color: '#059669', marginBottom: '8px' }}>Cash Payment</h4>
                                                <p style={{ color: '#065f46', fontSize: '0.9rem' }}>Please prepare exact amount. Payment will be collected upon {orderType === 'delivery' ? 'delivery' : 'pickup'}.</p>
                                            </div>
                                        );
                                    }
                                    const qrCodeImage = method.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(method.name + ': ' + (method.account_number || method.accountNumber || '09947246294'))}`;
                                    return (
                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <h4 style={{ color: 'var(--primary)', marginBottom: '14px', fontSize: '1.1rem', fontWeight: 800 }}>Send {method.name} Payment</h4>
                                                <div style={{ background: 'white', padding: '15px', borderRadius: '16px', display: 'inline-block', marginBottom: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                                                    <img src={qrCodeImage} style={{ width: '200px', height: '200px', borderRadius: '12px', objectFit: 'contain', display: 'block' }} alt={`${method.name} QR Code`} />
                                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginTop: '8px' }}>
                                                        📷 Scan QR Code to Pay via {method.name}
                                                    </div>
                                                </div>
                                                <div style={{ background: 'white', padding: '15px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 600 }}>Account Number</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>{method.account_number || method.accountNumber || '09947246294'}</div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const accNum = method.account_number || method.accountNumber || '09947246294';
                                                                navigator.clipboard.writeText(accNum);
                                                                alert('✓ Account number copied: ' + accNum);
                                                            }}
                                                            style={{ border: 'none', background: 'var(--primary)', color: 'white', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, fontSize: '0.8rem' }}
                                                        >
                                                            <Copy size={14} /> Copy
                                                        </button>
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Account Name: {method.account_name || method.accountName || 'Chilled and Frozen Hub'}</div>
                                                    {method.instructions && (
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>
                                                            {method.instructions}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            )}

                            {/* Step 3: Total + Send via Messenger (shown after a payment method is chosen) */}
                            {orderType && paymentMethod && (<>
                            <label style={{ fontWeight: 800, fontSize: '1.02rem', display: 'block', marginBottom: '12px', color: '#0f172a' }}>
                                Step 3: Send Your Order
                            </label>
                            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: orderType === 'delivery' && deliveryCharge > 0 ? '10px' : '0' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Subtotal:</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>₱{cartSubtotal}</span>
                                </div>
                                {orderType === 'delivery' && deliveryCharge > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #e2e8f0' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#059669' }}>
                                            🚚 Delivery Charge ({customerDetails.delivery_location}):
                                        </span>
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>₱{deliveryCharge}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>Total Amount:</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₱{cartTotal}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handlePlaceOrder}
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    borderRadius: '15px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #0084ff 0%, #a334fa 100%)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    fontWeight: 800,
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 18px rgba(0, 132, 255, 0.3)'
                                }}
                            >
                                <MessageSquare size={22} /> Send Order via Messenger
                            </button>
                            <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
                                Your order details will be copied, then Messenger opens so you can paste and send them to the store.
                            </p>
                            </>)}
                        </div>
                        )}
                    </div>
                </div>
            )}

            {/* Cart Sidebar */}
            {isCartOpen && (
                <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', maxWidth: '450px', height: '100vh', background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)', zIndex: 1100, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}><h2>Your Cart</h2><button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button></div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {cart.map(item => (
                            <div key={item.cartItemId} style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-start' }}>
                                <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80'; }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0 }}>{item.name}</h4>
                                    <p style={{ margin: '2px 0 5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {item.selectedBox ? `📦 ${item.selectedBox.name} (${item.selectedBox.weight} kg @ ₱${item.pricePerKg}/kg)` : (item.selectedVariation?.name || '')}
                                        {item.selectedFlavors && item.selectedFlavors.length > 0 ? ` | ${item.selectedFlavors.join(', ')}` : ''}
                                    </p>
                                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>₱{Number(item.finalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={() => removeFromCart(item.cartItemId)} style={{ border: '1px solid var(--border)', background: 'none', padding: '2px', borderRadius: '4px' }}><Minus size={14} /></button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => addOneToCart(item.cartItemId)} style={{ border: '1px solid var(--border)', background: 'none', padding: '2px', borderRadius: '4px' }}><Plus size={14} /></button>
                                    <button onClick={() => deleteFromCart(item.cartItemId)} style={{ marginLeft: '5px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-primary" onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); setOrderCopied(false); }} style={{ width: '100%', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 800 }}>Proceed to Checkout</button>
                </div>
            )}
        </div>
    );
};

export default Home;
