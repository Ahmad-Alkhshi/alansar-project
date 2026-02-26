import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRoutes from '../src/routes/products.js';
import cartRoutes from '../src/routes/cart.js';
import ordersRoutes from '../src/routes/orders.js';
import recipientsRoutes from '../src/routes/recipients.js';
import adminRoutes from '../src/routes/admin.js';
import authRoutes from '../src/routes/auth.js';
import defaultBasketsRoutes from '../src/routes/default-baskets.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/recipients', recipientsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/default-baskets', defaultBasketsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Alansar Charity API' });
});

export default app;
