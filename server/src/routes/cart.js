import express from 'express';
import { getCart, addToCart, removeFromCart, clearCart } from '../controllers/cart.js';

const router = express.Router();

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/', removeFromCart);
router.delete('/clear', clearCart);

export default router;
