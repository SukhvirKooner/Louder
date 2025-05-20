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
        """
        Fetches every document in the `events` collection and converts each
        to a Pydantic Event. The Event model should have fields like:
          - id: Optional[str]
          - title: str
          - description: str
          - date: Optional[datetime]
          - venue: str
          - image_url: str
          - ticket_url: str
          - source_url: str
        """
        events: List[Event] = []
        cursor = self.events_collection.find()
        async for document in cursor:
            # Convert MongoDB's ObjectId to a string for id
            events.append(Event(
                id=str(document["_id"]),
                title=document.get("title", ""),
                description=document.get("description", ""),
                date=document.get("date"),          # could be None or a datetime
                venue=document.get("venue", ""),
                image_url=document.get("image_url", ""),
                ticket_url=document.get("ticket_url", ""),
                source_url=document.get("source_url", "")
            ))
        return events

    async def update_events(self, events: List[Event]):
        """
        Clears the existing events collection, then inserts the provided list.
        We explicitly exclude the 'id' key so MongoDB can generate a fresh _id:
        """
        # 1) Remove all existing documents
        await self.events_collection.delete_many({})

        # 2) Insert each event without an explicit _id
        for event in events:
            # Convert the Pydantic Event into a dict,
            # excluding any fields whose value is None, and excluding 'id'
            event_data = event.dict(exclude_none=True, exclude={"id"})

            # Now just insert the dict; MongoDB will assign its own ObjectId
            try:
                await self.events_collection.insert_one(event_data)
            except Exception as e:
                print(f"Error inserting event into DB: {e}")

    async def save_email_submission(self, email: str, event_id: str):
        """
        Stores each email submission with the event_id they clicked.
        """
        submission = {
            "email": email,
            "event_id": event_id,
            "submitted_at": datetime.utcnow()
        }
        try:
            await self.email_submissions_collection.insert_one(submission)
        except Exception as e:
            print(f"Error saving email submission: {e}")
