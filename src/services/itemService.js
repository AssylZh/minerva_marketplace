import API_BASE from '../config';

export const fetchItems = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.listing_type) query.set('listing_type', params.listing_type);
    if (params.city) query.set('city', params.city);
    if (params.category && params.category !== 'All') query.set('category', params.category);
    if (params.q) query.set('q', params.q);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page);
    if (params.per_page) query.set('per_page', params.per_page);
    const res = await fetch(`${API_BASE}/items?${query}`);
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
};
