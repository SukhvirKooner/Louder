import os
import asyncio
import random
import string

from datetime import datetime, timedelta
from fastapi.staticfiles import StaticFiles
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

from dotenv import load_dotenv
from scraper import EventScraper
from models import Event as EventModel  # Pydantic model from models.py

load_dotenv()

app = FastAPI(title="Louder")

# CORS middleware (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://louder-swart.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MongoDB client
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.sydney_events
events_collection = db.events
email_submissions_collection = db.email_submissions

# We also need two new collections:
otps_collection = db.otps
verified_emails_collection = db.verified_emails

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


async def init_db():
    """
    Initialize or re-create indexes on `email_submissions`, `otps`, and `verified_emails` collections.
    We will NOT drop the entire `email_submissions` collection here—only ensure unique indexes.
    """
    try:
        # Ensure `email_submissions` has a unique index on "email"
        await email_submissions_collection.create_index(
            [("email", 1)], unique=True
        )
        # Ensure `otps` has a TTL index on "created_at" so OTPs auto-expire after, say, 300 seconds (5 minutes)
        # Note: TTL index can only be set once, so ignoring exceptions if it already exists.
        await otps_collection.create_index(
            [("created_at", 1)],
            expireAfterSeconds=300  # auto-delete after 5 minutes
        )
        # Ensure `verified_emails` has a unique index on "email"
        await verified_emails_collection.create_index(
            [("email", 1)], unique=True
        )
        print("Database indexes ensured successfully.")
    except Exception as e:
        print(f"Error initializing database indexes: {e}")


class EmailSubmission(BaseModel):
    email: str


class OTPVerifyRequest(BaseModel):
    email: str
    otp: str


async def cleanup_past_events():
    """Remove events whose date < now."""
    try:
        current_time = datetime.utcnow()
        result = await events_collection.delete_many({"date": {"$lt": current_time}})
        print(f"[{datetime.utcnow().isoformat()}] Cleaned up {result.deleted_count} past events")
    except Exception as e:
        print(f"[{datetime.utcnow().isoformat()}] Error in cleanup_past_events: {e}")


async def update_events(events: List[EventModel]):
    """Upsert each event into MongoDB using source_id as unique key."""
    try:
        for event in events:
            event_dict = event.model_dump()
            event_dict.pop("id", None)
            await events_collection.update_one(
                {"source_id": event_dict["source_id"]},
                {"$set": event_dict},
                upsert=True
            )
    except Exception as e:
        print(f"[{datetime.utcnow().isoformat()}] Error updating events: {e}")
        raise e


async def periodic_tasks():
    """
    1) Scrape events
    2) Upsert into MongoDB
    3) Clean up past events
    4) Sleep for SCRAPING_INTERVAL seconds
    """
    interval = int(os.getenv("SCRAPING_INTERVAL", 3600))
    while True:
        try:
            scraper = EventScraper()
            events = await scraper.scrape_events()
            await update_events(events)
            print(f"[{datetime.utcnow().isoformat()}] Scraped and upserted {len(events)} events.")
            await cleanup_past_events()
        except Exception as e:
            print(f"[{datetime.utcnow().isoformat()}] Error in periodic_tasks: {e}")
        finally:
            await asyncio.sleep(interval)


@app.on_event("startup")
async def startup_event():
    await init_db()
    asyncio.create_task(periodic_tasks())


@app.get("/events")
async def get_events():
    try:
        current_time = datetime.utcnow()
        cursor = events_collection.find({"date": {"$gt": current_time}})
        events = await cursor.to_list(length=None)
        for event in events:
            event["id"] = str(event.pop("_id"))
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/events/{event_id}")
async def get_event(event_id: str):
    try:
        event = await events_collection.find_one({"_id": ObjectId(event_id)})
        if event:
            event["id"] = str(event.pop("_id"))
            return event
        raise HTTPException(status_code=404, detail="Event not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_otp(length: int = 6) -> str:
    """Create a random numeric OTP of the given length."""
    return ''.join(random.choices(string.digits, k=length))


async def send_email_otp(email: str, otp: str):
    """
    Send an OTP via SMTP. Uses environment vars for SMTP credentials.
    """
    try:
        subject = "Your LOUDER OTP Code"
        body = (
            f"Hello,\n\n"
            f"Your OTP for LOUDER is: {otp}\n"
            f"It will expire in 5 minutes.\n\n"
            f"Thanks,\nLOUDER Team"
        )

        msg = MIMEMultipart()
        msg["From"] = SMTP_EMAIL
        msg["To"] = email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, email, msg.as_string())
        server.quit()

        print(f"[OTP SENT] {otp} sent to {email}")
    except Exception as e:
        print(f"[ERROR] Failed to send OTP: {e}")


@app.post("/send-otp")
async def send_otp(payload: dict):
    """
    1) Validate email
    2) Generate OTP
    3) Store {email, otp, created_at} in otps_collection (with TTL index)
    4) Send OTP via email
    """
    email = payload.get("email")
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    # Generate and store OTP
    otp = generate_otp()
    await otps_collection.insert_one({
        "email": email,
        "otp": otp,
        "created_at": datetime.utcnow()
    })

    # Send it out
    await send_email_otp(email, otp)
    return {"message": "OTP sent to email"}


@app.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest):
    """
    1) Look up the latest OTP for this email
    2) If no record: error “No OTP sent”
    3) If OTP expired (> 5 minutes): error “OTP expired”
    4) If code mismatches: error “Invalid OTP”
    5) Otherwise: mark email as verified in verified_emails_collection
    """
    record = await otps_collection.find_one(
        {"email": request.email},
        sort=[("created_at", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="No OTP sent")

    # TTL index on `created_at` already ensures expired documents are gone after 5 minutes.
    # But in case TTL hasn't fired yet, we can double-check:
    if (datetime.utcnow() - record["created_at"]).total_seconds() > 300:
        raise HTTPException(status_code=400, detail="OTP expired")

    if record["otp"] != request.otp:
        raise HTTPException(status_code=401, detail="Invalid OTP")

    await verified_emails_collection.update_one(
        {"email": request.email},
        {"$set": {"verified": True, "verified_at": datetime.utcnow()}},
        upsert=True
    )
    return {"message": "OTP verified"}


@app.post("/submit-email")
async def submit_email(submission: EmailSubmission):
    """
    1) Validate email format
    2) Check if this email is marked as `verified` in verified_emails_collection
    3) If not verified → 403 "Email not verified"
    4) If verified, insert into email_submissions_collection (unless already there)
    """
    try:
        if "@" not in submission.email or "." not in submission.email:
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Check verification flag
        verified_doc = await verified_emails_collection.find_one(
            {"email": submission.email, "verified": True}
        )
        if not verified_doc:
            raise HTTPException(status_code=403, detail="Email not verified")

        # Now insert into `email_submissions_collection` if not already subscribed
        existing = await email_submissions_collection.find_one({"email": submission.email})
        if existing:
            return {"message": "Email already subscribed"}

        result = await email_submissions_collection.insert_one({
            "email": submission.email,
            "submitted_at": datetime.utcnow()
        })
        print(f"Successfully stored email subscription with ID: {result.inserted_id}")
        return {"message": "Email submitted successfully"}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in submit-email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit email")


@app.post("/scrape-now")
async def scrape_now():
    """
    Manually trigger one scrape+upsert cycle.
    """
    try:
        scraper = EventScraper()
        events = await scraper.scrape_events()
        await update_events(events)
        return {"message": f"Manually scraped {len(events)} events."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual scrape failed: {e}")


@app.post("/events/cleanup")
async def manual_cleanup():
    """Manually trigger cleanup of past events."""
    try:
        await cleanup_past_events()
        return {"message": "Cleanup completed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
