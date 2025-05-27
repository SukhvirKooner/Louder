from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
from models import Event
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
        self.db = self.client.sydney_events

        # Collections
        self.events_collection = self.db.events
        self.email_submissions_collection = self.db.email_submissions
        self.otps_collection = self.db.otps
        self.verified_emails_collection = self.db.verified_emails

    async def ensure_indexes(self):
        # Unique index on (email, event_id) in email_submissions
        await self.email_submissions_collection.create_index(
            [("email", 1), ("event_id", 1)],
            unique=True
        )

        # TTL index on OTPs (expire after 300 seconds)
        await self.otps_collection.create_index(
            [("created_at", 1)],
            expireAfterSeconds=300
        )

        # Unique index on verified_emails.email
        await self.verified_emails_collection.create_index(
            [("email", 1)],
            unique=True
        )

    async def get_all_events(self) -> List[Event]:
        events = []
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
        for event in events:
            event_data = event.dict(exclude_none=True, exclude={"id"})
            filter_query = {
                "source_url": event.source_url,
                "source_id": event.source_id
            }
            update_doc = {"$set": event_data}
            try:
                await self.events_collection.update_one(
                    filter_query, update_doc, upsert=True
                )
            except Exception as e:
                print(f"[Database.update_events] Failed to upsert {event.source_id}: {e}")

    # --- OTP & Verification Methods ---

    async def create_otp(self, email: str, otp: str, dob: str):
        await self.otps_collection.insert_one({
            "email": email,
            "otp": otp,
            "dob": dob,
            "created_at": datetime.utcnow()
        })

    async def verify_otp(self, email: str, otp: str, dob: str = None) -> bool:
        record = await self.otps_collection.find_one(
            {"email": email}, sort=[("created_at", -1)]
        )
        if not record:
            return False
        if (datetime.utcnow() - record["created_at"]).total_seconds() > 300:
            return False
        if record["otp"] != otp:
            return False
        await self.verified_emails_collection.update_one(
            {"email": email},
            {"$set": {"verified": True, "verified_at": datetime.utcnow(), "dob": dob or record.get("dob")}},
            upsert=True
        )
        return True

    async def is_email_verified(self, email: str) -> bool:
        doc = await self.verified_emails_collection.find_one({
            "email": email,
            "verified": True
        })
        return doc is not None

    async def save_email_submission(self, email: str, event_id: str):
        # Ensure email is verified first
        if not await self.is_email_verified(email):
            raise Exception("Email not verified")

        try:
            await self.email_submissions_collection.insert_one({
                "email": email,
                "event_id": event_id,
                "submitted_at": datetime.utcnow()
            })
        except Exception as e:
            if "duplicate key error" in str(e).lower():
                # Already subscribed; ignore
                return
            else:
                raise

    def close(self):
        self.client.close()
