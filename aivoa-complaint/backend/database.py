from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")   # ← fixed here

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Check your .env file.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_source = Column(String(100))
    customer_name = Column(String(255))
    product_name = Column(String(255))
    product_strength = Column(String(100))
    batch_number = Column(String(100))
    affected_quantity = Column(String(100))
    manufacturing_date = Column(String(100))
    expiry_date = Column(String(100))
    site_block = Column(String(100))
    impacted_materials = Column(String(255))
    complaint_category = Column(String(255))
    complaint_description = Column(Text)
    severity = Column(String(50))
    suggested_action = Column(String(255))
    risk_assessment = Column(Text)
    completeness_check = Column(String(255))
    capa_recommendation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()