export interface Availability {
  day: string;
  startTime: string;
  endTime: string;
  enabled?: boolean;
}

export interface Blockout {
  title: string;
  day: string; // For UI grouping only
  startDate?: string;
  endDate?: string;
  startTime?: string; // Kept for compatibility, but should be removed later
  endTime?: string; // Kept for compatibility, but should be removed later
  is_recurring?: boolean | string;
}