const setLocalStorage = async (key, value) => {
  await localStorage.setItem(key, JSON.stringify(value));
};
const getLocalStorage = (key) => {
  return localStorage.getItem(key);
};

const removeLocalStorage = (key) => {
  return localStorage.removeItem(key);
};

const getAllDevices = async (token) => {
  console.log(token, "token abc");
  return await fetch("/api/v1/device/all", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  });
};

const notifyDevices = async ({ token, ...payload }) => {
  console.log(payload, "payload");
  return await fetch("/api/v1/device/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
};

const createDeviceGroup = async ({ token, ...payload }) => {
  return await fetch("/api/v1/device/group", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
};

const getAllGroups = async (token) => {
  console.log(token, "token abc");
  return await fetch("/api/v1/device/group", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  });
};

const login = async (payload) => {
  return await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

export {
  removeLocalStorage,
  setLocalStorage,
  getLocalStorage,
  getAllDevices,
  notifyDevices,
  createDeviceGroup,
  getAllGroups,
  login,
};
