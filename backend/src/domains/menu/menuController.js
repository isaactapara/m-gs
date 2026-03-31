const prisma = require('../../config/prisma');
const AppError = require('../../core/appError');
const asyncHandler = require('../../core/asyncHandler');
const NodeCache = require('node-cache');

const menuCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Explicit mapping function to ensure frontend compatibility (Mongoose _id & Decimal to Number)
const mapMenuItem = (item) => ({
  ...item,
  _id: item.id,
  price: item.price ? parseFloat(item.price) : 0,
});


const getMenu = asyncHandler(async (req, res) => {
  const cachedMenu = menuCache.get('all_menu');
  if (cachedMenu) return res.json(cachedMenu);

  const menu = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: [
      { soldCount: 'desc' },
      { category: 'asc' },
      { name: 'asc' }
    ]
  });
  const mappedMenu = menu.map(mapMenuItem);
  menuCache.set('all_menu', mappedMenu);
  res.json(mappedMenu);
});

// Map frontend labels to Prisma Enum keys
const categoryMap = {
  'Mains': 'MAINS',
  'Main Courses': 'MAINS',
  'Snacks': 'SNACKS',
  'Hot Beverages': 'HOT_BEVERAGES',
  'Sides': 'SIDES',
  'Side Dishes': 'SIDES',
  'Drinks': 'DRINKS',
  'Staples': 'STAPLES',
  'Vegetables': 'VEGETABLES'
};

const addMenuItem = asyncHandler(async (req, res) => {
  const { name, price, category } = req.body;
  
  // Map category or fallback to MAINS
  const mappedCategory = categoryMap[category] || 'MAINS';

  const item = await prisma.menuItem.create({
    data: { 
      name, 
      price, 
      category: mappedCategory
    }
  });

  menuCache.flushAll();
  res.status(201).json(mapMenuItem(item));
});



const updateMenuItem = asyncHandler(async (req, res) => {
  const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  
  if (!existing) {
    throw new AppError('Item not found', 404, 'MENU_ITEM_NOT_FOUND');
  }

  // Sanitize fields to prevent Prisma errors from frontend fields like _id
  const { name, price, category, isActive, soldCount } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (price !== undefined) updateData.price = Number(price);
  if (category !== undefined) updateData.category = categoryMap[category] || 'MAINS';
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (soldCount !== undefined) updateData.soldCount = Number(soldCount);


  try {
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    menuCache.flushAll();
    res.json(mapMenuItem(item));

  } catch (error) {
    console.error('Prisma Menu Update Error:', {
      params: req.params,
      updateData,
      error: error.message,
      errorCode: error.code
    });
    throw error;
  }
});




const deleteMenuItem = asyncHandler(async (req, res) => {
  const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  
  if (!existing) {
    throw new AppError('Item not found', 404, 'MENU_ITEM_NOT_FOUND');
  }

  await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { isActive: false }
  });

  menuCache.flushAll();
  res.json({ message: 'Item removed' });
});

const warmupCache = async () => {
  try {
    const menu = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [
        { soldCount: 'desc' },
        { category: 'asc' },
        { name: 'asc' }
      ]
    });
    const mappedMenu = menu.map(mapMenuItem);
    menuCache.set('all_menu', mappedMenu);
    console.log('Menu cache warmed up with', mappedMenu.length, 'items');
  } catch (err) {
    console.error('Menu cache warmup failed:', err.message);
  }
};

module.exports = {
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  warmupCache,
};

