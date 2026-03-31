export const saveJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadJson = (key, fallbackValue) => {
  const stored = localStorage.getItem(key);

  try {
    return stored ? JSON.parse(stored) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
};

export const removeValue = (key) => {
  localStorage.removeItem(key);
};
