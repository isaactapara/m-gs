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

  // Handle nested arrays (e.g. Bill.items)
  for (const key of Object.keys(mapped)) {
    if (Array.isArray(mapped[key])) {
      mapped[key] = mapped[key].map(toMongoJSON);
    } else if (mapped[key] !== null && typeof mapped[key] === 'object' && !(mapped[key] instanceof Date)) {
      mapped[key] = toMongoJSON(mapped[key]);
    }
  }

  return mapped;
};

module.exports = { toMongoJSON };
