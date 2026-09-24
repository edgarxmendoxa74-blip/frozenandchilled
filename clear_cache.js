// Clear all cached menu data from localStorage
// Run this in browser console or add it to a script

console.log('Clearing all cached menu data...');

// Clear menu items
localStorage.removeItem('menuItems');
localStorage.removeItem('categories'); 
localStorage.removeItem('paymentSettings');
localStorage.removeItem('deliveryLocations');
localStorage.removeItem('orderTypes');
localStorage.removeItem('storeSettings');

// Clear any other app-related cache
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('menu') || key.includes('item') || key.includes('category'))) {
        keysToRemove.push(key);
    }
}

keysToRemove.forEach(key => localStorage.removeItem(key));

console.log('Cache cleared! Refresh the page.');