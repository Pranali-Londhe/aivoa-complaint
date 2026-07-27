from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pypdf import PdfReader
import io
import json

from agent import run_complaint_agent
from database import init_db, get_db, Complaint

app = FastAPI(title="AIVOA Complaint Agent", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/process-complaint")
async def process_complaint(
    text: str = Form(None),
    current_data: str = Form(None),
    file: UploadFile = File(None)
):
    content = ""
    current = None
    if current_data:
        try:
            current = json.loads(current_data)
        except:
            current = None

    if file and file.filename:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "Only PDF files are supported")
        try:
            pdf_bytes = await file.read()
            reader = PdfReader(io.BytesIO(pdf_bytes))
            content = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(400, f"Failed to read PDF: {str(e)}")
    elif text and text.strip():
        content = text.strip()
    else:
        raise HTTPException(400, "Provide either text or a PDF file")

    if not content.strip():
        raise HTTPException(400, "No readable content found")

    try:
        result = run_complaint_agent(content, current_data=current)
        return result
    except Exception as e:
        raise HTTPException(500, f"Agent error: {str(e)}")


@app.post("/commit-complaint")
def commit_complaint(data: dict = Body(...), db: Session = Depends(get_db)):
    try:
        complaint = Complaint(
            complaint_source=data.get("complaintSource", ""),
            customer_name=data.get("customerName", ""),
            product_name=data.get("productName", ""),
            product_strength=data.get("productStrength", ""),
            batch_number=data.get("batchNumber", ""),
            affected_quantity=data.get("affectedQuantity", ""),
            manufacturing_date=data.get("manufacturingDate", ""),
            expiry_date=data.get("expiryDate", ""),
            site_block=data.get("siteBlock", ""),
            impacted_materials=data.get("impactedMaterials", ""),
            complaint_category=data.get("complaintCategory", ""),
            complaint_description=data.get("complaintDescription", ""),
            severity=data.get("severity", ""),
            suggested_action=data.get("suggestedAction", ""),
            risk_assessment=data.get("riskAssessment", ""),
            completeness_check=data.get("completenessCheck", ""),
            capa_recommendation=data.get("capaRecommendation", ""),
        )
        db.add(complaint)
        db.commit()
        db.refresh(complaint)
        return {
            "success": True,
            "message": "Complaint successfully committed to QMS Ledger",
            "id": complaint.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save complaint: {str(e)}")