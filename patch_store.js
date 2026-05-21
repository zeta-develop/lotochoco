const fs = require('fs');
const file = 'store/pos-store.ts';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  "updateCartItem: (id: string, updates: Partial<CartItem>) => void",
  "updateCartItem: (id: string, updates: Partial<CartItem>) => void\n  updateAllCartItems: (updates: Partial<CartItem>) => void"
);

data = data.replace(
  "clearCart: () => set({ cart: [] }),",
  `updateAllCartItems: (updates) => {
        set((state) => ({
          cart: state.cart.map((item) => ({ ...item, ...updates }))
        }))
      },
      clearCart: () => set({ cart: [] }),`
);

fs.writeFileSync(file, data);
