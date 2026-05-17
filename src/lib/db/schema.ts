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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "late",
  "absent",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  role: roleEnum("role").notNull().default("student"),
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