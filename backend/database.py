from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from typing import List, Optional
from models import Event
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.client = AsyncIOMotorClient(
            os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        )
        self.db = self.client.sydney_events
        self.events_collection = self.db.events
        self.email_submissions_collection = self.db.email_submissions

    async def get_all_events(self) -> List[Event]:
        events: List[Event] = []
        cursor = self.events_collection.find()
        async for document in cursor:
            events.append(Event(
                id=str(document["_id"]),
                source_id=document.get("source_id", ""),
                title=document.get("title", ""),
                description=document.get("description", ""),
                date=document.get("date"),
                venue=document.get("venue", ""),
                image_url=document.get("image_url", ""),
                ticket_url=document.get("ticket_url", ""),
                source_url=document.get("source_url", "")
            ))
        return events

    async def update_events(self, events: List[Event]):
        """
        Upsert each event based on (source_url, source_id). If an event
        already exists for that source_id at that URL, skip. Otherwise, insert.
        """
        for event in events:
            # Convert Event to dict, dropping None fields and no 'id'
            event_data = event.dict(exclude_none=True, exclude={"id"})

            filter_query = {
                "source_url": event.source_url,
                "source_id": event.source_id
            }

            update_doc = {"$setOnInsert": event_data}

            try:
                # This will insert a new document if no existing match is found.
                await self.events_collection.update_one(
                    filter_query,
                    update_doc,
                    upsert=True
                )
            except Exception as e:
                print(f"[Database.update_events] Error upserting event {event.source_id}: {e}")

    async def save_email_submission(self, email: str, event_id: str):
        submission = {
            "email": email,
            "event_id": event_id,
            "submitted_at": datetime.utcnow()
        }
        try:
            await self.email_submissions_collection.insert_one(submission)
        except Exception as e:
            print(f"[Database.save_email_submission] Error: {e}")

    def close(self):
        self.client.close()
