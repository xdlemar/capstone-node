import { inv } from './http';

export const getInventory = (params) => inv.get('/inventory', { params });
export const postReceipt  = (payload) => inv.post('/receipts', payload);
