/**
 * Generic mapper to translate Prisma output to Mongoose-like JSON
 * for the frontend to consume seamlessly.
 */
const toMongoJSON = (prismaPayload) => {
  if (prismaPayload === null || prismaPayload === undefined) return prismaPayload;

  if (Array.isArray(prismaPayload)) {
    return prismaPayload.map(toMongoJSON);
  }

  // If it's not an object (primitive) or it's a Date, return as-is
  if (typeof prismaPayload !== 'object' || prismaPayload instanceof Date) {
    return prismaPayload;
  }

  // Handle Prisma Decimal specifically (it identifies as an object)
  const isDecimal = prismaPayload.constructor && prismaPayload.constructor.name === 'Decimal';
  const hasDecimalMethods = typeof prismaPayload.toFixed === 'function' && typeof prismaPayload.toNumber === 'function';
  
  if (isDecimal || hasDecimalMethods) {
    return Number(prismaPayload.toString());
  }

  // Shallow clone for object mapping
  const mapped = { ...prismaPayload };

  // Map 'id' to '_id'
  if (mapped.id) {
    mapped._id = mapped.id;
  }

  // Handle nested arrays, objects, and types like Decimal
  for (const key of Object.keys(mapped)) {
    const value = mapped[key];
    
    if (Array.isArray(value)) {
      mapped[key] = value.map(toMongoJSON);
    } else if (value !== null && typeof value === 'object') {
      if (value instanceof Date) {
        continue;
      }
      
      // Handle Prisma Decimal more robustly
      const isDecimal = value.constructor && value.constructor.name === 'Decimal';
      const hasDecimalMethods = typeof value.toFixed === 'function' && typeof value.toNumber === 'function';
      
      if (isDecimal || hasDecimalMethods) {
        mapped[key] = Number(value.toString());
      } else {
        mapped[key] = toMongoJSON(value);
      }
    }
  }

  return mapped;
};

module.exports = { toMongoJSON };
