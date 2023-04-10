import { configureStore, getDefaultMiddleware } from "@reduxjs/toolkit";
import authReducer from "./authSlice"; // Import your auth reducer (update the path if needed)
import bbsReducer from "./bbsSlice";
const middleware = getDefaultMiddleware();

const store = configureStore({
  reducer: {
    auth: authReducer,
    bbs: bbsReducer,
  },
  middleware,
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
