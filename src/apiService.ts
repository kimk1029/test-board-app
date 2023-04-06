export const fetchJSON = async (endpoint: string, options?: RequestInit) => {
  console.log(process.env);
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}${endpoint}`,
    options
  );

  if (!response.ok) {
    throw new Error(`Error fetching data from ${endpoint}`);
  }

  return response.json();
};
