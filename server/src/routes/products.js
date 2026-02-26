import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, updateProductsOrder, bulkDeleteProducts, bulkCreateProducts } from '../controllers/products.js';

const router = express.Router();

router.get('/', getProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/reorder', updateProductsOrder);
router.post('/bulk-delete', bulkDeleteProducts);
router.post('/bulk-create', bulkCreateProducts);

export default router;
