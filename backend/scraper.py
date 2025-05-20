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
            # Add other URLs later
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

            # Debug: write out the HTML
            domain = url.split("/")[2].replace(".", "_")
            with open(f"{domain}_soup.html", "w", encoding="utf-8") as f:
                f.write(soup.prettify())

            if "eventbrite" in url:
                selector = "div.Container_root__4i85v.NestedActionContainer_root__1jtfr.event-card"
                for element in soup.select(selector):
                    try:
                        link_tag = element.select_one("a.event-card-link")
                        source_id = link_tag["data-event-id"].strip() if link_tag and link_tag.has_attr("data-event-id") else ""

                        title_tag = element.select_one("a.event-card-link h3.event-card__clamp-line--two")
                        title = title_tag.get_text(strip=True) if title_tag else ""

                        ticket_url = link_tag["href"] if link_tag and link_tag.has_attr("href") else ""

                        info_tags = element.select("p.event-card__clamp-line--one")
                        if len(info_tags) >= 2:
                            raw_date_time = info_tags[0].get_text(strip=True)
                            venue = info_tags[1].get_text(strip=True)
                        else:
                            raw_date_time = ""
                            venue = ""

                        img_tag = element.select_one("img")
                        image_url = img_tag["src"] if img_tag and img_tag.has_attr("src") else ""

                        # NEW: print raw_date_time to verify
                        print(raw_date_time)

                        date_obj = self._parse_date_time(raw_date_time)

                        event = Event(
                            source_id=source_id,
                            title=title,
                            description="",
                            date=date_obj,
                            venue=venue,
                            image_url=image_url,
                            ticket_url=ticket_url,
                            source_url=url
                        )

                        events.append(event)
                        with open("scraped_events.jsonl", "a", encoding="utf-8") as fp:
                            data = event.dict(exclude_none=True, exclude={"id"})
                            fp.write(json.dumps(data, default=str) + "\n")

                    except Exception as e:
                        print(f"Error parsing Eventbrite card: {e}")

        return events


    def _parse_date_time(self, raw: str) -> Optional[datetime]:
        """
        Parse strings like:
          - "Tomorrow at 12:00 PM"
          - "Fri, May 28, 8:30 AM"
          - "Tue, Jun 10, 8:30 AM"
          - "Friday at 10:00 PM"
          - "Thursday at 6:30 PM"
          - "Sat, Jun 14, 2:00 PM"
        into a datetime (assuming current year). Returns None if parsing fails.
        """

        if not raw:
            return None
        # 1) Normalize “at” → comma, and bullets/pipes → comma
        normalized = (
            raw
            .replace(" at ", ", ")
            .replace("•", ",")
            .replace("·", ",")
            .replace("|", ",")
        )
        normalized = re.sub(r",\s*,+", ",", normalized).strip()

        # 2) Split on commas
        parts = [p.strip() for p in normalized.split(",") if p.strip()]

        # 3) Find the time portion
        time_part = None
        for p in parts:
            if re.search(r"\b\d{1,2}:\d{2}\s*[APap][Mm]\b", p):
                time_part = p
                break
        if not time_part:
            return None

        try:
            time_obj = datetime.strptime(time_part.upper(), "%I:%M %p").time()
        except ValueError:
            return None

        today_date = date.today()
        current_year = today_date.year

        # Helper for next weekday
        def next_weekday(curr: date, target_wd: int) -> date:
            today_wd = curr.weekday()
            days_ahead = (target_wd - today_wd + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            return curr + timedelta(days=days_ahead)

        # 4) FIRST: look for a month-day substring
        month_day_str = None
        for p in parts:
            if any(mon.lower() in p.lower() for mon in calendar.month_name if mon):
                month_day_str = p
                break
            if any(ab.lower() in p.lower() for ab in calendar.month_abbr if ab):
                month_day_str = p
                break

        if month_day_str:
            md = month_day_str.strip()
            year_match = re.search(r"\b(\d{4})\b", md)
            if year_match:
                try:
                    event_date = datetime.strptime(md, "%b %d %Y").date()
                except ValueError:
                    try:
                        event_date = datetime.strptime(md, "%B %d %Y").date()
                    except ValueError:
                        return None
            else:
                try:
                    event_date = datetime.strptime(f"{md} {current_year}", "%b %d %Y").date()
                except ValueError:
                    try:
                        event_date = datetime.strptime(f"{md} {current_year}", "%B %d %Y").date()
                    except ValueError:
                        return None

            return datetime.combine(event_date, time_obj)

        # 5) FALLBACK: today/tomorrow/weekday
        first_part = parts[0].lower()

        if "today" in first_part:
            event_date = today_date
        elif "tomorrow" in first_part:
            event_date = today_date + timedelta(days=1)
        else:
            weekdays_full = {name.lower(): idx for idx, name in enumerate(calendar.day_name)}
            weekdays_abbr = {name.lower(): idx for idx, name in enumerate(calendar.day_abbr)}

            if first_part in weekdays_full:
                target_wd = weekdays_full[first_part]
                event_date = next_weekday(today_date, target_wd)
            elif first_part in weekdays_abbr:
                target_wd = weekdays_abbr[first_part]
                event_date = next_weekday(today_date, target_wd)
            else:
                return None

        return datetime.combine(event_date, time_obj)
