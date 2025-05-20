from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import uvicorn
from scraper import EventScraper
from database import Database
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Sydney Events Hub")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()

# Models
class Event(BaseModel):
    id: Optional[int]
    title: str
    description: str
    date: datetime
    venue: str
    image_url: str
    ticket_url: str
    source_url: str

class EmailSubmission(BaseModel):
    email: EmailStr
    event_id: int

# Background task for periodic scraping
async def periodic_scraping():
    while True:
        scraper = EventScraper()
        events = await scraper.scrape_events()
        await db.update_events(events)
        await asyncio.sleep(int(os.getenv("SCRAPING_INTERVAL", 3600)))

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_scraping())

@app.get("/events", response_model=List[Event])
async def get_events():
    return await db.get_all_events()

@app.post("/submit-email")
async def submit_email(submission: EmailSubmission):
    try:
        await db.save_email_submission(submission.email, submission.event_id)
        return {"message": "Email submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 