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
        # Base URL for the “All Events in Sydney” listing (no page parameter here)
        self.sources = [
            "https://www.eventbrite.com/d/australia--sydney/all-events/"
            # You can add more sources (Moshtix, Ticketmaster) later, each with its own pagination logic.
        ]

    async def scrape_events(self) -> List[Event]:
        """
        Scrape all pages from each source until there are no more event cards.
        """
        events: List[Event] = []
        async with aiohttp.ClientSession() as session:
            for base_url in self.sources:
                try:
                    events.extend(await self._scrape_source(session, base_url))
                except Exception as e:
                    print(f"Error scraping {base_url}: {e}")
        return events

    async def _scrape_source(self, session: aiohttp.ClientSession, base_url: str) -> List[Event]:
        """
        Walk through paginated Eventbrite results for `base_url`.
        Stops when a page returns zero event cards.
        """
        events: List[Event] = []
        page_number = 1

        while True:
            # Construct the URL for this page (Eventbrite uses ?page=N)
            page_url = f"{base_url}?page={page_number}"
            async with session.get(page_url) as response:
                if response.status != 200:
                    print(f"Failed to load {page_url}, status: {response.status}")
                    break  # Stop pagination on HTTP error

                html = await response.text()
                soup = BeautifulSoup(html, "html.parser")

                # # (Optional) Write the prettified HTML to file for debugging each page
                # domain = base_url.split("/")[2].replace(".", "_")
                # with open(f"{domain}_page_{page_number}.html", "w", encoding="utf-8") as f:
                #     f.write(soup.prettify())

                # Selector for each Eventbrite “card” on the listing page:
                selector = "div.Container_root__4i85v.NestedActionContainer_root__1jtfr.event-card"
                card_elements = soup.select(selector)

                # If no event cards found, we’ve reached the end:
                if not card_elements:
                    break

                # Otherwise, parse each card on this page
                for element in card_elements:
                    try:
                        # 1) source_id (data-event-id on the <a> tag)
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
                        ticket_url = ""
                        if link_tag and link_tag.has_attr("href"):
                            ticket_url = link_tag["href"]

                        # 4) Date & Time + Venue (two <p> tags in sequence)
                        info_tags = element.select("p.event-card__clamp-line--one")
                        if len(info_tags) >= 2:
                            raw_date_time = info_tags[0].get_text(strip=True)
                            venue = info_tags[1].get_text(strip=True)
                        else:
                            raw_date_time = ""
                            venue = ""

                        # 5) Image URL (if present)
                        img_tag = element.select_one("img")
                        image_url = img_tag["src"] if (img_tag and img_tag.has_attr("src")) else ""

                        # Debug: show the raw date/time string
                        print(f"[Page {page_number}] raw_date_time:", raw_date_time)

                        # 6) Parse raw_date_time into a datetime object
                        date_obj = self._parse_date_time(raw_date_time)

                        # 7) Build the Event object
                        event = Event(
                            source_id=source_id,
                            title=title,
                            description="",
                            date=date_obj,
                            venue=venue,
                            image_url=image_url,
                            ticket_url=ticket_url,
                            source_url=base_url
                        )

                        # 8) Append to list and optionally write to JSONL
                        events.append(event)
                        with open("scraped_events.jsonl", "a", encoding="utf-8") as fp:
                            event_data = event.dict(exclude_none=True, exclude={"id"})
                            fp.write(json.dumps(event_data, default=str) + "\n")

                    except Exception as e:
                        print(f"Error parsing Eventbrite card on page {page_number}: {e}")
            # Move to next page
            page_number += 1

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

        # 1) Normalize “at” → comma, bullets/pipes → comma
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

        # 3) Find the “time” portion (e.g. "10:00 PM" or "8:30 AM")
        time_part = None
        for p in parts:
            if re.search(r"\b\d{1,2}:\d{2}\s*[APap][Mm]\b", p):
                time_part = p
                break
        if not time_part:
            return None

        # Parse the time into a time object
        try:
            time_obj = datetime.strptime(time_part.upper(), "%I:%M %p").time()
        except ValueError:
            return None

        today_date = date.today()
        current_year = today_date.year

        # Helper: next occurrence of a given weekday (0=Mon ... 6=Sun)
        def next_weekday(curr: date, target_wd: int) -> date:
            today_wd = curr.weekday()
            days_ahead = (target_wd - today_wd + 7) % 7
            if days_ahead == 0:
                days_ahead = 7  # skip today, move to next week
            return curr + timedelta(days=days_ahead)

        # 4) FIRST: attempt to find a “month-day” substring (e.g. "May 28", "Jun 10")
        month_day_str = None
        for p in parts:
            # check for full month names or abbreviations
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
                # parse "Jun 10 2025" or "June 10 2025"
                try:
                    event_date = datetime.strptime(md, "%b %d %Y").date()
                except ValueError:
                    try:
                        event_date = datetime.strptime(md, "%B %d %Y").date()
                    except ValueError:
                        return None
            else:
                # append current year (e.g. "Jun 10 2025" if current_year=2025)
                try:
                    event_date = datetime.strptime(f"{md} {current_year}", "%b %d %Y").date()
                except ValueError:
                    try:
                        event_date = datetime.strptime(f"{md} {current_year}", "%B %d %Y").date()
                    except ValueError:
                        return None

            return datetime.combine(event_date, time_obj)

        # 5) FALLBACK: “today”, “tomorrow”, or weekday logic
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
                # Unable to interpret date
                return None

        return datetime.combine(event_date, time_obj)
