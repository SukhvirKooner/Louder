from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class Event(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    title: str
    description: str
    date: Optional[datetime] 
    venue: str
    image_url: str
    ticket_url: str
    source_url: str

    class Config:
        json_encoders = {ObjectId: str}
        populate_by_name = True
        arbitrary_types_allowed = True 