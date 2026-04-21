const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 5 * 60 + 30;

const istDatePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const istHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIMEZONE,
  hour: '2-digit',
  hour12: false,
});

const istMinuteFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIMEZONE,
  minute: '2-digit',
});

const istDayLabelFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  month: 'short',
  day: 'numeric',
});

const istWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIMEZONE,
  weekday: 'short',
});

const getFormattedPart = (
  formatter: Intl.DateTimeFormat,
  date: Date,
  type: Intl.DateTimeFormatPartTypes
): string => {
  const part = formatter.formatToParts(date).find((entry) => entry.type === type)?.value;
  if (!part) {
    throw new Error(`Missing ${type} part for IST date formatting.`);
  }
  return part;
};

const getISTDateParts = (date: Date) => ({
  year: Number(getFormattedPart(istDatePartsFormatter, date, 'year')),
  month: Number(getFormattedPart(istDatePartsFormatter, date, 'month')),
  day: Number(getFormattedPart(istDatePartsFormatter, date, 'day')),
});

export const toISTDateString = (date: Date): string => {
  const { year, month, day } = getISTDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const toISTHour = (date: Date): number => {
  return Number(getFormattedPart(istHourFormatter, date, 'hour'));
};

export const toISTMinute = (date: Date): number => {
  return Number(getFormattedPart(istMinuteFormatter, date, 'minute'));
};

export const formatISTDayLabel = (date: Date): string => {
  return istDayLabelFormatter.format(date);
};

export const formatISTWeekday = (date: Date): string => {
  return istWeekdayFormatter.format(date);
};

export const getISTStartOfDay = (date: Date): Date => {
  const { year, month, day } = getISTDateParts(date);
  const utcMillis = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
};

export const getISTNextMidnight = (date: Date): Date => {
  return new Date(getISTStartOfDay(date).getTime() + 24 * 60 * 60 * 1000);
};
