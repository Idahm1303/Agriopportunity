import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const learner = await prisma.user.upsert({
    where: { email: "learner@agriopportunity.co.za" },
    update: {},
    create: {
      id: "user-learner-1",
      email: "learner@agriopportunity.co.za",
      passwordHash,
      role: "LEARNER",
      fullName: "Aphiwe Khumalo",
      location: "Pretoria",
      skills: ["Crop science", "Irrigation", "Data capture", "Farm operations"],
      qualifications: ["National Diploma: Agriculture", "FET Certificate: Plant Production"],
    },
  });

  const employer = await prisma.user.upsert({
    where: { email: "employer@agriopportunity.co.za" },
    update: {},
    create: {
      id: "user-employer-1",
      email: "employer@agriopportunity.co.za",
      passwordHash,
      role: "EMPLOYER",
      fullName: "Nandi Mokoena",
      location: "Bloemfontein",
      skills: ["Agri operations", "Hiring", "Field supervision"],
      qualifications: ["BTech: Agricultural Management"],
    },
  });

  const opportunities = [
    {
      id: "opp-1",
      title: "Farm Production Learnership",
      description: "Join a hands-on learnership for learners interested in crop planning, irrigation systems, and farm administration.",
      category: "learnership",
      location: "Pretoria",
      requiredSkills: ["Crop science", "Irrigation", "Farm operations"],
    },
    {
      id: "opp-2",
      title: "Agricultural Data Technician",
      description: "Support field data collection, crop monitoring and reporting for a leading agribusiness in the Western Cape.",
      category: "job",
      location: "Cape Town",
      requiredSkills: ["Data capture", "Reporting", "Agronomy"],
    },
    {
      id: "opp-3",
      title: "Seedling Enterprise Grant",
      description: "Funding opportunity for SMMEs in rural agricultural value chains wanting to scale crop production and processing.",
      category: "funding",
      location: "KwaZulu-Natal",
      requiredSkills: ["Business planning", "Funding proposals", "Agri value chains"],
    },
  ];

  for (const opportunity of opportunities) {
    await prisma.opportunity.upsert({
      where: { id: opportunity.id },
      update: opportunity,
      create: { ...opportunity, postedById: employer.id },
    });
  }

  console.log(`Seeded ${learner.email}, ${employer.email}, and ${opportunities.length} opportunities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
