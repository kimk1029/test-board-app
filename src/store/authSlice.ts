import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchJSON } from "../apiService";

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  token: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  email: null,
  token: null,
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials: { email: string; password: string }) => {
    const response = await fetchJSON("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    return response;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
      state.isAuthenticated = false;
      state.email = null;
      state.token = null;
      state.error = null;
    },
    updateAuth: (state, action) => {
      state.email = action.payload.user.email;
      state.isAuthenticated = true;
      state.token = action.payload.token;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.isAuthenticated = true;
      state.email = action.payload.user.email;
      state.token = action.payload.token;
      state.error = null;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.isAuthenticated = false;
      state.email = null;
      state.token = null;
      state.error = action.error.message || "An error occurred during login";
    });
  },
});
export const { logout, updateAuth } = authSlice.actions;
export default authSlice.reducer;
