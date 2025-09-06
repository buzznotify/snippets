import { MOCK_ORG_DATA } from "./mock/org";

export const setLocalStorage = async (key, value) => {
  if (typeof window !== 'undefined') {
    await localStorage.setItem(key, JSON.stringify(value));
  }
};
export const getLocalStorage = (key) => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

export const removeLocalStorage = (key) => {
  if (typeof window !== 'undefined') {
    return localStorage.removeItem(key);
  }
};

export const getOrgsAPI = async (token) => {
  return await fetch("/api/v1/org/list", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  }).then(async (response) => {
    const data = await response?.json();
    return data.data;
  }).catch((error) => {
    console.log(error);
    return MOCK_ORG_DATA;
  });
};

export const createOrgAPI = async (token, payload) => {
  return await fetch("/api/v1/org/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
};

export const updateOrgAPI = async (token, payload) => {
  return await fetch("/api/v1/org/", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
};

export const inviteUsersAPI = async (token, payload) => {
  return await fetch("/api/v1/org/invite", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
};

export const duplicateOrgAPI = async (token, payload) => {
  return await fetch("/api/v1/org/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
};

export const deleteOrgAPI = async (token, payload) => {
  return await fetch("/api/v1/org/", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });
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
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const nameEq = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split("; ");
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.indexOf(nameEq) === 0) {
        return decodeURIComponent(part.substring(nameEq.length));
      }
    }
  }
  return null;
};

export const deleteCookie = (name) => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.cookie = `${encodeURIComponent(
      name
    )}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }
};
