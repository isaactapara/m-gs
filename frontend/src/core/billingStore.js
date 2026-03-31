export class BillingStore {
  constructor(rootStore) {
    this.rootStore = rootStore;
    this.menu = [];
    this.bills = [];
    this.users = [];
    this.reportSummary = null;
  }

  resetState({ notify = true } = {}) {
    this.menu = [];
    this.bills = [];
    this.users = [];
    this.reportSummary = null;

    if (notify) {
      this.rootStore.notify();
    }
  }

  normalizeBill(bill) {
    return {
      ...bill,
      id: bill._id || bill.id,
      timestamp: new Date(bill.createdAt || bill.timestamp || Date.now()),
    };
  }

  normalizeMenu(menuItems = []) {
    return menuItems.map((item) => ({
      ...item,
      id: item._id || item.id,
    }));
  }

  normalizeUsers(users = []) {
    return users.map((user) => ({
      ...user,
      id: user._id || user.id,
    }));
  }

  upsertBill(bill, { notify = true } = {}) {
    const normalizedBill = this.normalizeBill(bill);
    const index = this.bills.findIndex((entry) => entry._id === normalizedBill.id || entry.id === normalizedBill.id);

    if (index > -1) {
      this.bills[index] = normalizedBill;
    } else {
      this.bills.unshift(normalizedBill);
    }

    if (notify) {
      this.rootStore.notify();
    }

    return normalizedBill;
  }

  async fetchInitialData({ notify = true } = {}) {
    if (!this.rootStore.authStore.isAuthenticated) {
      this.resetState({ notify });
      return;
    }

    try {
      // 1. Fetch Menu first and as fast as possible
      this.rootStore.apiClient.get('/menu').then(menuData => {
        this.menu = this.normalizeMenu(menuData);
      
        // Cleanup cart items that no longer exist in the new menu
        const validMenuIds = new Set(this.menu.map(item => item.id));
        const rootCart = this.rootStore.cartStore.cart || [];
        const validCart = rootCart.filter(item => validMenuIds.has(item.id));
        
        if (validCart.length !== rootCart.length) {
          console.warn('Cleaning up defunct menu items from cart after DB reset.');
          this.rootStore.cartStore.cart = validCart;
          this.rootStore.notify();
        }


        if (notify) this.rootStore.notify();
      }).catch(err => console.error('Menu fetch failed:', err));

      // 2. Fetch others in background
      const [billsData, usersData] = await Promise.all([
        this.rootStore.apiClient.get('/bills'),
        this.rootStore.authStore.userRole === 'owner'
          ? this.rootStore.apiClient.get('/auth/users').catch(() => [])
          : Promise.resolve([]),
      ]);

      this.bills = billsData.map((bill) => this.normalizeBill(bill));
      this.users = this.normalizeUsers(usersData);

      if (notify) {
        this.rootStore.notify();
      }
    } catch (error) {
      console.error('Failed to fetch background data:', error);
    }

  }

  async addMenuItem(itemData) {
    const data = await this.rootStore.apiClient.post('/menu', itemData);

    this.menu.push({ ...data, id: data._id || data.id });
    this.rootStore.notify();
    return data;
  }

  async updateMenuItem(id, itemData) {
    const data = await this.rootStore.apiClient.patch(`/menu/${id}`, itemData);

    const index = this.menu.findIndex((item) => item._id === id || item.id === id);
    if (index > -1) {
      this.menu[index] = { ...data, id: data._id || data.id };
    }

    this.rootStore.notify();
    return data;
  }

  async deleteMenuItem(id) {
    await this.rootStore.apiClient.delete(`/menu/${id}`);
    this.menu = this.menu.filter((item) => item._id !== id && item.id !== id);
    this.rootStore.notify();
  }

  async createBill(billData) {
    const payload = {
      ...billData,
      items: billData.items.map((item) => ({
        menuItemId: item.menuItemId || item.id || item._id || null,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
    };

    const data = await this.rootStore.apiClient.post('/bills', payload);
    return this.upsertBill(data);
  }

  async deleteBill(id) {
    await this.rootStore.apiClient.delete(`/bills/${id}`);
    this.bills = this.bills.filter((bill) => bill._id !== id && bill.id !== id);
    this.rootStore.notify();
  }

  async updateBillStatus(id, status, paymentMethod = null) {
    const body = { status };

    if (paymentMethod) {
      body.paymentMethod = paymentMethod;
    }

    const data = await this.rootStore.apiClient.patch(`/bills/${id}`, body);
    return this.upsertBill(data);
  }

  async addUser(username, password) {
    try {
      const data = await this.rootStore.apiClient.post('/auth/register', {
        username,
        password,
        role: 'cashier',
      });


      this.users.push({ ...data, id: data.id || data._id });
      this.rootStore.notify();
      return { success: true, message: `Staff character '${username}' provisioned successfully!` };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error?.message || error.response?.data?.message || 'Failed to create user.',
      };
    }
  }

  async deleteUser(id) {
    await this.rootStore.apiClient.delete(`/auth/users/${id}`);
    this.users = this.users.filter((user) => user._id !== id && user.id !== id);
    this.rootStore.notify();
  }

  async toggleUserStatus(id) {
    const data = await this.rootStore.apiClient.patch(`/auth/users/${id}/toggle-status`);
    const index = this.users.findIndex((user) => user._id === id || user.id === id);
    if (index > -1) {
      this.users[index].isActive = data.isActive;
      this.rootStore.notify();
    }
    return data;
  }


  async fetchReportSummary(timeframe = 'week') {
    const data = await this.rootStore.apiClient.get(`/reports/summary?timeframe=${encodeURIComponent(timeframe)}`);
    this.reportSummary = data;
    this.rootStore.notify();
    return data;
  }
}
