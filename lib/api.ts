const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = {
  // Products
  getProducts: async () => {
    const res = await fetch(`${API_URL}/products`);
    return res.json();
  },

  // Cart
  getCart: async (token: string) => {
    const res = await fetch(`${API_URL}/cart?token=${token}`);
    return res.json();
  },

  addToCart: async (token: string, productId: string, quantity: number) => {
    const res = await fetch(`${API_URL}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, productId, quantity }),
    });
    return res.json();
  },

  removeFromCart: async (token: string, productId: string) => {
    const res = await fetch(`${API_URL}/cart`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, productId }),
    });
    return res.json();
  },

  // Orders
  submitOrder: async (token: string) => {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  getAllOrders: async () => {
    const res = await fetch(`${API_URL}/orders`);
    return res.json();
  },

  // Recipients
  createRecipient: async (name: string, phone: string) => {
    const res = await fetch(`${API_URL}/recipients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    return res.json();
  },

  getAllRecipients: async () => {
    const res = await fetch(`${API_URL}/recipients`);
    return res.json();
  },

  // Admin Products
  createProduct: async (data: any) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateProduct: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteProduct: async (id: string) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
};
