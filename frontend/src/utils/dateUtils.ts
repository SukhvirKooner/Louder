export const formatDate = (dateString: string) => {
  try {
    // Handle relative dates (e.g., "Tomorrow at 12:00 PM")
    if (dateString.toLowerCase().includes('tomorrow') || 
        dateString.toLowerCase().includes('today') ||
        dateString.toLowerCase().includes('saturday') ||
        dateString.toLowerCase().includes('friday')) {
      return dateString;
    }

    // Handle absolute dates (e.g., "Wed, May 28, 8:30 AM")
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString);
      return 'Invalid date';
    }

    return date.toLocaleString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (err) {
    console.error('Error formatting date:', err, 'Date string:', dateString);
    return 'Date format error';
  }
}; 