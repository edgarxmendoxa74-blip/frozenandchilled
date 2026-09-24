// Complete Menu Data Cleanup Script
// This will delete from Supabase AND clear localStorage cache

import { supabase } from './src/supabaseClient.js';

async function completeCleanup() {
    console.log('🧹 Starting complete menu cleanup...');
    
    try {
        // 1. Delete all menu items from Supabase
        console.log('1. Deleting from Supabase...');
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // This condition will match all rows
        
        if (error) {
            console.error('Supabase delete error:', error);
        } else {
            console.log('✅ All items deleted from Supabase');
        }
        
        // 2. Clear localStorage
        console.log('2. Clearing localStorage...');
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
        
        console.log('✅ localStorage cleared');
        
        // 3. Trigger a reload event
        window.dispatchEvent(new Event('store_data_updated'));
        
        console.log('🎉 Complete cleanup finished! Refresh the page to see changes.');
        
        // Force reload after 1 second
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Run cleanup
completeCleanup();