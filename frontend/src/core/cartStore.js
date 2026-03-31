export class CartStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.cart = [];
  }

  get totalItems() {
    return this.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  get totalAmount() {
    return this.cart.reduce((sum, item) => (
      sum + (Number(item.price || 0) * Number(item.quantity || 0))
    ), 0);
  }

  addToCart(item) {
    const itemId = item.id || item._id;
    const existing = this.cart.find((entry) => entry.id === itemId || entry._id === itemId);

    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        ...item,
        id: itemId,
        menuItemId: item.menuItemId || itemId || null,
        quantity: 1,
      });
    }

    this.rootStore.notify();
  }

  removeFromCart(itemId) {
    const index = this.cart.findIndex((entry) => entry.id === itemId || entry._id === itemId);

    if (index > -1) {
      if (this.cart[index].quantity > 1) {
        this.cart[index].quantity -= 1;
      } else {
        this.cart.splice(index, 1);
      }
    }

    this.rootStore.notify();
  }

  clearCart(shouldNotify = true) {
    this.cart = [];

    if (shouldNotify) {
      this.rootStore.notify();
    }
  }
}
