export const defaultValues = {
  PACKAGE_ID: process.env.PACKAGE_ID,
  CHAT_ROOM_REGISTRY_ID: process.env.CHAT_ROOM_REGISTRY_ID,
  USER_PROFILE_REGISTRY_ID: process.env.USER_PROFILE_REGISTRY_ID,
  SUI_CLOCK_ID: '0x6'
};

const getConstant = (key: keyof typeof defaultValues) => {
  const valueFromLocalStorage = localStorage.getItem(key);

  if (valueFromLocalStorage !== null) {
    return valueFromLocalStorage;
  }

  return defaultValues[key];
};

export const setConstant = (key: keyof typeof defaultValues, value: string) => {
  localStorage.setItem(key, value);
};

export const resetAllConstants = () => {
  Object.keys(defaultValues).forEach(key => {
    localStorage.removeItem(key);
  });
};

export const getAllConstants = () => {
  const keys: (keyof typeof defaultValues)[] = Object.keys(defaultValues) as (keyof typeof defaultValues)[];

  return keys.reduce((acc, key) => {
    acc[key] = getConstant(key);
    return acc;
  }, {} as typeof defaultValues);
}

export default getConstant;
