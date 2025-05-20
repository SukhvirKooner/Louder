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
    

if __name__ == "__main__":
    asyncio.run(init_db()) 