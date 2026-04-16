import "dotenv/config";
import { PrismaClient, Channel, EventStatus, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/hash";
import { mintRsvpToken } from "../src/lib/tokens";

const prisma = new PrismaClient();

const MALE_NAMES_AR = ["محمد", "أحمد", "عبد الله", "خالد", "سعد", "فهد", "يوسف", "عمر", "علي", "عبد الرحمن", "ناصر", "تركي"];
const FEMALE_NAMES_AR = ["فاطمة", "عائشة", "نورة", "مريم", "هدى", "ريم", "ليلى", "سارة", "رهف", "لمى", "منيرة"];
const SURNAMES_AR = ["آل سعود", "الزهراني", "الشمري", "القحطاني", "العتيبي", "الحربي", "العنزي", "الدوسري", "المطيري", "الشهري", "البلوي"];

const MALE_NAMES_EN = ["Mohammed", "Ahmed", "Abdullah", "Khalid", "Saad", "Fahad", "Yousef", "Omar", "Ali", "Abdulrahman"];
const FEMALE_NAMES_EN = ["Fatimah", "Aisha", "Noura", "Maryam", "Huda", "Reem", "Layla", "Sarah", "Rahaf", "Lama"];
const SURNAMES_EN = ["Al Saud", "Al Zahrani", "Al Shammari", "Al Qahtani", "Al Otaibi", "Al Harbi", "Al Anazi", "Al Dosari", "Al Mutairi", "Al Shehri"];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function ksaPhone(i: number): string {
  const core = String(500000000 + i * 73331).slice(0, 9);
  return `+9665${core}`;
}

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

  console.log("seed: users…");
  const demoPassword = await hashPassword("demo-password");
  await prisma.user.createMany({
    data: [
      { organizationId: org.id, name: "Owner", email: "owner@example.com", passwordHash: demoPassword, role: Role.OWNER, locale: "ar" },
      { organizationId: org.id, name: "Editor", email: "editor@example.com", passwordHash: demoPassword, role: Role.EDITOR, locale: "ar" },
      { organizationId: org.id, name: "Viewer", email: "viewer@example.com", passwordHash: demoPassword, role: Role.VIEWER, locale: "ar" },
    ],
  });

  console.log("seed: templates…");
  const templates = [
    {
      name: "دعوة رسمية — SMS",
      channel: Channel.SMS,
      locale: "ar",
      smsBody: "عزيزي {{guest.firstName}}، يسعدنا دعوتكم لـ{{event.title}} يوم {{event.startsAt}}. الرد: {{rsvp.link}}",
      isDefault: true,
    },
    {
      name: "Formal invite — SMS",
      channel: Channel.SMS,
      locale: "en",
      smsBody: "Dear {{guest.firstName}}, you are invited to {{event.title}} on {{event.startsAt}}. RSVP: {{rsvp.link}}",
      isDefault: true,
    },
    {
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
      name: "Formal invite — Email",
      channel: Channel.EMAIL,
      locale: "en",
      subject: "You're invited — {{event.title}}",
      preheader: "{{event.startsAt}} · {{event.venueName}}",
      bodyMarkdown:
        "<p>Dear {{guest.firstName}},</p>\n<p>We are pleased to invite you to <strong>{{event.title}}</strong> on {{event.startsAt}} at {{event.venueName}}.</p>\n<p>Kindly confirm your attendance using the link below before {{rsvp.deadline}}.</p>\n<p>Warm regards,<br/>{{org.name}}</p>",
      isDefault: true,
    },
  ];

  const createdTemplates = await Promise.all(
    templates.map((t) =>
      prisma.template.create({
        data: {
          organizationId: org.id,
          name: t.name,
          channel: t.channel,
          locale: t.locale,
          subject: t.subject ?? null,
          preheader: t.preheader ?? null,
          bodyMarkdown: t.bodyMarkdown ?? null,
          smsBody: t.smsBody ?? null,
          isDefault: t.isDefault,
        },
      })
    )
  );

  console.log("seed: event…");
  const startsAt = new Date("2026-05-15T20:00:00+03:00");
  const rsvpDeadline = new Date("2026-05-10T20:00:00+03:00");
  const event = await prisma.event.create({
    data: {
      organizationId: org.id,
      title: "حفل وزارة الإعلام السنوي",
      slug: "annual-reception-2026",
      description:
        "حفل سنوي يجمع شركاء وزارة الإعلام وقيادات القطاع. يتضمن البرنامج كلمات افتتاحية وتكريم الشركاء.",
      venueName: "فندق ريتز كارلتون، الرياض",
      venueAddress: "طريق الملك فهد، حي الحزم، الرياض",
      mapUrl: "https://maps.google.com/?q=Ritz-Carlton+Riyadh",
      startsAt,
      timezone: "Asia/Riyadh",
      rsvpDeadline,
      dressCode: "لباس رسمي",
      status: EventStatus.SCHEDULED,
    },
  });

  console.log("seed: guests + invitees…");
  for (let i = 0; i < 40; i++) {
    const useAr = i % 3 !== 0; // majority Arabic
    const male = i % 2 === 0;
    const firstName = useAr
      ? pick(male ? MALE_NAMES_AR : FEMALE_NAMES_AR, i)
      : pick(male ? MALE_NAMES_EN : FEMALE_NAMES_EN, i);
    const surname = useAr ? pick(SURNAMES_AR, i) : pick(SURNAMES_EN, i);
    const fullName = `${firstName} ${surname}`;
    const guest = await prisma.guest.create({
      data: {
        organizationId: org.id,
        firstName,
        fullName,
        email: i % 2 === 0 ? `guest${i}@example.com` : null,
        phoneE164: i % 2 === 1 ? ksaPhone(i) : (i % 4 === 0 ? ksaPhone(i) : null),
        preferredLocale: useAr ? "ar" : "en",
      },
    });

    const tmp = await prisma.invitee.create({
      data: {
        eventId: event.id,
        guestId: guest.id,
        partySizeLimit: i < 10 ? 2 : 1,
        allowPlusOne: i < 10,
        tagsJson: i < 6 ? ["VIP"] : [],
        tokenHash: `pending_${i}`,
        tokenVersion: 1,
      },
    });
    const { tokenHash } = mintRsvpToken({ i: tmp.id, v: 1 });
    await prisma.invitee.update({ where: { id: tmp.id }, data: { tokenHash } });
  }

  console.log("seed: draft campaign…");
  const defaultEmailTemplate = createdTemplates.find((t) => t.channel === Channel.EMAIL && t.locale === "ar")!;
  await prisma.campaign.create({
    data: {
      eventId: event.id,
      channel: Channel.EMAIL,
      templateId: defaultEmailTemplate.id,
      status: "DRAFT",
      audienceFilterJson: { rsvpStatus: ["PENDING"] },
    },
  });

  console.log("seed: done.");
  console.log("");
  console.log("Accounts:");
  console.log("  owner@example.com  / demo-password  (OWNER)");
  console.log("  editor@example.com / demo-password  (EDITOR)");
  console.log("  viewer@example.com / demo-password  (VIEWER)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
