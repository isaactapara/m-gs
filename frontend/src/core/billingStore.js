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
      // Fetch all core restaurant data concurrently to ensure a complete state before notification
      const [menuData, billsData, usersData] = await Promise.all([
        this.rootStore.apiClient.get('/menu'),
        this.rootStore.apiClient.get('/bills'),
        this.rootStore.authStore.userRole === 'owner'
          ? this.rootStore.apiClient.get('/auth/users').catch(() => [])
          : Promise.resolve([]),
      ]);

      // Process and normalize data
      this.menu = this.normalizeMenu(menuData);
      this.bills = billsData.map((bill) => this.normalizeBill(bill));
      this.users = this.normalizeUsers(usersData);

      // Cleanup cart items that no longer exist in the fresh menu
      const validMenuIds = new Set(this.menu.map(item => item.id));
      const rootCart = this.rootStore.cartStore?.cart || [];
      const validCart = rootCart.filter(item => validMenuIds.has(item.id));
      
      if (validCart.length !== rootCart.length) {
        console.warn('Cleaning up defunct menu items from cart after state refresh.');
        this.rootStore.cartStore.cart = validCart;
      }

      if (notify) {
        this.rootStore.notify();
      }
    } catch (error) {
      console.error('Failed to fetch initial restaurant state:', error);
    }
  }

  async addMenuItem(itemData) {
    const tempId = `temp-${Date.now()}`;
    const tempItem = { ...itemData, id: tempId, pending: true, _id: tempId };
    this.menu.unshift(tempItem);
    this.rootStore.notify();

    try {
      const data = await this.rootStore.apiClient.post('/menu', itemData);
      const index = this.menu.findIndex(i => i.id === tempId);
      if (index > -1) {
        this.menu[index] = { ...data, id: data._id || data.id };
      }
      this.rootStore.notify();
      return data;
    } catch (error) {
      this.menu = this.menu.filter(i => i.id !== tempId);
      this.rootStore.notify();
      throw error;
    }
  }

  async updateMenuItem(id, itemData) {
    const index = this.menu.findIndex((item) => item._id === id || item.id === id);
    let backupItem = null;

    if (index > -1) {
      backupItem = { ...this.menu[index] };
      this.menu[index] = { ...this.menu[index], ...itemData, pending: true };
      this.rootStore.notify();
    }

    try {
      const data = await this.rootStore.apiClient.patch(`/menu/${id}`, itemData);
      if (index > -1) {
        this.menu[index] = { ...data, id: data._id || data.id };
      }
      this.rootStore.notify();
      return data;
    } catch (error) {
      if (backupItem && index > -1) {
        this.menu[index] = backupItem;
        this.rootStore.notify();
      }
      throw error;
    }
  }

  async deleteMenuItem(id) {
    const index = this.menu.findIndex((item) => item._id === id || item.id === id);
    let backupItem = null;

    if (index > -1) {
      backupItem = this.menu[index];
      this.menu = this.menu.filter((item) => item._id !== id && item.id !== id);
      this.rootStore.notify();
    }

    try {
      await this.rootStore.apiClient.delete(`/menu/${id}`);
    } catch (error) {
      if (backupItem) {
        this.menu.splice(index, 0, backupItem);
        this.rootStore.notify();
      }
      throw error;
    }
  }

  async createBill(billData) {
    const tempId = `temp-bill-${Date.now()}`;
    const payload = {
      ...billData,
      items: billData.items.map((item) => ({
        menuItemId: item.menuItemId || item.id || item._id || null,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
      })),
    };

    const optimisticBill = {
      ...payload,
      id: tempId,
      _id: tempId,
      createdAt: new Date(),
      billNumber: '...',
      pending: true
    };
    this.upsertBill(optimisticBill);

    try {
      const data = await this.rootStore.apiClient.post('/bills', payload);
      this.bills = this.bills.filter(b => b.id !== tempId);
      return this.upsertBill(data);
    } catch (error) {
      this.bills = this.bills.filter(b => b.id !== tempId);
      this.rootStore.notify();
      throw error;
    }
  }

  async deleteBill(id) {
    await this.rootStore.apiClient.delete(`/bills/${id}`);
    this.bills = this.bills.filter((bill) => bill._id !== id && bill.id !== id);
    this.rootStore.notify();
  }

  async updateBillStatus(id, status, paymentMethod = null) {
    const index = this.bills.findIndex((entry) => entry._id === id || entry.id === id);
    let backupBill = null;

    if (index > -1) {
      backupBill = { ...this.bills[index] };
      const optimisticUpdate = { ...backupBill, status };
      if (paymentMethod) optimisticUpdate.paymentMethod = paymentMethod;
      this.bills[index] = optimisticUpdate;
      this.rootStore.notify();
    }

    try {
      const body = { status };
      if (paymentMethod) {
        body.paymentMethod = paymentMethod;
      }
      const data = await this.rootStore.apiClient.patch(`/bills/${id}`, body);
      return this.upsertBill(data);
    } catch (error) {
      if (backupBill && index > -1) {
        this.bills[index] = backupBill;
        this.rootStore.notify();
      }
      throw error;
    }
  }

  async addUser(username, password, confirmPassword) {
    try {
      const data = await this.rootStore.apiClient.post('/auth/register', {
        username,
        password,
        confirmPassword: confirmPassword,
        role: 'cashier',
      });


      this.users.push({ ...data, id: data.id || data._id });
      this.rootStore.notify();
      return { success: true, message: `Staff character '${username}' provisioned successfully!` };
    } catch (error) {
      const errorBody = error.response?.data?.error;
      let message = errorBody?.message || 'Failed to create user.';
      
      // If validation details are available, show the first specific error
      if (errorBody?.details?.[0]) {
        message = `${message}: ${errorBody.details[0].message}`;
      }

      return {
        success: false,
        message,
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

  async updateUserRole(id, role) {
    const data = await this.rootStore.apiClient.patch(`/auth/users/${id}/role`, { role });
    const index = this.users.findIndex((user) => user._id === id || user.id === id);
    if (index > -1) {
      this.users[index].role = data.role;
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

  async fetchAllSummaries() {
    const data = await this.rootStore.apiClient.get('/reports/summary/all');
    this.rootStore.notify();
    return data;
  }
}
