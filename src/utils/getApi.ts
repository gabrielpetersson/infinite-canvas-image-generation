// expert level environment variables
export const getApi = () => {
  if (import.meta.env.DEV) {
    return "http://localhost:3000";
  }
  //   return "https://image-generation-f9781f09260d.herokuapp.com";
  return "https://remember-thismj-ui-production-3f09.up.railway.app";
};
