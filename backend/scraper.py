import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime, date, timedelta
from typing import List, Optional
from models import Event
import json
import calendar
import re

class EventScraper:
    def __init__(self):
        self.sources = [
            "https://www.eventbrite.com/d/australia--sydney/all-events/"
            # Add Moshtix and Ticketmaster URLs here when ready
        ]

    async def scrape_events(self) -> List[Event]:
        events: List[Event] = []
        async with aiohttp.ClientSession() as session:
            for source in self.sources:
                try:
                    events.extend(await self._scrape_source(session, source))
                except Exception as e:
                    print(f"Error scraping {source}: {e}")
        return events

    async def _scrape_source(self, session: aiohttp.ClientSession, url: str) -> List[Event]:
        events: List[Event] = []
        async with session.get(url) as response:
            if response.status != 200:
                print(f"Failed to load {url}, status: {response.status}")
                return events

            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')

            # Optionally write prettified HTML to file (for debugging)
            domain = url.split("/")[2].replace(".", "_")
            with open(f"{domain}_soup.html", "w", encoding="utf-8") as f:
                f.write(soup.prettify())

            # --- EVENTBRITE scraping logic ---
            if "eventbrite" in url:
                selector = "div.Container_root__4i85v.NestedActionContainer_root__1jtfr.event-card"
                for element in soup.select(selector):
                    try:
                        # 1) source_id (data-event-id on <a class="event-card-link">)
                        link_tag = element.select_one("a.event-card-link")
                        source_id = ""
                        if link_tag and link_tag.has_attr("data-event-id"):
                            source_id = link_tag["data-event-id"].strip()

                        # 2) Title
                        title_tag = element.select_one(
                            "a.event-card-link h3.event-card__clamp-line--two"
                        )
                        title = title_tag.get_text(strip=True) if title_tag else ""

                        # 3) Ticket URL
                        ticket_url = link_tag["href"] if link_tag and link_tag.has_attr("href") else ""

                        # 4) Date & Time + Venue
                        info_tags = element.select("p.event-card__clamp-line--one")
                        if len(info_tags) >= 2:
                            raw_date_time = info_tags[0].get_text(strip=True)
                            venue = info_tags[1].get_text(strip=True)
                        else:
                            raw_date_time = ""
                            venue = ""

                        # 5) Image URL (if any)
                        img_tag = element.select_one("img")
                        image_url = img_tag["src"] if img_tag and img_tag.has_attr("src") else ""

                        # 6) Parse raw_date_time into a datetime
                        date_obj = self._parse_date_time(raw_date_time)

                        # 7) Build the Event object
                        event = Event(
                            source_id=source_id,          # ← new field
                            title=title,
                            description="",
                            date=date_obj,
                            venue=venue,
                            image_url=image_url,
                            ticket_url=ticket_url,
                            source_url=url
                        )

                        # 8) Append to list and write to JSONL
                        events.append(event)
                        print(f"Scraped event: {source_id} – {title}")

                        with open("scraped_events.jsonl", "a", encoding="utf-8") as fp:
                            event_data = event.dict(exclude_none=True, exclude={"id"})
                            fp.write(json.dumps(event_data, default=str) + "\n")

                    except Exception as e:
                        print(f"Error parsing Eventbrite card: {e}")

            # --- (placeholders for Moshtix, Ticketmaster) ---
            # elif "moshtix" in url:
            #     ...
            # elif "ticketmaster" in url:
            #     ...
        return events

    def _parse_date_time(self, raw: str) -> Optional[datetime]:
        """
        Parses strings like:
          - "Fri, May 28, 8:30 PM"
          - "May 28, 8:30 PM"
          - "Tomorrow, 8:30 PM"
          - "Friday, 8:30 PM"
        into a datetime (assuming current year). Returns None on failure.
        """
        raw = raw.strip()
        if not raw:
            return None

        # Split on commas, last part is the time
        parts = [p.strip() for p in raw.split(",")]
        time_part = parts[-1]  # e.g. "8:30 PM"
        # Parse time portion
        try:
            time_obj = datetime.strptime(time_part, "%I:%M %p").time()
        except ValueError:
            return None

        today_date = date.today()
        current_year = today_date.year

        def next_weekday(target_wd: int) -> date:
            today_wd = today_date.weekday()
            days_ahead = (target_wd - today_wd + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            return today_date + timedelta(days=days_ahead)

        first_part = parts[0].lower()

        # 1) “today, 8:30 PM”
        if "today" in first_part:
            event_date = today_date

        # 2) “tomorrow, 8:30 PM”
        elif "tomorrow" in first_part:
            event_date = today_date + timedelta(days=1)

        else:
            # 3) Check if first_part is a weekday name or abbreviation
            # Build mapping of full weekday names and abbreviations
            weekdays_full = {name.lower(): idx for idx, name in enumerate(calendar.day_name)}
            weekdays_abbr = {name.lower(): idx for idx, name in enumerate(calendar.day_abbr)}

            if first_part in weekdays_full:
                target_wd = weekdays_full[first_part]
                event_date = next_weekday(target_wd)

            elif first_part in weekdays_abbr:
                target_wd = weekdays_abbr[first_part]
                event_date = next_weekday(target_wd)

            else:
                # Look for a "Month day" substring
                month_day_part = None
                for p in parts:
                    if any(mon.lower() in p.lower() for mon in calendar.month_name if mon):
                        month_day_part = p
                        break

                if not month_day_part:
                    return None

                # Try parsing "May 28" or "May 28" + current_year
                try:
                    event_date = datetime.strptime(f"{month_day_part} {current_year}", "%b %d %Y").date()
                except ValueError:
                    try:
                        event_date = datetime.strptime(f"{month_day_part} {current_year}", "%B %d %Y").date()
                    except ValueError:
                        return None

        # Combine date and time into a single datetime
        return datetime.combine(event_date, time_obj)
