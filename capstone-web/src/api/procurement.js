import { prc } from './http';

export const createGRN = (payload) => prc.post('/grns', payload);
