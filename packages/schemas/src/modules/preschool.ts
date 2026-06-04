import { z } from 'zod';
import { field } from '../envelope.js';

/** An OCFS filing (license renewal, plan of correction, …). */
export const ocfsFilingZ = z.object({
  type: z.string(),
  date: z.string().optional(),
  status: z.string().optional(),
});

/** An OCFS inspection record. */
export const ocfsInspectionZ = z.object({
  date: z.string().optional(),
  result: z.string().optional(),
  notes: z.string().optional(),
});

/** A required training and its status for one staff member. */
export const trainingZ = z.object({
  name: z.string(),
  status: z.string().optional(),
  expires: z.string().optional(),
});

/** One row of the NYS training matrix — a staff member and their trainings. */
export const trainingRowZ = z.object({
  staffName: z.string(),
  role: z.string().optional(),
  requiredTrainings: z.array(trainingZ).optional(),
});

/** Licensed capacity and enrollment for one age group. */
export const ageGroupCapacityZ = z.object({
  ageGroup: z.string(),
  licensedCapacity: z.number().optional(),
  currentEnrollment: z.number().optional(),
  waitlist: z.number().optional(),
});

/** An entry on the annual calendar. */
export const calendarEntryZ = z.object({
  label: z.string(),
  date: z.string().optional(),
  type: z.string().optional(),
});

/**
 * Preschool module — the first concrete industry module (Little Friends).
 * `ocfs`, `trainingMatrix`, `immunizationPolicy`, and `enrollmentCapacity` are
 * HV (compliance / capacity), gated via the registry in hv.ts. Leaves are
 * envelope-wrapped like core sections (spec §6). Exact sub-fields are
 * transcribed from the Little Friends proposal during fill, marked
 * `[NEEDS CONFIRMATION]` in the fixture where the proposal is silent.
 */
export const preschoolModuleZ = z
  .object({
    ocfs: z.object({
      licenseStatus: field(z.string()), // HV
      licenseNumber: field(z.string()), // HV
      filings: field(z.array(ocfsFilingZ)), // HV
      inspectionHistory: field(z.array(ocfsInspectionZ)), // HV
    }).optional(),
    trainingMatrix: field(z.array(trainingRowZ)), // HV
    immunizationPolicy: field(z.string()), // HV
    enrollmentCapacity: field(z.array(ageGroupCapacityZ)), // HV
    annualCalendar: field(z.array(calendarEntryZ)),
    parentHandbook: field(
      z.object({
        policies: z.array(z.string()).optional(),
        hours: z.string().optional(),
        tuitionRef: z.string().optional(),
        communicationNorms: z.string().optional(),
      }),
    ),
    adminRunbook: field(
      z.object({
        openingClosing: z.string().optional(),
        staffingRules: z.string().optional(),
        emergencyProcedures: z.string().optional(),
      }),
    ),
  })
  .passthrough();

export type PreschoolModule = z.infer<typeof preschoolModuleZ>;
