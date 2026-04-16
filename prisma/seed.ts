import "dotenv/config";
import { PrismaClient, Channel, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/hash";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("seed: cleaning previous…");
  await prisma.$transaction([
    prisma.auditLog.deleteMany({}),
    prisma.rsvpResponse.deleteMany({}),
    prisma.outboundMessage.deleteMany({}),
    prisma.campaign.deleteMany({}),
    prisma.webhookReceipt.deleteMany({}),
    prisma.suppression.deleteMany({}),
    prisma.invitee.deleteMany({}),
    prisma.template.deleteMany({}),
    prisma.event.deleteMany({}),
    prisma.guest.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.user.deleteMany({}),
    prisma.organization.deleteMany({}),
  ]);

  console.log("seed: organization…");
  const org = await prisma.organization.create({
    data: {
      name: "Ministry of Media",
      slug: "ministry-of-media",
      defaultLocale: "ar",
      defaultTimezone: "Asia/Riyadh",
      brandAccent: "#009B87",
      logoUrl: "/brand/ministry-of-media.png",
      supportEmail: "events@mom.example.sa",
      supportPhone: "+966112345678",
    },
  });

  console.log("seed: admin user…");
  const passwordHash = await hashPassword("Admin");
  await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Admin",
      email: "admin", // username stored in email column; lookup is case-insensitive
      passwordHash,
      role: Role.OWNER,
      locale: "ar",
    },
  });

  console.log("seed: default templates…");
  await prisma.template.createMany({
    data: [
      {
        organizationId: org.id,
        name: "دعوة رسمية — SMS",
        channel: Channel.SMS,
        locale: "ar",
        smsBody: "عزيزي {{guest.firstName}}، يسعدنا دعوتكم لـ{{event.title}} يوم {{event.startsAt}}. الرد: {{rsvp.link}}",
        isDefault: true,
      },
      {
        organizationId: org.id,
        name: "Formal invite — SMS",
        channel: Channel.SMS,
        locale: "en",
        smsBody: "Dear {{guest.firstName}}, you are invited to {{event.title}} on {{event.startsAt}}. RSVP: {{rsvp.link}}",
        isDefault: true,
      },
      {
        organizationId: org.id,
        name: "دعوة رسمية — بريد إلكتروني",
        channel: Channel.EMAIL,
        locale: "ar",
        subject: "دعوة — {{event.title}}",
        preheader: "{{event.startsAt}} · {{event.venueName}}",
        bodyMarkdown:
          "<p>السلام عليكم ورحمة الله،</p>\n<p>يسعدنا دعوتكم لحضور <strong>{{event.title}}</strong> يوم {{event.startsAt}} في {{event.venueName}}.</p>\n<p>نرجو التكرم بتأكيد الحضور من خلال الرابط أدناه قبل {{rsvp.deadline}}.</p>\n<p>تحياتنا،<br/>{{org.name}}</p>",
        isDefault: true,
      },
      {
        organizationId: org.id,
        name: "Formal invite — Email",
        channel: Channel.EMAIL,
        locale: "en",
        subject: "You're invited — {{event.title}}",
        preheader: "{{event.startsAt}} · {{event.venueName}}",
        bodyMarkdown:
          "<p>Dear {{guest.firstName}},</p>\n<p>We are pleased to invite you to <strong>{{event.title}}</strong> on {{event.startsAt}} at {{event.venueName}}.</p>\n<p>Kindly confirm your attendance using the link below before {{rsvp.deadline}}.</p>\n<p>Warm regards,<br/>{{org.name}}</p>",
        isDefault: true,
      },
    ],
  });

  console.log("seed: done.");
  console.log("");
  console.log("Account:");
  console.log("  Username: Admin");
  console.log("  Password: Admin   (change this after first sign-in)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
