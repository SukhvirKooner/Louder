import os
import asyncio
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from dotenv import load_dotenv

from scraper import EventScraper
from models import Event as EventModel  # Pydantic model from models.py

load_dotenv()

app = FastAPI(title="Louder")

# CORS middleware (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.sydney_events
events_collection = db.events
email_submissions_collection = db.email_submissions

# Create indexes for email submissions
async def init_db():
    try:
        # Drop existing indexes and collection
        await email_submissions_collection.drop_indexes()
        await email_submissions_collection.drop()
        
        # Create new collection with unique index on email
        await email_submissions_collection.create_index(
            [("email", 1)],
            unique=True
        )
        print("Database initialized successfully")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")

#
# Pydantic schema for incoming email submissions.
# Note: event_id is now a string (e.g. the source_id or the MongoDB _id as a string).
#
class EmailSubmission(BaseModel):
    email: str


async def cleanup_past_events():
    """Clean up past events from the database."""
    try:
        current_time = datetime.utcnow()
        result = await events_collection.delete_many({"date": {"$lt": current_time}})
        print(f"[{datetime.utcnow().isoformat()}] Cleaned up {result.deleted_count} past events")
    except Exception as e:
        print(f"[{datetime.utcnow().isoformat()}] Error in cleanup_past_events: {e}")


async def update_events(events: List[EventModel]):
    """Update events in the database."""
    try:
        for event in events:
            # Convert Pydantic model to dict and remove id field
            event_dict = event.model_dump()
            if "id" in event_dict:
                del event_dict["id"]
            
            # Use source_id as the unique identifier for upsert
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
    Runs an infinite loop that:
      1) Scrapes events
      2) Upserts them into MongoDB
      3) Cleans up past events
      4) Sleeps for SCRAPING_INTERVAL seconds
    """
    interval = int(os.getenv("SCRAPING_INTERVAL", 3600))  # seconds
    while True:
        try:
            # Scrape new events
            scraper = EventScraper()
            events = await scraper.scrape_events()
            await update_events(events)
            print(f"[{datetime.utcnow().isoformat()}] Scraped and upserted {len(events)} events.")

            # Clean up past events
            await cleanup_past_events()

        except Exception as e:
            print(f"[{datetime.utcnow().isoformat()}] Error in periodic_tasks: {e}")
        finally:
            await asyncio.sleep(interval)


@app.on_event("startup")
async def startup_event():
    """
    When the app starts, initialize the database and launch background tasks.
    """
    await init_db()
    asyncio.create_task(periodic_tasks())


@app.get("/events")
async def get_events():
    try:
        # Get current time in UTC
        current_time = datetime.utcnow()
        
        # Find all events and filter out past events
        cursor = events_collection.find({"date": {"$gt": current_time}})
        events = await cursor.to_list(length=None)
        
        # Convert ObjectId to string for JSON serialization
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


@app.post("/submit-email")
async def submit_email(submission: EmailSubmission):
    """
    Accepts an email and stores it in the 'email_submissions' collection.
    """
    try:
        # Basic email validation
        if not '@' in submission.email or not '.' in submission.email:
            raise HTTPException(status_code=400, detail="Invalid email format")

        print(f"Received email submission: {submission.email}")
        
        # Check if email already exists
        existing_submission = await email_submissions_collection.find_one({
            "email": submission.email
        })

        if existing_submission:
            print(f"Email {submission.email} already subscribed")
            return {"message": "Email already subscribed"}

        # Insert new submission
        result = await email_submissions_collection.insert_one({
            "email": submission.email,
            "submitted_at": datetime.utcnow()
        })
        
        print(f"Successfully stored email submission with ID: {result.inserted_id}")
        return {"message": "Email submitted successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error submitting email: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/scrape-now")
async def scrape_now():
    """
    Manually trigger one scrape+upsert cycle. Returns how many events were fetched.
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
