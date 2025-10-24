import { z } from "zod";

export const CustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Customer phone is required"),
  email: z.string().email("Invalid email format"),
});

export const CreateReservationSchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  sectorId: z.string().min(1, "Sector ID is required"),
  partySize: z.number().int().positive("Party size must be a positive integer"),
  startDateTimeISO: z
    .string()
    .min(1, "Start datetime is required")
    .refine(
      (val) => {
        try {
          new Date(val);
          return !isNaN(new Date(val).getTime());
        } catch {
          return false;
        }
      },
      { message: "Invalid ISO 8601 datetime format" }
    ),
  customer: CustomerSchema,
  notes: z.string().optional(),
});

export const CheckAvailabilityQuerySchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  sectorId: z.string().min(1, "Sector ID is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  partySize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive("Party size must be a positive integer")),
});

export const ListReservationsQuerySchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  sectorId: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;
export type CheckAvailabilityQuery = z.infer<
  typeof CheckAvailabilityQuerySchema
>;
export type ListReservationsQuery = z.infer<typeof ListReservationsQuerySchema>;
