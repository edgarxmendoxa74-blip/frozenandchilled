// Script to delete all menu_items and categories from Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dliwsryouhxretuuwkem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsaXdzcnlvdWh4cmV0dXV3a2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODM2NDEsImV4cCI6MjEwNDg1OTY0MX0.L3Wp2Vx274hh0ohK2KHZYPyO_WTVLonxFW4errmAq7E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteAllData() {
    console.log('🗑️ Starting deletion of all inventory data...');

    // 1. Delete all menu_items
    console.log('\n📦 Deleting all menu_items...');
    const { data: itemsBefore } = await supabase.from('menu_items').select('id, name');
    console.log(`   Found ${itemsBefore?.length || 0} menu items to delete`);
    
    const { error: itemsError } = await supabase
        .from('menu_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (itemsError) {
        console.error('   ❌ Error deleting menu_items:', itemsError.message);
    } else {
        console.log('   ✅ All menu_items deleted successfully!');
    }

    // 2. Delete all categories
    console.log('\n🏷️ Deleting all categories...');
    const { data: catsBefore } = await supabase.from('categories').select('id, name');
    console.log(`   Found ${catsBefore?.length || 0} categories to delete`);
    
    const { error: catsError } = await supabase
        .from('categories')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (catsError) {
        console.error('   ❌ Error deleting categories:', catsError.message);
    } else {
        console.log('   ✅ All categories deleted successfully!');
    }

    // 3. Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const { data: itemsAfter } = await supabase.from('menu_items').select('id');
    const { data: catsAfter } = await supabase.from('categories').select('id');
    console.log(`   menu_items remaining: ${itemsAfter?.length || 0}`);
    console.log(`   categories remaining: ${catsAfter?.length || 0}`);

    console.log('\n✅ Deletion complete!');
}

deleteAllData().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
