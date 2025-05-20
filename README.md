# Sydney Events Hub

A web application that automatically scrapes and displays events from Sydney, Australia.

## Features
- Automatic event scraping from multiple sources
- Beautiful event listings with details
- Email collection for ticket redirects
- Real-time updates

## Setup

### Backend Setup
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the backend:
```bash
cd backend
uvicorn main:app --reload
```

### Frontend Setup
1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

## Environment Variables
Create a `.env` file in the backend directory with:
```
DATABASE_URL=sqlite:///./events.db
SCRAPING_INTERVAL=3600  # in seconds
```

## Tech Stack
- Backend: FastAPI, SQLAlchemy, BeautifulSoup4
- Frontend: React, TypeScript, TailwindCSS
- Database: SQLite 