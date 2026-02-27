import express from 'express';
import { getCart, addToCart, removeFromCart, clearCart, bulkAddToCart } from '../controllers/cart.js';

const router = express.Router();

router.get('/', getCart);
router.post('/', addToCart);
router.post('/bulk-add', bulkAddToCart);
router.delete('/', removeFromCart);
router.delete('/clear', clearCart);

export default router;
