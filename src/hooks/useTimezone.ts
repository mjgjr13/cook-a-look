import { useState, useEffect } from "react";

// Get browser's timezone
export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

// Common timezones for selection
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Europe/Moscow", label: "Moscow (MSK)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { value: "UTC", label: "UTC" },
];

// Format time for display in a specific timezone
export const formatTimeInTimezone = (
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
    ...options,
  });
};

// Format date for display in a specific timezone
export const formatDateInTimezone = (
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    timeZone: timezone,
    ...options,
  });
};

// Get timezone abbreviation
export const getTimezoneAbbreviation = (timezone: string, date?: Date): string => {
  const d = date || new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  }).formatToParts(d);
  
  const tzPart = parts.find(p => p.type === "timeZoneName");
  return tzPart?.value || timezone;
};

// Get readable timezone name
export const getTimezoneLabel = (timezone: string): string => {
  const found = COMMON_TIMEZONES.find(tz => tz.value === timezone);
  if (found) return found.label;
  
  // Fallback: format the timezone string nicely
  return timezone.replace(/_/g, " ").replace(/\//g, " / ");
};

// Hook to get and track user's timezone
export const useTimezone = () => {
  const [timezone, setTimezone] = useState<string>(getBrowserTimezone());

  return {
    timezone,
    setTimezone,
    abbreviation: getTimezoneAbbreviation(timezone),
    label: getTimezoneLabel(timezone),
  };
};

export default useTimezone;
