import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import recipientsRoutes from './routes/recipients.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/recipients', recipientsRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Alansar Charity API' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
