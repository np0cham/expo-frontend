import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./prisma/generated/prisma/client";

type ResolverEvent = {
  fieldName?: string;
  arguments?: Record<string, any>;
  identity?: {
    sub?: string;
    claims?: {
      sub?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
};

const secretsManager = new SecretsManagerClient({
  region: process.env.DB_REGION ?? "ap-northeast-1",
});

const getDatabaseUrl = async () => {
  const secret = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: process.env.SECRET_NAME }),
  );

  if (!secret.SecretString) {
    throw new Error("SecretString is empty");
  }

  const { username, password, host, port, dbname } = JSON.parse(
    secret.SecretString,
  );

  console.log("Database connection info:", {
    username,
    host,
    port: port ?? 5432,
    dbname,
  });

  // Use sslmode=no-verify to accept self-signed certificates
  const connectionString = `postgresql://${username}:${encodeURIComponent(password)}@${host}:${port ?? 5432}/${dbname}?sslmode=no-verify`;
  console.log("Connection string:", connectionString.replace(password, "***"));
  
  return connectionString;
};

const createPrismaClient = async () => {
  const databaseUrl = await getDatabaseUrl();
  console.log("Creating new Prisma client with SSL options");
  
  const adapter = new PrismaPg({ 
    connectionString: databaseUrl,
  });

  const client = new PrismaClient({
    adapter,
    log: ['query', 'error', 'warn'],
  });

  return client;
};

const disconnectPrisma = async (prisma: PrismaClient) => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error disconnecting Prisma:", error);
  }
};

const getCurrentUserId = (event: ResolverEvent): string => {
  const userId =
    event.identity?.claims?.sub ?? event.identity?.sub ?? undefined;

  if (!userId) {
    throw new Error("Unauthorized: Cognito user id is missing");
  }

  return userId;
};

const toQuestionOutput = (question: {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  attachments: string[];
  showUsername: boolean;
  category: unknown;
}) => ({
  ...question,
  createdAt: question.createdAt.toISOString(),
  updatedAt: question.updatedAt.toISOString(),
  category: String(question.category),
});

const toCommentOutput = (comment: {
  id: string;
  questionId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  attachments: string[];
  showUsername: boolean;
  parentCommentId?: string | null;
}) => ({
  ...comment,
  createdAt: comment.createdAt.toISOString(),
  updatedAt: comment.updatedAt.toISOString(),
  parentCommentId: comment.parentCommentId ?? undefined,
});

const listDbUserProfiles = async () => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.userProfile.findMany({
      orderBy: { name: "asc" },
      take: 100,
      select: {
        id: true,
        name: true,
        age: true,
        bio: true,
        instruments: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const listDbArtists = async () => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.artist.findMany({
      orderBy: { name: "asc" },
      take: 50,
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const listDbLikeArtists = async () => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.likeArtist.findMany({
      take: 100,
      select: {
        id: true,
        userId: true,
        artistId: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const listDbQuestions = async () => {
  const prisma = await createPrismaClient();

  try {
    const questions = await prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        showUsername: true,
        category: true,
      },
    });

    return questions.map(toQuestionOutput);
  } finally {
      await disconnectPrisma(prisma);
  }
};

const listDbComments = async () => {
  const prisma = await createPrismaClient();

  try {
    const comments = await prisma.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        questionId: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        showUsername: true,
        parentCommentId: true,
      },
    });

    return comments.map(toCommentOutput);
  } finally {
      await disconnectPrisma(prisma);
  }
};

const createDbUserProfile = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.userProfile.upsert({
      where: { id: currentUserId },
      update: {
        name: args.name,
        age: args.age,
        bio: args.bio ?? null,
        instruments: args.instruments,
      },
      create: {
        id: currentUserId,
        name: args.name,
        age: args.age,
        bio: args.bio ?? null,
        instruments: args.instruments,
      },
      select: {
        id: true,
        name: true,
        age: true,
        bio: true,
        instruments: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const updateDbUserProfile = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const existing = await prisma.userProfile.findUnique({
      where: { id: currentUserId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("UserProfile not found");
    }

    return await prisma.userProfile.update({
      where: { id: currentUserId },
      data: {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.age !== undefined ? { age: args.age } : {}),
        ...(args.bio !== undefined ? { bio: args.bio } : {}),
        ...(args.instruments !== undefined
          ? { instruments: args.instruments }
          : {}),
      },
      select: {
        id: true,
        name: true,
        age: true,
        bio: true,
        instruments: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const deleteDbUserProfile = async (currentUserId: string) => {
  const prisma = await createPrismaClient();

  try {
    const result = await prisma.userProfile.deleteMany({
      where: { id: currentUserId },
    });

    return result.count > 0;
  } finally {
      await disconnectPrisma(prisma);
  }
};

const createDbArtist = async (args: Record<string, any>) => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.artist.create({
      data: {
        name: args.name,
        description: args.description ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const updateDbArtist = async (args: Record<string, any>) => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.artist.update({
      where: { id: args.id },
      data: {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.description !== undefined
          ? { description: args.description }
          : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const deleteDbArtist = async (args: Record<string, any>) => {
  const prisma = await createPrismaClient();

  try {
    const result = await prisma.artist.deleteMany({ where: { id: args.id } });
    return result.count > 0;
  } finally {
     await disconnectPrisma(prisma);
  }
};

const createDbLikeArtist = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    return await prisma.likeArtist.create({
      data: {
        userId: currentUserId,
        artistId: args.artistId,
      },
      select: {
        id: true,
        userId: true,
        artistId: true,
      },
    });
  } finally {
      await disconnectPrisma(prisma);
  }
};

const deleteDbLikeArtist = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const result = await prisma.likeArtist.deleteMany({
      where: { id: args.id, userId: currentUserId },
    });

    return result.count > 0;
  } finally {
      await disconnectPrisma(prisma);
  }
};

const createDbQuestion = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  console.log("[createDbQuestion] Called with:", {
    userId: currentUserId,
    title: args.title,
    category: args.category,
  });

  const prisma = await createPrismaClient();

  try {
    console.log("[createDbQuestion] Creating question in database...");
    const question = await prisma.question.create({
      data: {
        userId: currentUserId,
        title: args.title,
        content: args.content,
        attachments: args.attachments || [],
        showUsername: args.showUsername ?? true,
        category: args.category ?? "QUESTION",
      },
      select: {
        id: true,
        title: true,
        content: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        showUsername: true,
        category: true,
      },
    });

    console.log("[createDbQuestion] Question created raw response:", {
      id: question.id,
      title: question.title,
      userId: question.userId,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    });

    const output = toQuestionOutput(question);
    console.log("[createDbQuestion] Converted output:", JSON.stringify(output));

    return output;
  } catch (error) {
    console.error("[createDbQuestion] Error creating question:", error);
    if (error instanceof Error) {
      console.error("[createDbQuestion] Error message:", error.message);
      console.error("[createDbQuestion] Error stack:", error.stack);
    }
    throw error;
  } finally {
      await disconnectPrisma(prisma);
  }
};

const updateDbQuestion = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const existing = await prisma.question.findFirst({
      where: { id: args.id, userId: currentUserId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Question not found or unauthorized");
    }

    const question = await prisma.question.update({
      where: { id: args.id },
      data: {
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.content !== undefined ? { content: args.content } : {}),
        ...(args.attachments !== undefined
          ? { attachments: args.attachments }
          : {}),
        ...(args.showUsername !== undefined
          ? { showUsername: args.showUsername }
          : {}),
        ...(args.category !== undefined ? { category: args.category } : {}),
      },
      select: {
        id: true,
        title: true,
        content: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        showUsername: true,
        category: true,
      },
    });

    return toQuestionOutput(question);
  } finally {
      await disconnectPrisma(prisma);
  }
};

const deleteDbQuestion = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const result = await prisma.question.deleteMany({
      where: { id: args.id, userId: currentUserId },
    });

    return result.count > 0;
  } finally {
      await disconnectPrisma(prisma);
  }
};

const createDbComment = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const comment = await prisma.comment.create({
      data: {
        questionId: args.questionId,
        userId: currentUserId,
        content: args.content,
        attachments: args.attachments || [],
        showUsername: args.showUsername ?? true,
        parentCommentId: args.parentCommentId ?? null,
      },
      select: {
        id: true,
        questionId: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        showUsername: true,
        parentCommentId: true,
      },
    });

    return toCommentOutput(comment);
  } finally {
      await disconnectPrisma(prisma);
  }
};

const updateDbComment = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const existing = await prisma.comment.findFirst({
      where: { id: args.id, userId: currentUserId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Comment not found or unauthorized");
    }

    const comment = await prisma.comment.update({
      where: { id: args.id },
      data: {
        ...(args.content !== undefined ? { content: args.content } : {}),
        ...(args.attachments !== undefined
          ? { attachments: args.attachments }
          : {}),
        ...(args.showUsername !== undefined
          ? { showUsername: args.showUsername }
          : {}),
      },
      select: {
        id: true,
        questionId: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        showUsername: true,
      },
    });

    return toCommentOutput(comment);
  } finally {
      await disconnectPrisma(prisma);
  }
};

const deleteDbComment = async (
  currentUserId: string,
  args: Record<string, any>,
) => {
  const prisma = await createPrismaClient();

  try {
    const result = await prisma.comment.deleteMany({
      where: { id: args.id, userId: currentUserId },
    });

    return result.count > 0;
  } finally {
      await disconnectPrisma(prisma);
  }
};

const isListField = (fieldName?: string) =>
  fieldName === "listDbUserProfiles" ||
  fieldName === "listDbArtists" ||
  fieldName === "listDbLikeArtists" ||
  fieldName === "listDbQuestions" ||
  fieldName === "listDbComments";

export const handler = async (event: ResolverEvent) => {
  try {
    console.log("[handler] Incoming event fieldName:", event?.fieldName);
    console.log("[handler] Event arguments:", JSON.stringify(event.arguments ?? {}));
    console.log("[handler] User ID:", event?.identity?.claims?.sub || event?.identity?.sub);

    if (event?.fieldName === "listDbUserProfiles") {
      return await listDbUserProfiles();
    }

    if (event?.fieldName === "listDbArtists") {
      return await listDbArtists();
    }

    if (event?.fieldName === "listDbLikeArtists") {
      return await listDbLikeArtists();
    }

    if (event?.fieldName === "listDbQuestions") {
      return await listDbQuestions();
    }

    if (event?.fieldName === "listDbComments") {
      return await listDbComments();
    }

    const currentUserId = getCurrentUserId(event);
    const args = event.arguments ?? {};

    if (event?.fieldName === "createDbUserProfile") {
      return await createDbUserProfile(currentUserId, args);
    }

    if (event?.fieldName === "updateDbUserProfile") {
      return await updateDbUserProfile(currentUserId, args);
    }

    if (event?.fieldName === "deleteDbUserProfile") {
      return await deleteDbUserProfile(currentUserId);
    }

    if (event?.fieldName === "createDbArtist") {
      return await createDbArtist(args);
    }

    if (event?.fieldName === "updateDbArtist") {
      return await updateDbArtist(args);
    }

    if (event?.fieldName === "deleteDbArtist") {
      return await deleteDbArtist(args);
    }

    if (event?.fieldName === "createDbLikeArtist") {
      return await createDbLikeArtist(currentUserId, args);
    }

    if (event?.fieldName === "deleteDbLikeArtist") {
      return await deleteDbLikeArtist(currentUserId, args);
    }

    if (event?.fieldName === "createDbQuestion") {
      console.log("[handler] Routing to createDbQuestion");
      const result = await createDbQuestion(currentUserId, args);
      console.log("[handler] createDbQuestion result:", JSON.stringify(result));
      return result;
    }

    if (event?.fieldName === "updateDbQuestion") {
      return await updateDbQuestion(currentUserId, args);
    }

    if (event?.fieldName === "deleteDbQuestion") {
      return await deleteDbQuestion(currentUserId, args);
    }

    if (event?.fieldName === "createDbComment") {
      return await createDbComment(currentUserId, args);
    }

    if (event?.fieldName === "updateDbComment") {
      return await updateDbComment(currentUserId, args);
    }

    if (event?.fieldName === "deleteDbComment") {
      return await deleteDbComment(currentUserId, args);
    }

    const prisma = await createPrismaClient();
    const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
    await disconnectPrisma(prisma);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "DB connection succeeded",
        data: result,
      }),
    };
  } catch (e) {
    console.error("[handler] Error caught in catch block:", e);
    if (e instanceof Error) {
      console.error("[handler] Error message:", e.message);
      console.error("[handler] Error stack:", e.stack);
    }
    console.error("[handler] Event field name:", event?.fieldName);

    if (isListField(event?.fieldName)) {
      throw e;
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(e) }),
    };
  }
};
