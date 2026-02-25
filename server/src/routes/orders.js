import express from 'express';
import { submitOrder, getAllOrders } from '../controllers/orders.js';

const router = express.Router();

router.post('/', submitOrder);
router.get('/', getAllOrders);

export default router;
