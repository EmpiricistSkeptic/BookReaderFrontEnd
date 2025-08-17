// src/utils/formatNextReviewDate.js

import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
// Note: We've removed the Russian locale import. date-fns defaults to English.

export const formatNextReviewDate = (isoDateString) => {
    const reviewDate = new Date(isoDateString);
    const now = new Date();

    // If the review date has passed, the card is ready.
    if (reviewDate <= now) {
        return 'Ready for review';
    }

    // If the date is today (but in the future).
    if (isToday(reviewDate)) {
        return `Today at ${format(reviewDate, 'HH:mm')}`;
    }

    // If the date is tomorrow.
    if (isTomorrow(reviewDate)) {
        return `Tomorrow at ${format(reviewDate, 'HH:mm')}`;
    }
    
    // If the date is further in the future.
    // formatDistanceToNow with addSuffix will produce strings like "in 5 days", "in about a month", etc.
    return formatDistanceToNow(reviewDate, { addSuffix: true });
};