import "dotenv/config";
import bcrypt from "bcryptjs";

async function loadPrismaClient() {
  try {
    const prismaPkg = await import("@prisma/client");
    const PrismaClient =
      prismaPkg.PrismaClient ??
      prismaPkg.default?.PrismaClient ??
      prismaPkg.default;
    if (!PrismaClient) {
      throw new Error("PRISMA_CLIENT_NOT_FOUND");
    }
    return PrismaClient;
  } catch (error) {
    console.error(
      "Prisma Client is not generated. Run `pnpm prisma generate` (or `pnpm prisma migrate dev`) and try again."
    );
    throw error;
  }
}

let prisma;

async function main() {
  const PrismaClient = await loadPrismaClient();
  prisma = new PrismaClient();

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existing = await prisma.adminUser.findUnique({
      where: { email: adminEmail },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await prisma.adminUser.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: "ADMIN",
        },
      });
      console.log(`Created admin user: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
    }
  } else {
    console.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin user seed."
    );
  }

  await prisma.displayState.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      mode: "IDLE",
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
