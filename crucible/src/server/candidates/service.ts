import { SkillSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/server/security/audit";
import { analyzeResumeText } from "@/server/ai/resume";
import fs from "fs/promises";
import path from "path";
import { getStorageRoot } from "@/lib/storage";

export async function ensureCandidateProfile(userId: string) {
  const existing = await prisma.candidateProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.candidateProfile.create({
    data: { userId, headline: "Aspiring elite engineer" },
  });
}

export async function updateCandidateProfile(
  userId: string,
  data: {
    headline?: string;
    bio?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    linkedInUrl?: string;
    yearsExperience?: number;
    previousEmployers?: unknown;
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    cloud?: string[];
    infrastructure?: string[];
    aiExperience?: string[];
    cybersecurity?: string[];
    projectHistory?: unknown;
    accommodations?: string;
    claimedSkills?: { name: string; domain: string }[];
  },
) {
  const profile = await ensureCandidateProfile(userId);
  const updated = await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: {
      headline: data.headline,
      bio: data.bio,
      portfolioUrl: data.portfolioUrl,
      githubUrl: data.githubUrl,
      linkedInUrl: data.linkedInUrl,
      yearsExperience: data.yearsExperience,
      previousEmployers: data.previousEmployers as object | undefined,
      languages: data.languages,
      frameworks: data.frameworks,
      databases: data.databases,
      cloud: data.cloud,
      infrastructure: data.infrastructure,
      aiExperience: data.aiExperience,
      cybersecurity: data.cybersecurity,
      projectHistory: data.projectHistory as object | undefined,
      accommodations: data.accommodations,
    },
    include: { skills: true, resumes: true, projectEvidence: true },
  });

  if (data.claimedSkills?.length) {
    for (const skill of data.claimedSkills) {
      await prisma.skillRecord.upsert({
        where: {
          profileId_name_source: {
            profileId: profile.id,
            name: skill.name,
            source: SkillSource.CLAIMED,
          },
        },
        create: {
          profileId: profile.id,
          name: skill.name,
          domain: skill.domain,
          source: SkillSource.CLAIMED,
          confidence: 0.3,
          evidence: "Self-reported",
        },
        update: { domain: skill.domain },
      });
    }
  }

  return updated;
}

export async function uploadResume(params: {
  userId: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  actorId: string;
}) {
  if (params.mimeType !== "application/pdf") {
    throw new AppError("Only PDF résumés are accepted", 400, "INVALID_FILE");
  }
  if (params.bytes.length > 5 * 1024 * 1024) {
    throw new AppError("Résumé exceeds 5MB limit", 400, "FILE_TOO_LARGE");
  }
  // Basic PDF magic-byte validation
  if (params.bytes.subarray(0, 4).toString() !== "%PDF") {
    throw new AppError("File does not appear to be a valid PDF", 400, "INVALID_FILE");
  }

  const profile = await ensureCandidateProfile(params.userId);
  const dir = path.join(getStorageRoot(), "resumes", profile.id);
  await fs.mkdir(dir, { recursive: true });
  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = path.join(dir, `${Date.now()}-${safeName}`);
  await fs.writeFile(storagePath, params.bytes);

  let extractedText = "";
  try {
    // pdf-parse v2 exposes PDFParse; keep extraction best-effort.
    const mod = await import("pdf-parse");
    const PDFParse = (mod as { PDFParse?: new (opts: { data: Buffer }) => { getText: () => Promise<{ text?: string }> } }).PDFParse;
    if (PDFParse) {
      const parser = new PDFParse({ data: params.bytes });
      const parsed = await parser.getText();
      extractedText = parsed.text ?? "";
    } else {
      extractedText = params.bytes.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
    }
  } catch {
    extractedText = params.bytes.toString("utf8").replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ").slice(0, 20000);
  }

  const analysis = await analyzeResumeText(extractedText || `Resume file: ${safeName}`);
  const resume = await prisma.resume.create({
    data: {
      profileId: profile.id,
      filename: safeName,
      storagePath,
      mimeType: params.mimeType,
      sizeBytes: params.bytes.length,
      extractedText,
      aiAnalysis: analysis,
      analyzedAt: new Date(),
    },
  });

  for (const skill of analysis.claimedSkills) {
    await prisma.skillRecord.upsert({
      where: {
        profileId_name_source: {
          profileId: profile.id,
          name: skill.name,
          source: SkillSource.CLAIMED,
        },
      },
      create: {
        profileId: profile.id,
        name: skill.name,
        domain: skill.domain,
        source: SkillSource.CLAIMED,
        confidence: skill.confidence,
        evidence: "Extracted from résumé (claimed, not verified)",
      },
      update: {
        domain: skill.domain,
        confidence: skill.confidence,
      },
    });
  }

  await writeAudit({
    actorId: params.actorId,
    action: "resume.upload",
    entityType: "Resume",
    entityId: resume.id,
    metadata: { profileId: profile.id, filename: safeName },
  });

  return resume;
}

export async function attachProjectEvidence(params: {
  profileId: string;
  title: string;
  description: string;
  url?: string;
  skills: string[];
  attachedBy: string;
}) {
  const evidence = await prisma.projectEvidence.create({
    data: params,
  });
  for (const skill of params.skills) {
    await prisma.skillRecord.upsert({
      where: {
        profileId_name_source: {
          profileId: params.profileId,
          name: skill,
          source: SkillSource.PORTFOLIO,
        },
      },
      create: {
        profileId: params.profileId,
        name: skill,
        domain: "portfolio",
        source: SkillSource.PORTFOLIO,
        confidence: 0.6,
        evidence: `Portfolio evidence: ${params.title}`,
        verifiedBy: params.attachedBy,
      },
      update: {
        evidence: `Portfolio evidence: ${params.title}`,
        verifiedBy: params.attachedBy,
      },
    });
  }
  return evidence;
}

export async function getCandidateDetail(userId: string) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, name: true, role: true, githubLogin: true } },
      resumes: { orderBy: { uploadedAt: "desc" } },
      skills: { orderBy: [{ source: "asc" }, { name: "asc" }] },
      projectEvidence: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!profile) throw new AppError("Candidate profile not found", 404, "NOT_FOUND");
  return {
    ...profile,
    knowledgeMap: profile.knowledgeMap,
    skillBuckets: {
      claimed: profile.skills.filter((s) => s.source === "CLAIMED"),
      portfolio: profile.skills.filter((s) => s.source === "PORTFOLIO"),
      assessment: profile.skills.filter((s) => s.source === "ASSESSMENT"),
      humanReview: profile.skills.filter((s) => s.source === "HUMAN_REVIEW"),
    },
  };
}
