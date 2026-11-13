import "dotenv/config";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";

const app = Fastify({ logger: true });
const prisma = new PrismaClient();

const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Copy .env.example to .env and configure it.");
}
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to a random string at least 32 characters long.");
}

const cookieSecure = process.env.COOKIE_SECURE === "true";
const cookieOptions = {
  path: "/",
  httpOnly: true,
  secure: cookieSecure,
  sameSite: "lax" as const,
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

app.register(cors, {
  origin: FRONTEND_ORIGIN,
  credentials: true,
});
app.register(cookie);
app.register(jwt, {
  secret: JWT_SECRET,
  sign: { expiresIn: "1h" },
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must contain at least 2 characters").max(80),
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z.string().min(8, "Password must contain at least 8 characters").max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").max(72),
});

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).optional().default(""),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional().default("TODO"),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.cookies.token;
    if (!token) {
      return reply.code(401).send({ message: "Please log in to continue." });
    }
    const decoded = app.jwt.verify<{ sub: string; email: string }>(token);
    request.user = decoded;
  } catch {
    return reply.code(401).send({ message: "Your session has expired. Please log in again." });
  }
}

function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie("token", token, {
    ...cookieOptions,
    maxAge: 60 * 60,
  });
}

app.get("/health", async () => ({ status: "ok" }));

app.post("/api/auth/register", async (request, reply) => {
  const parsed = registerSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const name = parsed.data.name;
  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    const token = app.jwt.sign({ sub: user.id, email: user.email });
    setAuthCookie(reply, token);
    return reply.code(201).send({ message: "Account created successfully.", user });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return reply.code(409).send({ message: "An account with this email already exists." });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Could not create account. Please try again." });
  }
});

app.post("/api/auth/login", async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return reply.code(401).send({ message: "Incorrect email or password." });
  }

  const token = app.jwt.sign({ sub: user.id, email: user.email });
  setAuthCookie(reply, token);
  return reply.send({
    message: "Login successful.",
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
  });
});

app.post("/api/auth/logout", { preHandler: requireAuth }, async (_request, reply) => {
  reply.clearCookie("token", { path: "/" });
  return reply.send({ message: "Logged out successfully." });
});

app.get("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) return reply.code(401).send({ message: "User account not found." });
  return reply.send({ user });
});

app.get("/api/tasks", { preHandler: requireAuth }, async (request) => {
  return prisma.task.findMany({
    where: { userId: request.user.sub },
    orderBy: { createdAt: "desc" },
  });
});

app.get<{ Params: { id: string } }>("/api/tasks/:id", { preHandler: requireAuth }, async (request, reply) => {
  const task = await prisma.task.findFirst({
    where: { id: request.params.id, userId: request.user.sub },
  });
  if (!task) return reply.code(404).send({ message: "Task not found." });
  return reply.send(task);
});

app.post("/api/tasks", { preHandler: requireAuth }, async (request, reply) => {
  const parsed = taskSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Invalid task" });
  }
  const task = await prisma.task.create({
    data: { ...parsed.data, userId: request.user.sub },
  });
  return reply.code(201).send(task);
});

app.patch<{ Params: { id: string } }>("/api/tasks/:id", { preHandler: requireAuth }, async (request, reply) => {
  const parsed = updateTaskSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Invalid task update" });
  }
  // Include the owner in the write condition as well as the lookup.
  // A user can never update another user's task by guessing its ID.
  const result = await prisma.task.updateMany({
    where: { id: request.params.id, userId: request.user.sub },
    data: parsed.data,
  });
  if (result.count === 0) return reply.code(404).send({ message: "Task not found." });
  const task = await prisma.task.findFirst({
    where: { id: request.params.id, userId: request.user.sub },
  });
  if (!task) return reply.code(404).send({ message: "Task not found." });
  return reply.send(task);
});

app.delete<{ Params: { id: string } }>("/api/tasks/:id", { preHandler: requireAuth }, async (request, reply) => {
  const existing = await prisma.task.findFirst({
    where: { id: request.params.id, userId: request.user.sub },
  });
  if (!existing) return reply.code(404).send({ message: "Task not found." });
  await prisma.task.delete({ where: { id: existing.id } });
  return reply.send({ message: "Task deleted." });
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error instanceof ZodError) return reply.code(400).send({ message: error.issues[0]?.message ?? "Invalid input" });
  return reply.code(500).send({ message: "Unexpected server error." });
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`API server running at http://localhost:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void start();
