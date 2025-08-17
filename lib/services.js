export const setLocalStorage = async (key, value) => {
  await localStorage.setItem(key, JSON.stringify(value));
};
export const getLocalStorage = (key) => {
  return localStorage.getItem(key);
};

export const removeLocalStorage = (key) => {
  return localStorage.removeItem(key);
};

export const getAllSnippetsAPI = async (token) => {
  console.log(token, "token abc");
  return await fetch("/api/v1/snippet/list", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  }).then(async (response) => {
    const data = await response?.json();
    const formattedResponse = formatSnippetListData(data.data);
    return formattedResponse;
  });
};

export const deleteSnippetsAPI = async (token, id) => {
  return await fetch("/api/v1/snippet/", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ snippet_id: id }),
  }).then(async (response) => {
    return response;
  });
};

export const createSnippetAPI = async (token, payload) => {
  return await fetch("/api/v1/snippet/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const data = await response?.json();
    console.log(data, "createSnippetAPI");
    const formattedResponse = formatSnippetListData([data.data]);
    console.log(formattedResponse, "formattedResponse createSnippetAPI");
    return formattedResponse[0];
  });
};

export const updateSnippetAPI = async (token, payload) => {
  return await fetch(`/api/v1/snippet/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  }).then(async (response) => {
    const data = await response?.json();
    console.log(data, "updateSnippetAPI");
    const formattedResponse = formatSnippetListData([data.data]);
    console.log(formattedResponse, "formattedResponse updateSnippetAPI");
    return formattedResponse[0];
  });
};

export const loginAPI = async (payload) => {
  return await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
};

export const formatSnippetListData = (data) => {
  return data?.map((snippet) => ({
    id: snippet._id,
    keyName: snippet.keyName,
    value: snippet.value,
    type: snippet.type,
    "Last Updated": new Date(snippet.updated_at).toLocaleString(),
  }));
};

export const getCookie = (name) => {
  const nameEq = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split("; ");
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part.indexOf(nameEq) === 0) {
      return decodeURIComponent(part.substring(nameEq.length));
    }
  }
  return null;
};

export const deleteCookie = (name) => {
  document.cookie = `${encodeURIComponent(
    name
  )}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};
