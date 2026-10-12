import { z } from 'zod';

export const holidaySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  name: z.string().trim().min(1, 'Name is required'),
});

export type HolidayInput = z.infer<typeof holidaySchema>;
