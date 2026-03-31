const prisma = require('../../config/prisma');
const AppError = require('../../core/appError');
const asyncHandler = require('../../core/asyncHandler');

// Explicit mapping function to ensure frontend compatibility (Mongoose _id & Decimal to Number)
const mapMenuItem = (item) => ({
  ...item,
  _id: item.id,
  price: item.price ? parseFloat(item.price) : 0,
});

const getMenu = asyncHandler(async (req, res) => {
  const menu = await prisma.menuItem.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });
  res.json(menu.map(mapMenuItem));
});

const addMenuItem = asyncHandler(async (req, res) => {
  const { name, price, category } = req.body;
  const item = await prisma.menuItem.create({
    data: { name, price, category }
  });
  res.status(201).json(mapMenuItem(item));
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const existing = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
  
  if (!existing) {
    throw new AppError('Item not found', 404, 'MENU_ITEM_NOT_FOUND');
  }

  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: req.body
  });

  res.json(mapMenuItem(item));
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

  res.json({ message: 'Item removed' });
});

module.exports = {
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
