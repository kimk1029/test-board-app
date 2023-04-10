import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { deleteJSON, fetchJSON, postJSON } from "../apiService";

export interface BoardData {
  bbs_uid: number;
  title: string;
  author: string;
  creation_date: string;
}
export interface BoardDetails {
  bbs_uid: number;
  title: string;
  author: string;
  creation_date: string;
  contents: string;
}
export interface PostBoard {
  title: string;
  author: string;
  creation_date: string;
  contents: string;
}
export const fetchBoardData = createAsyncThunk(
  "bbs/fetchBoardData",
  async () => {
    const data = await fetchJSON("/bbs");
    return data;
  }
);
export const fetchBoardDetails = createAsyncThunk(
  "bbs/fetchBoardDetails",
  async (id: number) => {
    const data = await fetchJSON(`/bbs/${id}`);
    console.log(data);
    return data as BoardDetails;
  }
);
export const createPost = createAsyncThunk(
  "bbs/createPost",
  async (newPost: Omit<BoardData, "bbs_uid">) => {
    const data = await postJSON("/bbs", newPost);
    return data as BoardData;
  }
);

export const deletePost = createAsyncThunk(
  "bbs/deletePost",
  async (id: number) => {
    await deleteJSON(`/bbs/${id}`);
    return id;
  }
);

const bbsSlice = createSlice({
  name: "bbs",
  initialState: {
    boardData: [] as BoardData[],
    status: "idle" as "idle" | "loading" | "succeeded" | "failed",
    error: null as string | null,
    boardDetails: {} as BoardDetails,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoardData.pending, (state) => {
        state.status = "loading";
      })
      .addCase(
        fetchBoardData.fulfilled,
        (state, action: PayloadAction<BoardData[]>) => {
          state.status = "succeeded";
          state.boardData = action.payload;
        }
      )
      .addCase(fetchBoardData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message || "An error occurred during bbs";
      })
      .addCase(
        fetchBoardDetails.fulfilled,
        (state, action: PayloadAction<BoardDetails>) => {
          state.status = "succeeded";
          state.boardDetails = action.payload;
        }
      )
      .addCase(fetchBoardDetails.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.error.message || "An error occurred fetching board details";
      })
      .addCase(
        createPost.fulfilled,
        (state, action: PayloadAction<BoardData>) => {
          state.status = "succeeded";
          state.boardData.push(action.payload);
        }
      )
      .addCase(createPost.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.error.message || "An error occurred creating a new post";
      })
      .addCase(deletePost.fulfilled, (state, action: PayloadAction<number>) => {
        state.status = "succeeded";
        state.boardData = state.boardData.filter(
          (post) => post.bbs_uid !== action.payload
        );
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.error.message || "An error occurred deleting the post";
      });
  },
});

export default bbsSlice.reducer;
