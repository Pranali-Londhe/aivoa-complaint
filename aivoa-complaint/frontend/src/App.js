import React, { useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setFormData,
  updateFormField,
  setStatus,
  setLoading,
  clearForm,
} from './store/complaintSlice';
import {
  addMessage,
  setInputMessage,
  clearInput,
} from './store/chatSlice';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const dispatch = useDispatch();

  // Redux state
  const { formData, status, isLoading } = useSelector((state) => state.complaint);
  const { messages, inputMessage } = useSelector((state) => state.chat);

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    dispatch(updateFormField({ name: e.target.name, value: e.target.value }));
  };

  const processComplaint = async (text = null, file = null) => {
    dispatch(setLoading(true));
    dispatch(
      addMessage({
        id: Date.now() + Math.random(),
        type: 'bot',
        text: text ? 'Processing your request…' : 'Extracting data from document…',
      })
    );

    try {
      const formDataBody = new FormData();
      if (text) formDataBody.append('text', text);
      if (file) formDataBody.append('file', file);

      // Send current form state so Edit works
      formDataBody.append('current_data', JSON.stringify(formData));

      const res = await fetch(`${API_BASE}/process-complaint`, {
        method: 'POST',
        body: formDataBody,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Processing failed');
      }

      const data = await res.json();

      // Update the entire form
      dispatch(
        setFormData({
          complaintSource: data.complaint_source || '',
          customerName: data.customer_name || '',
          productName: data.product_name || '',
          productStrength: data.product_strength || '',
          batchNumber: data.batch_number || '',
          affectedQuantity: data.affected_quantity || '',
          manufacturingDate: data.manufacturing_date || '',
          expiryDate: data.expiry_date || '',
          siteBlock: data.site_block || '',
          impactedMaterials: data.impacted_materials || '',
          complaintCategory: data.complaint_category || '',
          complaintDescription: data.complaint_description || '',
          severity: data.severity || '',
          suggestedAction: data.suggested_action || '',
          riskAssessment: data.risk_assessment || '',
          completenessCheck: data.completeness_check || '',
          capaRecommendation: data.capa_recommendation || '',
        })
      );

      // Update status badge
      const risk = (data.severity || '').toLowerCase();
      if (risk.includes('critical') || risk.includes('major')) {
        dispatch(setStatus('High Risk – Review'));
      } else {
        dispatch(setStatus('Ready to Commit'));
      }

      dispatch(
        addMessage({
          id: Date.now() + Math.random(),
          type: 'bot',
          text: data.chat_reply || 'Done.',
        })
      );
    } catch (err) {
      dispatch(
        addMessage({
          id: Date.now() + Math.random(),
          type: 'bot',
          text: `Error: ${err.message}`,
        })
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isLoading) return;

    dispatch(
      addMessage({
        id: Date.now() + Math.random(),
        type: 'user',
        text: inputMessage.trim(),
      })
    );

    const userText = inputMessage.trim();
    dispatch(clearInput());
    processComplaint(userText, null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch(
      addMessage({
        id: Date.now() + Math.random(),
        type: 'user',
        text: `Uploaded file: ${file.name}`,
      })
    );

    processComplaint(null, file);
    e.target.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ===== REAL COMMIT FUNCTION =====
  const handleCommit = async () => {
    if (!formData.productName) {
      alert("Please log a complaint first before committing.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/commit-complaint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to commit");
      }

      alert(`✅ Complaint committed successfully!\nID: ${data.id}`);
    } catch (err) {
      alert("Error committing complaint: " + err.message);
    }
  };

  const handleClear = () => {
    dispatch(clearForm());
  };

  return (
    <div className="app-container">
      {/* ========== LEFT PANEL ========== */}
      <div className="left-panel">
        <div className="form-header">
          <div>
            <p className="module-title">API & FDF Quality Assurance Module</p>
          </div>
          <span className={`status-badge ${status.toLowerCase().includes('high') ? 'high' : 'ready'}`}>
            <span className="dot"></span> {status}
          </span>
        </div>

        {/* 1. ORIGIN & CUSTOMER DETAILS */}
        <div className="section">
          <h3 className="section-title">1. ORIGIN & CUSTOMER DETAILS</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Complaint Source</label>
              <input
                type="text"
                name="complaintSource"
                value={formData.complaintSource}
                onChange={handleChange}
                placeholder="e.g. Pharmacy"
              />
            </div>
            <div className="form-group">
              <label>Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="e.g. Apollo Pharmacy"
              />
            </div>
          </div>
        </div>

        {/* 2. PRODUCT & BATCH IDENTIFICATION */}
        <div className="section">
          <h3 className="section-title">2. PRODUCT & BATCH IDENTIFICATION</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder="Awaiting AI extraction..."
              />
            </div>
            <div className="form-group">
              <label>Product Strength</label>
              <input
                type="text"
                name="productStrength"
                value={formData.productStrength}
                onChange={handleChange}
                placeholder="e.g. 500 mg"
              />
            </div>
            <div className="form-group">
              <label>Batch / Lot Number</label>
              <input
                type="text"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleChange}
                placeholder="Awaiting AI extraction..."
              />
            </div>
            <div className="form-group">
              <label>Affected Quantity</label>
              <input
                type="text"
                name="affectedQuantity"
                value={formData.affectedQuantity}
                onChange={handleChange}
                placeholder="e.g. 12 capsules"
              />
            </div>
            <div className="form-group">
              <label>Manufacturing Date</label>
              <input
                type="text"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleChange}
                placeholder="e.g. March 2026"
              />
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              <input
                type="text"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                placeholder="e.g. February 2028"
              />
            </div>
          </div>
        </div>

        {/* 3. FACILITY & MATERIAL IMPACT */}
        <div className="section">
          <h3 className="section-title">3. FACILITY & MATERIAL IMPACT</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Originating Site Block</label>
              <input
                type="text"
                name="siteBlock"
                value={formData.siteBlock}
                onChange={handleChange}
                placeholder="e.g. Manufacturing"
              />
            </div>
            <div className="form-group">
              <label>Impacted Non-Product Materials (NPM)</label>
              <input
                type="text"
                name="impactedMaterials"
                value={formData.impactedMaterials}
                onChange={handleChange}
                placeholder="e.g. Primary Packaging (Bottle)"
              />
            </div>
          </div>
        </div>

        {/* 4. DEFECT ANALYSIS */}
        <div className="section">
          <h3 className="section-title">4. DEFECT ANALYSIS</h3>
          <div className="form-group">
            <label>Complaint Category</label>
            <input
              type="text"
              name="complaintCategory"
              value={formData.complaintCategory}
              onChange={handleChange}
              placeholder="e.g. Product Defect - Discoloration"
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Complaint Description</label>
            <textarea
              name="complaintDescription"
              value={formData.complaintDescription}
              onChange={handleChange}
              rows="3"
              placeholder="AI will generate a formal description..."
            />
          </div>
        </div>

        {/* AI Risk Assessment Card */}
        <div className="risk-card">
          <div className="risk-card-header">
            <span className="shield">🛡️</span>
            <span>AI copilot risk assessment</span>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Severity (Suggested)</label>
              <input
                type="text"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                placeholder="e.g. Major"
              />
            </div>
            <div className="form-group">
              <label>Suggested Next Action</label>
              <input
                type="text"
                name="suggestedAction"
                value={formData.suggestedAction}
                onChange={handleChange}
                placeholder="e.g. Route to QA Investigation"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.8rem' }}>
            <label>Initial Risk Assessment</label>
            <textarea
              name="riskAssessment"
              value={formData.riskAssessment}
              onChange={handleChange}
              rows="2"
              placeholder="AI risk rationale..."
            />
          </div>

          {/* Completeness Checker */}
          <div className="form-group" style={{ marginTop: '0.9rem' }}>
            <label>Complaint Completeness</label>
            <input
              type="text"
              name="completenessCheck"
              value={formData.completenessCheck}
              onChange={handleChange}
              placeholder="AI will check missing fields..."
              className={
                formData.completenessCheck.toLowerCase().includes('incomplete')
                  ? 'incomplete-field'
                  : ''
              }
            />
          </div>

          {/* CAPA Recommendation */}
          <div className="form-group" style={{ marginTop: '0.9rem' }}>
            <label>CAPA Recommendation</label>
            <textarea
              name="capaRecommendation"
              value={formData.capaRecommendation}
              onChange={handleChange}
              rows="3"
              placeholder="AI suggested Corrective & Preventive Actions..."
            />
          </div>
        </div>

        <div className="action-buttons">
          <button className="primary-btn" onClick={handleCommit} disabled={isLoading}>
            Commit to QMS Ledger
          </button>
          <button className="clear-btn" onClick={handleClear} disabled={isLoading}>
            Clear Form
          </button>
        </div>
      </div>

      {/* ========== RIGHT PANEL - AIVOA COPILOT ========== */}
      <div className="right-panel">
        <div className="copilot-header">
          <div className="copilot-title">
            <span className="bot-icon">✦</span>
            <div>
              <div>AIVOA Copilot</div>
              <div className="copilot-subtitle">Drop complaint files or paste text below.</div>
            </div>
          </div>
          <div className={`online-dot ${isLoading ? 'pulse' : ''}`}></div>
        </div>

        <div className="chat-area">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.type === 'bot' ? 'bot-message' : 'user-message'}`}
            >
              {msg.type === 'bot' && <div className="bot-avatar">✦</div>}
              <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message bot-message">
              <div className="bot-avatar">✦</div>
              <div className="message-content loading">Thinking…</div>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <div className="input-wrapper">
            <button
              className="attach-btn"
              title="Upload PDF"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <input
              type="text"
              placeholder="Type a message or paste a complaint..."
              value={inputMessage}
              onChange={(e) => dispatch(setInputMessage(e.target.value))}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
            >
              ➤
            </button>
          </div>
          <p className="powered-by">POWERED BY LANGGRAPH</p>
        </div>
      </div>
    </div>
  );
}

export default App;