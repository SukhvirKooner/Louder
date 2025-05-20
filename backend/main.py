import os
import asyncio
from datetime import datetime

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional

from dotenv import load_dotenv

from scraper import EventScraper
from database import Database
from models import Event as EventModel  # Pydantic model from models.py

load_dotenv()

app = FastAPI(title="Sydney Events Hub")

# CORS middleware (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()


#
# Pydantic schema for incoming email submissions.
# Note: event_id is now a string (e.g. the source_id or the MongoDB _id as a string).
#
class EmailSubmission(BaseModel):
    email: EmailStr
    event_id: str


async def periodic_scraping():
    """
    Runs an infinite loop that:
      1) Scrapes events
      2) Upserts them into MongoDB
      3) Sleeps for SCRAPING_INTERVAL seconds
    On startup, we kick this off so the first scrape happens immediately.
    """
    interval = int(os.getenv("SCRAPING_INTERVAL", 3600))  # seconds
    while True:
        try:
            scraper = EventScraper()
            events = await scraper.scrape_events()
            await db.update_events(events)
            print(f"[{datetime.utcnow().isoformat()}] Scraped and upserted {len(events)} events.")
        except Exception as e:
            # Log the error but keep the loop running
            print(f"[{datetime.utcnow().isoformat()}] Error in periodic_scraping: {e}")
        finally:
            await asyncio.sleep(interval)


@app.on_event("startup")
async def startup_event():
    """
    When the app starts, launch the background scraping task.
    """
    # Start the periodic_scraping task, but do not await it here.
    asyncio.create_task(periodic_scraping())


@app.get("/events", response_model=List[EventModel])
async def get_events():
    """
    Returns all events currently in the database, in the exact Pydantic schema
    defined in models.py (which includes id, source_id, title, date, etc.).
    """
    try:
        return await db.get_all_events()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get events: {e}")


@app.post("/submit-email")
async def submit_email(submission: EmailSubmission):
    """
    Accepts an email and an event_id (string). Stores it in the 'email_submissions'
    collection along with a timestamp.
    """
    try:
        await db.save_email_submission(submission.email, submission.event_id)
        return {"message": "Email submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/scrape-now")
async def scrape_now():
    """
    Manually trigger one scrape+upsert cycle. Returns how many events were fetched.
    """
    try:
        scraper = EventScraper()
        events = await scraper.scrape_events()
        await db.update_events(events)
        return {"message": f"Manually scraped {len(events)} events."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Manual scrape failed: {e}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
