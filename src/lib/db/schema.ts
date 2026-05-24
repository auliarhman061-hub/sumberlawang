import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  text,
  date,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "absent",
  "izin",
  "sakit",
]);
export const subjectTypeEnum = pgEnum("subject_type", ["wajib", "pilihan"]);
export const absenceTypeEnum = pgEnum("absence_type", ["izin", "sakit"]);
export const absenceStatusEnum = pgEnum("absence_status", ["pending", "approved", "rejected"]);
export const dayEnum = pgEnum("day", ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkId: varchar("clerk_id", { length: 255 }).unique(), // nullable sementara untuk migrasi
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: text("password_hash"), // nullable sementara, akan jadi notNull setelah migrasi selesai
  role: roleEnum("role").notNull().default("student"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(),
  grade: integer("grade").notNull(),
  teacherId: uuid("teacher_id").references(() => users.id),
  academicYear: varchar("academic_year", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const students = pgTable("students", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  nis: varchar("nis", { length: 20 }).unique().notNull(),
  classId: uuid("class_id").references(() => classes.id),
  rfidUid: varchar("rfid_uid", { length: 50 }).unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }),
  apiKey: varchar("api_key", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastPing: timestamp("last_ping"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .references(() => students.id)
      .notNull(),
    tapTime: timestamp("tap_time").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    deviceId: varchar("device_id", { length: 50 }).references(
      () => devices.id
    ),
    overrideBy: uuid("override_by").references(() => users.id),
    overrideAt: timestamp("override_at"),
    notes: text("notes"),
    date: date("date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    dateIdx: index("idx_attendance_date").on(table.date),
    studentDateIdx: index("idx_attendance_student_date").on(
      table.studentId,
      table.date
    ),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type NewAttendanceLog = typeof attendanceLogs.$inferInsert;

// ── subjects ────────────────────────────────────────
export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 20 }),
  type: subjectTypeEnum("type").default("wajib"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

// ── school_hours ─────────────────────────────────────
export const schoolHours = pgTable("school_hours", {
  id: integer("id").primaryKey().default(1),
  openTime: varchar("open_time", { length: 5 }).notNull().default("06:00"),
  lateThreshold: varchar("late_threshold", { length: 5 }).notNull().default("07:00"),
  closeTime: varchar("close_time", { length: 5 }).notNull().default("16:00"),
  periods: integer("periods").notNull().default(8),
  periodMinutes: integer("period_minutes").notNull().default(45),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export type SchoolHours = typeof schoolHours.$inferSelect;
export type NewSchoolHours = typeof schoolHours.$inferInsert;

// ── schedules ─────────────────────────────────────────
export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    day: dayEnum("day").notNull(),
    period: integer("period").notNull(),
    subjectId: uuid("subject_id")
      .references(() => subjects.id)
      .notNull(),
    classId: uuid("class_id")
      .references(() => classes.id)
      .notNull(),
    teacherId: uuid("teacher_id")
      .references(() => users.id)
      .notNull(),
    academicYear: varchar("academic_year", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSchedule: unique("unique_schedule").on(
      table.day,
      table.period,
      table.classId,
      table.academicYear
    ),
    classDayIdx: index("idx_schedules_class_day").on(table.classId, table.day),
    teacherIdx: index("idx_schedules_teacher").on(table.teacherId),
  })
);

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;

// ── absence_requests ──────────────────────────────────
export const absenceRequests = pgTable(
  "absence_requests",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid("student_id")
      .references(() => students.id)
      .notNull(),
    date: date("date").notNull(),
    type: absenceTypeEnum("type").notNull(),
    reason: text("reason"),
    requestedBy: uuid("requested_by")
      .references(() => users.id)
      .notNull(),
    status: absenceStatusEnum("status").default("approved").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueStudentDate: unique("unique_absence").on(table.studentId, table.date),
    studentDateIdx: index("idx_absences_student_date").on(table.studentId, table.date),
  })
);

export type AbsenceRequest = typeof absenceRequests.$inferSelect;
export type NewAbsenceRequest = typeof absenceRequests.$inferInsert;

// ── sessions ──────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: varchar("token", { length: 64 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;