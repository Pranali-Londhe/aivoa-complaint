import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  formData: {
    complaintSource: '',
    customerName: '',
    productName: '',
    productStrength: '',
    batchNumber: '',
    affectedQuantity: '',
    manufacturingDate: '',
    expiryDate: '',
    siteBlock: '',
    impactedMaterials: '',
    complaintCategory: '',
    complaintDescription: '',
    severity: '',
    suggestedAction: '',
    riskAssessment: '',
    completenessCheck: '',
    capaRecommendation: '',
  },
  status: 'Ready to Commit',
  isLoading: false,
};

const complaintSlice = createSlice({
  name: 'complaint',
  initialState,
  reducers: {
    setFormData: (state, action) => {
      state.formData = action.payload;
    },
    updateFormField: (state, action) => {
      const { name, value } = action.payload;
      state.formData[name] = value;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    clearForm: (state) => {
      state.formData = initialState.formData;
      state.status = 'Ready to Commit';
    },
  },
});

export const { setFormData, updateFormField, setStatus, setLoading, clearForm } = complaintSlice.actions;
export default complaintSlice.reducer;