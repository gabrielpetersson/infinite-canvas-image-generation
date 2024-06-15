// expert level environment variables
export const getApi = () => {
  if (import.meta.env.DEV) {
    return "http://localhost:3000";
  }
  //   return "https://image-generation-f9781f09260d.herokuapp.com";
  return import.meta.env.VITE_API_URL;
};
