from typing import TypedDict, Annotated, Sequence, Optional
import operator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import json

load_dotenv()

# ---------- Structured Output Schema ----------
class ComplaintExtraction(BaseModel):
    complaint_source: str = Field(description="Source of the complaint, e.g. Pharmacy, Hospital, Distributor, Patient")
    customer_name: str = Field(description="Name of the customer / pharmacy / hospital that reported the complaint")
    product_name: str = Field(description="Full product name (API or FDF)")
    product_strength: str = Field(description="Strength / dosage, e.g. 500 mg, 250 mg/5ml")
    batch_number: str = Field(description="Batch or Lot number")
    affected_quantity: str = Field(description="Quantity affected, e.g. 12 capsules, 3 bottles")
    manufacturing_date: str = Field(description="Manufacturing date if mentioned, otherwise 'Not specified'")
    expiry_date: str = Field(description="Expiry date if mentioned, otherwise 'Not specified'")
    site_block: str = Field(description="Originating site / block, e.g. Manufacturing, Block A, Warehouse, Packaging")
    impacted_materials: str = Field(description="Impacted non-product materials (NPM), e.g. Primary Packaging (Bottle), Labels, Carton")
    complaint_category: str = Field(description="Category of the defect, e.g. Product Defect - Discoloration, Packaging Defect, Labeling Error")
    complaint_description: str = Field(description="Formal 1-3 sentence QMS-style description of the complaint")
    severity: str = Field(description="Suggested severity: Critical, Major, Minor, or Negligible")
    suggested_action: str = Field(description="Recommended next action, e.g. Route to QA Investigation & Issue Replacement")
    risk_assessment: str = Field(description="Short initial risk rationale explaining the severity")

    # ===== BONUS FEATURES =====
    completeness_check: str = Field(
        description="Either 'Complete – all critical fields present' OR 'Incomplete – missing: Field1, Field2, ...'. "
                    "Critical fields are: Product Name, Batch Number, Affected Quantity, Complaint Description."
    )
    capa_recommendation: str = Field(
        description="3-5 short numbered Corrective & Preventive Actions (CAPA) tailored to this complaint. "
                    "Example format: '1. Quarantine remaining stock of the batch.\\n2. Investigate manufacturing process for discoloration.\\n3. Review packaging integrity.\\n4. Update relevant SOP if gap found.\\n5. Train operators on visual inspection.'"
    )


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    extraction: Optional[ComplaintExtraction]


# ---------- LLM (Groq) ----------
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=os.getenv("API KEY"),
)

structured_llm = llm.with_structured_output(ComplaintExtraction)


SYSTEM_PROMPT = """You are AIVOA, an expert pharmaceutical Quality Assurance copilot.

You have two modes:

1. **New Complaint / Document Extraction**
   - Extract all fields from the user's message or document.
   - Generate a formal complaint description and a reasoned risk assessment.
   - Always perform a Completeness Check and generate CAPA recommendations.

2. **Edit Complaint**
   - The user will give a correction or update (e.g. "Sorry, the batch number is BMX-240602 and affected quantity is 48 capsules").
   - You will receive the CURRENT complaint data.
   - Update ONLY the fields the user mentioned.
   - Keep ALL other fields exactly the same.
   - Re-evaluate severity / suggested_action / risk_assessment / completeness_check / capa_recommendation only if the change significantly affects them. Otherwise keep previous values.

Rules:
- Always return a complete ComplaintExtraction object.
- If a field is truly unknown, use "Not specified".
- Severity must be one of: Critical, Major, Minor, Negligible.
- Be precise and professional.
- For completeness_check: list any missing critical fields clearly.
- For capa_recommendation: always give practical, numbered CAPA steps.
"""


def extract_node(state: AgentState):
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        *state["messages"]
    ]
    result = structured_llm.invoke(messages)
    return {
        "extraction": result,
        "messages": [HumanMessage(content=f"Updated extraction: {result.model_dump_json()}")]
    }


# ---------- Graph ----------
workflow = StateGraph(AgentState)
workflow.add_node("extract", extract_node)
workflow.set_entry_point("extract")
workflow.add_edge("extract", END)

agent = workflow.compile()


def run_complaint_agent(user_message: str, current_data: dict | None = None) -> dict:
    """
    current_data = the current form values (can be empty for new complaint)
    """
    if current_data and any(v for v in current_data.values() if v):
        # Edit mode
        prompt = f"""CURRENT COMPLAINT DATA:
{json.dumps(current_data, indent=2)}

USER REQUEST (edit/update):
{user_message}

Update the complaint according to the user request. Preserve all fields that were not mentioned.
Also refresh completeness_check and capa_recommendation if needed.
"""
    else:
        # New complaint / document extraction
        prompt = f"""NEW COMPLAINT / DOCUMENT CONTENT:
{user_message}

Extract all relevant fields, generate the risk assessment, perform completeness check, and recommend CAPA.
"""

    result = agent.invoke({
        "messages": [HumanMessage(content=prompt)],
        "extraction": None
    })

    extraction: ComplaintExtraction = result["extraction"]

    data = {
        "complaint_source": extraction.complaint_source,
        "customer_name": extraction.customer_name,
        "product_name": extraction.product_name,
        "product_strength": extraction.product_strength,
        "batch_number": extraction.batch_number,
        "affected_quantity": extraction.affected_quantity,
        "manufacturing_date": extraction.manufacturing_date,
        "expiry_date": extraction.expiry_date,
        "site_block": extraction.site_block,
        "impacted_materials": extraction.impacted_materials,
        "complaint_category": extraction.complaint_category,
        "complaint_description": extraction.complaint_description,
        "severity": extraction.severity,
        "suggested_action": extraction.suggested_action,
        "risk_assessment": extraction.risk_assessment,
        # Bonus fields
        "completeness_check": extraction.completeness_check,
        "capa_recommendation": extraction.capa_recommendation,
    }

    # Nice chat reply
    if current_data and any(v for v in current_data.values() if v):
        chat_reply = (
            f"**Complaint updated successfully.**\n\n"
            f"I have applied your changes while preserving the rest of the information.\n\n"
            f"**Severity:** {extraction.severity}\n"
            f"**Suggested Action:** {extraction.suggested_action}\n\n"
            f"**Completeness:** {extraction.completeness_check}\n\n"
            f"**CAPA Recommendation:**\n{extraction.capa_recommendation}"
        )
    else:
        chat_reply = (
            f"**Complaint parsed successfully.**\n\n"
            f"**Customer:** {extraction.customer_name} ({extraction.complaint_source})\n"
            f"**Product:** {extraction.product_name} {extraction.product_strength}\n"
            f"**Batch:** {extraction.batch_number} | Qty: {extraction.affected_quantity}\n"
            f"**Category:** {extraction.complaint_category}\n\n"
            f"**Severity:** {extraction.severity}\n"
            f"**Suggested Action:** {extraction.suggested_action}\n\n"
            f"{extraction.risk_assessment}\n\n"
            f"**Completeness:** {extraction.completeness_check}\n\n"
            f"**CAPA Recommendation:**\n{extraction.capa_recommendation}"
        )

    data["chat_reply"] = chat_reply
    return data