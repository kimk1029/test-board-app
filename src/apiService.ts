export const fetchJSON = async (endpoint: string, options?: RequestInit) => {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}${endpoint}`,
    options
  );

  if (!response.ok) {
    throw new Error(`Error fetching data from ${endpoint}`);
  }

  return response.json();
};
export const postJSON = async (endpoint: string, data: any) => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Error posting data to ${endpoint}`);
  }

  return response.json();
};

export const deleteJSON = async (endpoint: string) => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Error deleting data from ${endpoint}`);
  }

  return response;
};
