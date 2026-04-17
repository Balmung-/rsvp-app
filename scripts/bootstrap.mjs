// Idempotent bootstrap. Runs on every Railway boot after `prisma migrate
// deploy`. If the database has zero users, creates:
//   - the Ministry of Media organisation
//   - the Admin user (username "Admin", password "Admin")
//   - the four default templates (AR/EN × SMS/Email)
// If any user already exists, exits silently — your data is safe across
// redeploys. Delete the Admin user manually if you want it re-seeded.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`[bootstrap] ${userCount} user(s) exist — skipping.`);
    return;
  }

  console.log("[bootstrap] no users found — creating Admin + org + default templates…");

  const existingOrg = await prisma.organization.findFirst();
  const org = existingOrg ?? await prisma.organization.create({
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

  const passwordHash = await bcrypt.hash("Admin", 12);
  await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Admin",
      email: "admin",
      passwordHash,
      role: "OWNER",
      locale: "ar",
    },
  });

  const templateCount = await prisma.template.count({ where: { organizationId: org.id } });
  if (templateCount === 0) {
    await prisma.template.createMany({
      data: [
        {
          organizationId: org.id,
          name: "دعوة رسمية — SMS",
          channel: "SMS",
          locale: "ar",
          smsBody: "عزيزي {{guest.firstName}}، يسعدنا دعوتكم لـ{{event.title}} يوم {{event.startsAt}}. الرد: {{rsvp.link}}",
          isDefault: true,
        },
        {
          organizationId: org.id,
          name: "Formal invite — SMS",
          channel: "SMS",
          locale: "en",
          smsBody: "Dear {{guest.firstName}}, you are invited to {{event.title}} on {{event.startsAt}}. RSVP: {{rsvp.link}}",
          isDefault: true,
        },
        {
          organizationId: org.id,
          name: "دعوة رسمية — بريد إلكتروني",
          channel: "EMAIL",
          locale: "ar",
          subject: "دعوة — {{event.title}}",
          preheader: "{{event.startsAt}} · {{event.venueName}}",
          bodyMarkdown: "<p>السلام عليكم ورحمة الله،</p>\n<p>يسعدنا دعوتكم لحضور <strong>{{event.title}}</strong> يوم {{event.startsAt}} في {{event.venueName}}.</p>\n<p>نرجو التكرم بتأكيد الحضور من خلال الرابط أدناه قبل {{rsvp.deadline}}.</p>\n<p>تحياتنا،<br/>{{org.name}}</p>",
          isDefault: true,
        },
        {
          organizationId: org.id,
          name: "Formal invite — Email",
          channel: "EMAIL",
          locale: "en",
          subject: "You're invited — {{event.title}}",
          preheader: "{{event.startsAt}} · {{event.venueName}}",
          bodyMarkdown: "<p>Dear {{guest.firstName}},</p>\n<p>We are pleased to invite you to <strong>{{event.title}}</strong> on {{event.startsAt}} at {{event.venueName}}.</p>\n<p>Kindly confirm your attendance using the link below before {{rsvp.deadline}}.</p>\n<p>Warm regards,<br/>{{org.name}}</p>",
          isDefault: true,
        },
      ],
    });
  }

  console.log("[bootstrap] Admin user created.");
  console.log("[bootstrap]   username: Admin");
  console.log("[bootstrap]   password: Admin");
  console.log("[bootstrap] CHANGE THE PASSWORD at /settings/account after first sign-in.");
}

main()
  .catch((err) => {
    // Do not crash boot on a bootstrap failure — log and continue so the
    // server comes up. Admin can then inspect /api/_diag.
    console.error("[bootstrap] failed:", err instanceof Error ? err.message : String(err));
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
