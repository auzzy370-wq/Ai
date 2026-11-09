-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'HIRING_MANAGER', 'TECHNICAL_REVIEWER', 'CANDIDATE', 'TEAM_MEMBER');

-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('CLAIMED', 'PORTFOLIO', 'ASSESSMENT', 'HUMAN_REVIEW');

-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('FULL_STACK_SAAS', 'VIDEO_PLATFORM', 'REALTIME_COMMS', 'DISTRIBUTED_INFRA', 'ECOMMERCE', 'AI_SAAS', 'BACKEND', 'FRONTEND', 'INFRASTRUCTURE', 'DISTRIBUTED_SYSTEMS', 'SECURITY', 'DEBUGGING', 'PERFORMANCE', 'ARCHITECTURE', 'TEAM_PROJECT', 'PRODUCTION_INCIDENT', 'DATABASE', 'APPSEC', 'CLOUD_SECURITY', 'THREAT_MODELING', 'SOC_IR', 'SECURE_CODE_REVIEW', 'CRYPTOGRAPHY', 'ZERO_TRUST', 'DETECTION_ENGINEERING', 'IDENTITY_ACCESS', 'VULN_TRIAGE');

-- CreateEnum
CREATE TYPE "AssessmentTrack" AS ENUM ('SOFTWARE_ENGINEERING', 'CYBERSECURITY', 'SECURE_FULL_STACK');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'GRADING', 'UNDER_REVIEW', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('FACT', 'INFERENCE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "QualificationTier" AS ENUM ('NOT_QUALIFIED', 'ELITE', 'EXCEPTIONAL', 'DISTINGUISHED');

-- CreateEnum
CREATE TYPE "ReviewDecisionType" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_FOLLOW_UP', 'OVERRIDE_AI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CANDIDATE',
    "avatarUrl" TEXT,
    "githubLogin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "linkedInUrl" TEXT,
    "yearsExperience" INTEGER,
    "previousEmployers" JSONB,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "databases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cloud" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "infrastructure" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiExperience" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cybersecurity" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "securityClearanceNote" TEXT,
    "preferredTrack" "AssessmentTrack" NOT NULL DEFAULT 'SOFTWARE_ENGINEERING',
    "projectHistory" JSONB,
    "accommodations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "extractedText" TEXT,
    "aiAnalysis" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillRecord" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "source" "SkillSource" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidence" TEXT,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEvidence" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "skills" TEXT[],
    "attachedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ChallengeType" NOT NULL,
    "track" "AssessmentTrack" NOT NULL DEFAULT 'SOFTWARE_ENGINEERING',
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "estimatedDays" INTEGER NOT NULL DEFAULT 3,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "starterRepoPath" TEXT,
    "referenceSolution" TEXT,
    "hiddenRequirements" JSONB,
    "publicRequirements" JSONB,
    "gradingRubric" JSONB,
    "adaptiveTrack" JSONB,
    "controlledVulns" JSONB,
    "mitreMappings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "owaspMappings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY['typescript', 'python', 'go']::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "track" "AssessmentTrack" NOT NULL DEFAULT 'SOFTWARE_ENGINEERING',
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "timedMinutes" INTEGER,
    "multiDay" BOOLEAN NOT NULL DEFAULT true,
    "allowTeam" BOOLEAN NOT NULL DEFAULT false,
    "teamSizeMin" INTEGER,
    "teamSizeMax" INTEGER,
    "progressiveDiff" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "scoringPolicyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoringPolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minOverall" INTEGER NOT NULL DEFAULT 90,
    "minCategoryPct" INTEGER NOT NULL DEFAULT 80,
    "requireDeployment" BOOLEAN NOT NULL DEFAULT true,
    "requireHiddenTests" BOOLEAN NOT NULL DEFAULT true,
    "requireIncident" BOOLEAN NOT NULL DEFAULT true,
    "requireArchitecture" BOOLEAN NOT NULL DEFAULT true,
    "requireTeam" BOOLEAN NOT NULL DEFAULT true,
    "requireHumanApproval" BOOLEAN NOT NULL DEFAULT true,
    "requireNoCriticalSec" BOOLEAN NOT NULL DEFAULT true,
    "weights" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoringPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAssignment" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevelReached" INTEGER NOT NULL DEFAULT 1,
    "accommodations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamMemberId" TEXT,

    CONSTRAINT "AssessmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'typescript',
    "imageTag" TEXT NOT NULL DEFAULT 'gauntlet/node:20',
    "rootPath" TEXT NOT NULL,
    "gitRemoteUrl" TEXT,
    "lastCommitSha" TEXT,
    "previewUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceFile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitCommit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviews" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "commitSha" TEXT,
    "notes" TEXT,
    "artifactPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "imageTag" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "cpuLimit" TEXT NOT NULL DEFAULT '1',
    "memoryLimit" TEXT NOT NULL DEFAULT '512m',
    "timeoutSec" INTEGER NOT NULL DEFAULT 120,
    "networkMode" TEXT NOT NULL DEFAULT 'none',
    "stdout" TEXT,
    "stderr" TEXT,
    "exitCode" INTEGER,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "auditMeta" JSONB,

    CONSTRAINT "ExecutionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT,
    "jobId" TEXT NOT NULL,
    "suite" TEXT NOT NULL,
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "hiddenPassed" INTEGER NOT NULL DEFAULT 0,
    "hiddenFailed" INTEGER NOT NULL DEFAULT 0,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentResult" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "url" TEXT,
    "checks" JSONB NOT NULL,
    "logs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreReport" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "frontend" DOUBLE PRECISION NOT NULL,
    "backend" DOUBLE PRECISION NOT NULL,
    "database" DOUBLE PRECISION NOT NULL,
    "architecture" DOUBLE PRECISION NOT NULL,
    "infrastructure" DOUBLE PRECISION NOT NULL,
    "security" DOUBLE PRECISION NOT NULL,
    "testing" DOUBLE PRECISION NOT NULL,
    "problemSolving" DOUBLE PRECISION NOT NULL,
    "performance" DOUBLE PRECISION NOT NULL,
    "collaboration" DOUBLE PRECISION NOT NULL,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "tier" "QualificationTier" NOT NULL DEFAULT 'NOT_QUALIFIED',
    "mandatoryFailures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calibrated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreCategoryEvidence" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "criterion" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "evidenceKind" "EvidenceKind" NOT NULL,
    "observed" TEXT NOT NULL,
    "automated" TEXT,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "explanation" TEXT NOT NULL,
    "followUps" TEXT[],

    CONSTRAINT "ScoreCategoryEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apiKeyEnv" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEvaluation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpQuestion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "basedOnPath" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpAnswer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecisionType" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "overridesAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewNote" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "path" TEXT,
    "line" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineeringTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EngineeringTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleLabel" TEXT NOT NULL,
    "duties" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamDiscussion" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentScenario" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "symptoms" JSONB NOT NULL,
    "rootCause" TEXT NOT NULL,
    "buggyFiles" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentRun" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "candidateId" TEXT NOT NULL,
    "diagnosis" TEXT,
    "rootCauseFound" BOOLEAN NOT NULL DEFAULT false,
    "fixApplied" BOOLEAN NOT NULL DEFAULT false,
    "regressionTests" BOOLEAN NOT NULL DEFAULT false,
    "recovered" BOOLEAN NOT NULL DEFAULT false,
    "preventionDoc" TEXT,
    "timeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchitectureSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "diagrams" JSONB NOT NULL,
    "proposal" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchitectureSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "Resume_profileId_idx" ON "Resume"("profileId");

-- CreateIndex
CREATE INDEX "SkillRecord_profileId_source_idx" ON "SkillRecord"("profileId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "SkillRecord_profileId_name_source_key" ON "SkillRecord"("profileId", "name", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Assessment_status_idx" ON "Assessment"("status");

-- CreateIndex
CREATE INDEX "Assessment_track_idx" ON "Assessment"("track");

-- CreateIndex
CREATE INDEX "AssessmentAssignment_candidateId_status_idx" ON "AssessmentAssignment"("candidateId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAssignment_assessmentId_candidateId_key" ON "AssessmentAssignment"("assessmentId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_assignmentId_key" ON "Workspace"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceFile_workspaceId_path_key" ON "WorkspaceFile"("workspaceId", "path");

-- CreateIndex
CREATE INDEX "GitCommit_workspaceId_idx" ON "GitCommit"("workspaceId");

-- CreateIndex
CREATE INDEX "Submission_assignmentId_idx" ON "Submission"("assignmentId");

-- CreateIndex
CREATE INDEX "ExecutionJob_status_idx" ON "ExecutionJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TestRun_jobId_key" ON "TestRun"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreReport_assignmentId_key" ON "ScoreReport"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentScenario_slug_key" ON "IncidentScenario"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillRecord" ADD CONSTRAINT "SkillRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEvidence" ADD CONSTRAINT "ProjectEvidence_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_scoringPolicyId_fkey" FOREIGN KEY ("scoringPolicyId") REFERENCES "ScoringPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAssignment" ADD CONSTRAINT "AssessmentAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceFile" ADD CONSTRAINT "WorkspaceFile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitCommit" ADD CONSTRAINT "GitCommit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ExecutionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentResult" ADD CONSTRAINT "DeploymentResult_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreReport" ADD CONSTRAINT "ScoreReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCategoryEvidence" ADD CONSTRAINT "ScoreCategoryEvidence_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ScoreReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEvaluation" ADD CONSTRAINT "AiEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpQuestion" ADD CONSTRAINT "FollowUpQuestion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAnswer" ADD CONSTRAINT "FollowUpAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FollowUpQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAnswer" ADD CONSTRAINT "FollowUpAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AssessmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewNote" ADD CONSTRAINT "ReviewNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringTeam" ADD CONSTRAINT "EngineeringTeam_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineeringTeam" ADD CONSTRAINT "EngineeringTeam_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EngineeringTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDiscussion" ADD CONSTRAINT "TeamDiscussion_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EngineeringTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentScenario" ADD CONSTRAINT "IncidentScenario_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentRun" ADD CONSTRAINT "IncidentRun_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "IncidentScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

