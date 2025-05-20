from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def init_db():
    # Connect to MongoDB
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db = client.sydney_events
    
    # Clear existing collections
    await db.events.delete_many({})
    await db.email_submissions.delete_many({})
    
    # Sample events data
    sample_events = [
        {
            "title": "Sydney Opera House Concert",
            "description": "A spectacular evening of classical music at the iconic Sydney Opera House.",
            "date": datetime.now() + timedelta(days=7),
            "venue": "Sydney Opera House",
            "image_url": "https://example.com/opera.jpg",
            "ticket_url": "https://example.com/tickets/opera",
            "source_url": "https://example.com/events/opera"
        },
        {
            "title": "Bondi Beach Festival",
            "description": "Annual summer festival at Bondi Beach with live music and food stalls.",
            "date": datetime.now() + timedelta(days=14),
            "venue": "Bondi Beach",
            "image_url": "https://example.com/bondi.jpg",
            "ticket_url": "https://example.com/tickets/bondi",
            "source_url": "https://example.com/events/bondi"
        },
        {
            "title": "Darling Harbour Food Festival",
            "description": "Celebrate Sydney's diverse food culture with top chefs and restaurants.",
            "date": datetime.now() + timedelta(days=21),
            "venue": "Darling Harbour",
            "image_url": "https://example.com/food.jpg",
            "ticket_url": "https://example.com/tickets/food",
            "source_url": "https://example.com/events/food"
        }
    ]
    
    # Insert sample events
    await db.events.insert_many(sample_events)
    
    print("Database initialized with sample data!")
    print(f"Added {len(sample_events)} sample events")

if __name__ == "__main__":
    asyncio.run(init_db()) 