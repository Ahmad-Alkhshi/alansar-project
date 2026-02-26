import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, updateProductsOrder } from '../controllers/products.js';

const router = express.Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/reorder', updateProductsOrder);

export default router;
