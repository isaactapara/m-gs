/**
 * Generic mapper to translate Prisma output to Mongoose-like JSON
 * for the frontend to consume seamlessly.
 */
const toMongoJSON = (prismaPayload) => {
  if (!prismaPayload) return null;

  if (Array.isArray(prismaPayload)) {
    return prismaPayload.map(toMongoJSON);
  }

  // Shallow clone
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
