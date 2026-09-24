import { supabase } from './supabaseClient';

// One visit is counted per browser per day. A visit is marked "ordered" when that
// browser sends an order, so analytics can compare visitors who ordered vs. browsed only.

const VISITOR_KEY = 'cfh_visitor_id';
const LAST_VISIT_KEY = 'cfh_last_visit_date';

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const getVisitorId = () => {
    try {
        let id = localStorage.getItem(VISITOR_KEY);
        if (!id) {
            id = (crypto.randomUUID && crypto.randomUUID()) || `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem(VISITOR_KEY, id);
        }
        return id;
    } catch {
        return null;
    }
};

export const recordStoreVisit = async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    const visitDate = today();
    try {
        if (localStorage.getItem(LAST_VISIT_KEY) === visitDate) return;
    } catch { /* storage blocked: still try to record */ }

    const { error } = await supabase
        .from('store_visits')
        .upsert([{ visitor_id: visitorId, visit_date: visitDate }], { onConflict: 'visitor_id,visit_date', ignoreDuplicates: true });
    if (error) {
        console.warn('Could not record store visit:', error.message);
        return;
    }
    try { localStorage.setItem(LAST_VISIT_KEY, visitDate); } catch { /* ignore */ }
};

export const markVisitOrdered = async () => {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    const visitDate = today();
    const orderedAt = new Date().toISOString();

    const { data, error } = await supabase
        .from('store_visits')
        .update({ ordered: true, ordered_at: orderedAt })
        .eq('visitor_id', visitorId)
        .eq('visit_date', visitDate)
        .select('id');
    if (error) {
        console.warn('Could not mark visit as ordered:', error.message);
        return;
    }
    // No visit row for today (e.g. the page was opened before midnight): record one as ordered.
    if (!data || data.length === 0) {
        const { error: insertError } = await supabase
            .from('store_visits')
            .insert([{ visitor_id: visitorId, visit_date: visitDate, ordered: true, ordered_at: orderedAt }]);
        if (insertError) console.warn('Could not record ordered visit:', insertError.message);
    }
};
