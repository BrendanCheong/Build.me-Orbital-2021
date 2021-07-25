import axios from "axios";

const axiosInstance = axios.create({
  // this defines the GLOBAL URL endpoint, to be changed to heroku URL when we migrate the Heroku
  baseURL: "https://build-me.netlify.app",
  withCredentials: true,
});

export default axiosInstance;
