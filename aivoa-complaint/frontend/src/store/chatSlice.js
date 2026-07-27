import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [
    {
      id: 1,
      type: 'bot',
      text: 'Ready to process new complaints. You can paste the raw email from the customer, or upload a PDF of the complaint report. I will extract the data and run the initial risk assessment.',
    },
  ],
  inputMessage: '',
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setInputMessage: (state, action) => {
      state.inputMessage = action.payload;
    },
    clearInput: (state) => {
      state.inputMessage = '';
    },
  },
});

export const { addMessage, setInputMessage, clearInput } = chatSlice.actions;
export default chatSlice.reducer;