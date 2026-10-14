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
    update: { organizationName: "Harvest Fields Cooperative" },
    create: {
      id: "user-employer-1",
      email: "employer@agriopportunity.co.za",
      passwordHash,
      role: "EMPLOYER",
      fullName: "Nandi Mokoena",
      organizationName: "Harvest Fields Cooperative",
      location: "Bloemfontein",
      skills: ["Agri operations", "Hiring", "Field supervision"],
      qualifications: ["BTech: Agricultural Management"],
    },
  });

  const providerData = [
    { email: "provider-training@agriopportunity.co.za", fullName: "Sample Training Network", organizationName: "Sample Training Network" },
    { email: "provider-funding@agriopportunity.co.za", fullName: "Rural Enterprise Fund", organizationName: "Sample Rural Enterprise Fund" },
    { email: "provider-province@agriopportunity.co.za", fullName: "Provincial Growth Desk", organizationName: "Sample Provincial Agriculture Department" },
    { email: "provider-market@agriopportunity.co.za", fullName: "Farm Market Link", organizationName: "Sample Farm Market Link" },
    { email: "provider-mentor@agriopportunity.co.za", fullName: "Farmer Mentors Network", organizationName: "Sample Farmer Mentors Network" },
  ];
  const providers = [];
  for (const [index, data] of providerData.entries()) {
    const provider = await prisma.user.upsert({
      where: { email: data.email },
      update: { role: "PROVIDER", organizationName: data.organizationName },
      create: {
        id: `user-provider-${index + 1}`,
        ...data,
        passwordHash,
        role: "PROVIDER",
        location: "Pretoria",
        skills: [],
        qualifications: [],
      },
    });
    await prisma.userRole.upsert({
      where: { userId_role: { userId: provider.id, role: "PROVIDER" } },
      update: {},
      create: { userId: provider.id, role: "PROVIDER" },
    });
    providers.push(provider);
  }
  await prisma.userRole.upsert({
    where: { userId_role: { userId: employer.id, role: "EMPLOYER" } },
    update: {},
    create: { userId: employer.id, role: "EMPLOYER" },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@agriopportunity.co.za" },
    update: {},
    create: {
      id: "user-admin-1",
      email: "admin@agriopportunity.co.za",
      passwordHash,
      role: "ADMIN",
      fullName: "AgriOpportunity Admin",
      location: "Pretoria",
      skills: [],
      qualifications: [],
    },
  });

  for (const [user, role] of [[learner, "LEARNER"], [admin, "ADMIN"]]) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }

  const opportunities = [
    {
      id: "opp-1",
      title: "Farm Production Learnership",
      description: "Join a hands-on learnership for learners interested in crop planning, irrigation systems, and farm administration.",
      category: "learnership",
      type: "learnership",
      targetAudience: ["learner", "graduate"],
      location: "Pretoria",
      province: "Gauteng",
      closingDate: new Date("2026-11-30T23:59:59.999Z"),
      requiredSkills: ["Crop science", "Irrigation", "Farm operations"],
    },
    {
      id: "opp-2",
      title: "Agricultural Data Technician",
      description: "Support field data collection, crop monitoring and reporting for a leading agribusiness in the Western Cape.",
      category: "job",
      type: "job",
      targetAudience: ["learner", "graduate"],
      location: "Cape Town",
      province: "Western Cape",
      closingDate: new Date("2026-12-15T23:59:59.999Z"),
      requiredSkills: ["Data capture", "Reporting", "Agronomy"],
    },
    {
      id: "opp-3",
      title: "Seedling Enterprise Grant",
      description: "Funding opportunity for SMMEs in rural agricultural value chains wanting to scale crop production and processing.",
      category: "funding",
      type: "funding",
      targetAudience: ["farmer", "smme", "cooperative"],
      location: "KwaZulu-Natal",
      province: "KwaZulu-Natal",
      closingDate: new Date("2026-11-15T23:59:59.999Z"),
      fundingAmountRange: "R50,000–R250,000",
      requiredSkills: ["Business planning", "Funding proposals", "Agri value chains"],
    },
    {
      id: "opp-smme-1", title: "Rural Agri-business Growth Programme",
      description: "Practical support for early-stage agricultural businesses to strengthen compliance, improve records and prepare for new customers.",
      category: "smme_programme", type: "smme_programme", targetAudience: ["smme", "cooperative"],
      location: "National", province: null, closingDate: new Date("2026-12-10T23:59:59.999Z"),
      requiredSkills: ["Business planning", "Compliance", "Record keeping"],
    },
    {
      id: "opp-smme-2", title: "Co-operative Business Development Cohort",
      description: "A guided cohort for agricultural co-operatives covering governance, member roles, financial records and routes to market.",
      category: "smme_programme", type: "smme_programme", targetAudience: ["cooperative", "smme"],
      location: "Free State", province: "Free State", closingDate: new Date("2027-01-20T23:59:59.999Z"),
      requiredSkills: ["Co-operative governance", "Financial records", "Market access"],
    },
    {
      id: "opp-smme-3", title: "Agri-Processing Business Booster",
      description: "Business coaching and product-readiness support for small food processors seeking better packaging, quality systems and retail buyers.",
      category: "smme_programme", type: "smme_programme", targetAudience: ["smme"],
      location: "Gauteng", province: "Gauteng", closingDate: new Date("2026-12-05T23:59:59.999Z"),
      requiredSkills: ["Food processing", "Quality assurance", "Sales planning"],
    },
    {
      id: "opp-fund-1", title: "Small Farm Equipment Finance Call",
      description: "A sample finance call for emerging farmers seeking essential irrigation, fencing or post-harvest equipment.",
      category: "funding_call", type: "funding_call", targetAudience: ["farmer", "cooperative"],
      location: "National", province: null, closingDate: new Date("2026-11-22T23:59:59.999Z"),
      fundingAmountRange: "R25,000–R150,000", requiredSkills: ["Farm plan", "Equipment quote", "Budget"],
    },
    {
      id: "opp-fund-2", title: "Township and Rural Agri-SMME Funding Call",
      description: "Sample growth funding for registered small businesses in agricultural production, distribution and value-added products.",
      category: "funding_call", type: "funding_call", targetAudience: ["smme", "cooperative"],
      location: "Mpumalanga", province: "Mpumalanga", closingDate: new Date("2026-12-18T23:59:59.999Z"),
      fundingAmountRange: "R100,000–R500,000", requiredSkills: ["Financial records", "Business plan", "Market evidence"],
    },
    {
      id: "opp-fund-3", title: "Women in Agriculture Expansion Grant",
      description: "Sample grant call for women-led farms and agricultural enterprises ready to expand production or reach new markets.",
      category: "funding_call", type: "funding_call", targetAudience: ["farmer", "smme", "cooperative"],
      location: "Eastern Cape", province: "Eastern Cape", closingDate: new Date("2027-01-10T23:59:59.999Z"),
      fundingAmountRange: "R50,000–R300,000", requiredSkills: ["Growth plan", "Costing", "Market access"],
    },
    {
      id: "opp-mentor-1", title: "Emerging Farmer Mentor Circle",
      description: "Monthly peer and mentor sessions on seasonal planning, soil health, crop budgeting and finding reliable buyers.",
      category: "mentorship", type: "mentorship", targetAudience: ["farmer"],
      location: "Limpopo", province: "Limpopo", closingDate: new Date("2026-12-01T23:59:59.999Z"),
      requiredSkills: ["Crop planning", "Farm budgeting", "Market access"],
    },
    {
      id: "opp-mentor-2", title: "Agri-SMME Finance and Governance Mentorship",
      description: "One-to-one mentoring for small agricultural businesses and co-operatives working to improve governance and funding readiness.",
      category: "mentorship", type: "mentorship", targetAudience: ["smme", "cooperative"],
      location: "North West", province: "North West", closingDate: new Date("2026-12-20T23:59:59.999Z"),
      requiredSkills: ["Governance", "Financial planning", "Compliance"],
    },
    {
      id: "opp-skills-1", title: "Climate-Smart Crop Production Skills Programme",
      description: "Short practical training on water-wise production, soil care and climate-smart crop management for small-scale farmers.",
      category: "skills_programme", type: "skills_programme", targetAudience: ["farmer"],
      location: "Northern Cape", province: "Northern Cape", closingDate: new Date("2026-11-28T23:59:59.999Z"),
      requiredSkills: ["Water management", "Soil health", "Crop production"],
    },
    {
      id: "opp-skills-2", title: "Livestock Health and Record-Keeping Programme",
      description: "Hands-on farmer training in livestock health, basic herd records, animal handling and production planning.",
      category: "skills_programme", type: "skills_programme", targetAudience: ["farmer"],
      location: "Eastern Cape", province: "Eastern Cape", closingDate: new Date("2027-01-05T23:59:59.999Z"),
      requiredSkills: ["Livestock care", "Herd records", "Farm planning"],
    },
    {
      id: "opp-intern-1", title: "Agricultural Extension Intern",
      description: "Support extension officers with field visits, farmer records and practical demonstrations across local farming communities.",
      category: "internship", type: "internship", targetAudience: ["learner", "graduate"],
      location: "KwaZulu-Natal", province: "KwaZulu-Natal", closingDate: new Date("2026-11-25T23:59:59.999Z"),
      requiredSkills: ["Agriculture", "Communication", "Field data"],
    },
    {
      id: "opp-intern-2", title: "Food Safety and Processing Intern",
      description: "Assist a small agro-processing network with product quality checks, safe handling records and supplier coordination.",
      category: "internship", type: "internship", targetAudience: ["learner", "graduate"],
      location: "Gauteng", province: "Gauteng", closingDate: new Date("2026-12-12T23:59:59.999Z"),
      requiredSkills: ["Food safety", "Quality checks", "Record keeping"],
    },
    {
      id: "opp-learn-2", title: "Livestock Production Learnership",
      description: "Entry-level practical learning in animal care, grazing management, farm safety and production record keeping.",
      category: "learnership", type: "learnership", targetAudience: ["learner"],
      location: "North West", province: "North West", closingDate: new Date("2026-12-08T23:59:59.999Z"),
      requiredSkills: ["Animal care", "Farm safety", "Record keeping"],
    },
    {
      id: "opp-job-2", title: "Packhouse Quality Assistant",
      description: "Join a produce packhouse team checking grades, updating batch records and helping prepare orders for local buyers.",
      category: "job", type: "job", targetAudience: ["learner", "farmer"],
      location: "Mpumalanga", province: "Mpumalanga", closingDate: new Date("2026-11-19T23:59:59.999Z"),
      requiredSkills: ["Quality checks", "Packing", "Attention to detail"],
    },
    {
      id: "opp-bursary-1", title: "Agriculture Diploma Study Bursary",
      description: "Sample study assistance for eligible students pursuing an agriculture diploma with an interest in rural development.",
      category: "bursary", type: "bursary", targetAudience: ["learner", "graduate"],
      location: "National", province: null, closingDate: new Date("2026-12-31T23:59:59.999Z"),
      requiredSkills: ["Academic record", "Agriculture", "Motivation letter"],
    },
  ];

  const organizationForOpportunity = {
    "opp-smme-1": providers[0].id,
    "opp-smme-2": providers[3].id,
    "opp-smme-3": providers[1].id,
    "opp-fund-1": providers[1].id,
    "opp-fund-2": providers[2].id,
    "opp-fund-3": providers[4].id,
    "opp-mentor-1": providers[4].id,
    "opp-mentor-2": providers[0].id,
    "opp-skills-1": providers[0].id,
    "opp-skills-2": providers[2].id,
    "opp-intern-1": providers[2].id,
    "opp-intern-2": providers[1].id,
    "opp-learn-2": providers[0].id,
    "opp-job-2": employer.id,
    "opp-bursary-1": providers[3].id,
  };

  for (const opportunity of opportunities) {
    await prisma.opportunity.upsert({
      where: { id: opportunity.id },
      update: opportunity,
      create: {
        ...opportunity,
        postedById: organizationForOpportunity[opportunity.id] ?? employer.id,
        applicationEmail: "opportunities@agriopportunity.co.za",
        status: "open",
      },
    });
  }

  console.log(`Seeded ${learner.email}, ${employer.email}, ${admin.email}, ${providers.length} sample providers, and ${opportunities.length} opportunities.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
