import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { writeQuery, transaction } from "@/lib/db";
import { z } from "zod";

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
});

export interface Agency {
  agency_id: string;
  name: string;
  email: string;
  created_at: string;
  last_login: string | null;
}

export interface AuthResult {
  success: boolean;
  agency?: Agency;
  error?: string;
  rateLimited?: boolean;
}

// Rate limiting configuration
const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5");
const RATE_LIMIT_WINDOW = parseInt(
  process.env.RATE_LIMIT_WINDOW_MINUTES || "15",
);
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION_HOURS || "24");

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher is more secure but slower
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Check rate limiting for login attempts
 */
export async function checkRateLimit(
  email: string,
  ipAddress: string,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW * 60 * 1000);

  const result = await writeQuery(
    `
    SELECT COUNT(*) as attempt_count
    FROM auth_attempts
    WHERE (email = $1 OR ip_address = $2)
    AND attempt_time > $3
    AND success = false
  `,
    [email, ipAddress, windowStart],
  );

  const attemptCount = parseInt(result.rows[0].attempt_count);
  return attemptCount < MAX_ATTEMPTS;
}

/**
 * Record login attempt
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean,
): Promise<void> {
  await writeQuery(
    `
    INSERT INTO auth_attempts (email, ip_address, success)
    VALUES ($1, $2, $3)
  `,
    [email, ipAddress, success],
  );
}

/**
 * Create a new agency session
 */
export async function createSession(
  agencyId: string,
  ipAddress: string,
  userAgent: string,
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 60 * 60 * 1000);

  const result = await writeQuery(
    `
    INSERT INTO agency_sessions (agency_id, expires_at, ip_address, user_agent)
    VALUES ($1, $2, $3, $4)
    RETURNING session_id
  `,
    [agencyId, expiresAt, ipAddress, userAgent],
  );

  const sessionId = result.rows[0].session_id;

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set("session", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });

  return sessionId;
}

/**
 * Validate and get session
 */
export async function getSession(): Promise<Agency | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (!sessionId) return null;

  const result = await writeQuery(
    `
    SELECT a.agency_id, a.name, a.email, a.created_at, a.last_login
    FROM agencies a
    JOIN agency_sessions s ON a.agency_id = s.agency_id
    WHERE s.session_id = $1 AND s.expires_at > NOW()
  `,
    [sessionId],
  );

  if (result.rows.length === 0) {
    // Clean up invalid session
    await destroySession();
    return null;
  }

  return result.rows[0];
}

/**
 * Destroy current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;

  if (sessionId) {
    await writeQuery(
      `
      DELETE FROM agency_sessions WHERE session_id = $1
    `,
      [sessionId],
    );
  }

  // Clear cookie
  cookieStore.delete("session");
}

/**
 * Login function
 */
export async function login(
  email: string,
  password: string,
  ipAddress: string,
  userAgent: string,
): Promise<AuthResult> {
  try {
    // Validate input
    const validatedData = loginSchema.parse({ email, password });

    // Check rate limiting
    const canAttempt = await checkRateLimit(email, ipAddress);
    if (!canAttempt) {
      return {
        success: false,
        error: "Too many login attempts. Please try again later.",
        rateLimited: true,
      };
    }

    // Get agency from database
    const result = await writeQuery(
      `
      SELECT agency_id, name, email, password_hash, created_at, last_login
      FROM agencies
      WHERE email = $1
    `,
      [validatedData.email],
    );

    if (result.rows.length === 0) {
      await recordLoginAttempt(email, ipAddress, false);
      return { success: false, error: "Invalid email or password" };
    }

    const agency = result.rows[0];

    // Verify password
    const passwordValid = await verifyPassword(
      validatedData.password,
      agency.password_hash,
    );

    if (!passwordValid) {
      await recordLoginAttempt(email, ipAddress, false);
      return { success: false, error: "Invalid email or password" };
    }

    // Success - create session and update last login
    await transaction([
      {
        text: "UPDATE agencies SET last_login = NOW() WHERE agency_id = $1",
        params: [agency.agency_id],
      },
    ]);

    await recordLoginAttempt(email, ipAddress, true);
    await createSession(agency.agency_id, ipAddress, userAgent);

    const { password_hash, ...safeAgency } = agency;
    return { success: true, agency: safeAgency };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "An error occurred during login" };
  }
}

/**
 * Register function
 */
export async function register(
  name: string,
  email: string,
  password: string,
  ipAddress: string,
  userAgent: string,
): Promise<AuthResult> {
  try {
    // Validate input
    const validatedData = registerSchema.parse({ name, email, password });

    // Check if email already exists
    const existingResult = await writeQuery(
      `
      SELECT agency_id FROM agencies WHERE email = $1
    `,
      [validatedData.email],
    );

    if (existingResult.rows.length > 0) {
      return { success: false, error: "Email already registered" };
    }

    // Hash password and create agency
    const passwordHash = await hashPassword(validatedData.password);

    const result = await writeQuery(
      `
      INSERT INTO agencies (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING agency_id, name, email, created_at
    `,
      [validatedData.name, validatedData.email, passwordHash],
    );

    const newAgency = result.rows[0];

    // Create session
    await createSession(newAgency.agency_id, ipAddress, userAgent);

    return { success: true, agency: newAgency };
  } catch (error) {
    console.error("Registration error:", error);
    return { success: false, error: "An error occurred during registration" };
  }
}

/**
 * Logout function
 */
export async function logout(): Promise<void> {
  await destroySession();
}
