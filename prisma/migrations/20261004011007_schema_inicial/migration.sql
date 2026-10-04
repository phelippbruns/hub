-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('member', 'moderator');

-- CreateEnum
CREATE TYPE "invite_policy" AS ENUM ('community_members', 'nobody');

-- CreateEnum
CREATE TYPE "deleted_content_policy" AS ENUM ('keep_as_deleted_account', 'erase_everything');

-- CreateEnum
CREATE TYPE "follow_target" AS ENUM ('community', 'topic', 'profile');

-- CreateEnum
CREATE TYPE "media_kind" AS ENUM ('image', 'gif');

-- CreateEnum
CREATE TYPE "invite_status" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "report_target" AS ENUM ('profile', 'community', 'topic', 'answer', 'message');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'reviewed', 'dismissed');

-- CreateEnum
CREATE TYPE "moderation_action_kind" AS ENUM ('remove_topic', 'remove_answer', 'remove_member', 'ban_member', 'add_moderator', 'remove_moderator');

-- CreateEnum
CREATE TYPE "notification_kind" AS ENUM ('topic_became_hot', 'cabin_invite', 'cabin_message', 'followed_topics_digest', 'new_topic_in_community', 'content_removed');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "handle" VARCHAR(20) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "avatar_url" TEXT,
    "bio" VARCHAR(120),
    "age_verified_at" TIMESTAMPTZ(6),
    "terms_version" VARCHAR(20),
    "invite_policy" "invite_policy" NOT NULL DEFAULT 'community_members',
    "notify_new_topic_in_community" BOOLEAN NOT NULL DEFAULT false,
    "notify_topic_became_hot" BOOLEAN NOT NULL DEFAULT true,
    "notify_cabin" BOOLEAN NOT NULL DEFAULT true,
    "notify_followed_topics" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_policy" "deleted_content_policy",

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "default_cover_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "universes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "universe_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "name_normalized" VARCHAR(60) NOT NULL,
    "intro" VARCHAR(240) NOT NULL,
    "cover_url" TEXT,
    "created_by_id" UUID,
    "members_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "community_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "banned_at" TIMESTAMPTZ(6),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("community_id","profile_id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "author_id" UUID,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "media_url" TEXT,
    "media_kind" "media_kind",
    "cycle_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "author_id" UUID,
    "text" VARCHAR(240) NOT NULL,
    "media_url" TEXT,
    "media_kind" "media_kind",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "target" "follow_target" NOT NULL,
    "community_id" UUID,
    "topic_id" UUID,
    "followed_profile_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hot_topics" (
    "community_id" UUID NOT NULL,
    "cycle_date" DATE NOT NULL,
    "topic_id" UUID NOT NULL,
    "distinct_respondents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hot_topics_pkey" PRIMARY KEY ("community_id","cycle_date")
);

-- CreateTable
CREATE TABLE "cabins" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "cabins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_members" (
    "cabin_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "cabin_members_pkey" PRIMARY KEY ("cabin_id","profile_id")
);

-- CreateTable
CREATE TABLE "cabin_invites" (
    "id" UUID NOT NULL,
    "cabin_id" UUID NOT NULL,
    "inviter_id" UUID NOT NULL,
    "invitee_id" UUID NOT NULL,
    "message" VARCHAR(240),
    "status" "invite_status" NOT NULL DEFAULT 'pending',
    "cycle_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "cabin_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "cabin_id" UUID NOT NULL,
    "author_id" UUID,
    "text" VARCHAR(1000),
    "media_url" TEXT,
    "media_kind" "media_kind",
    "shared_community_id" UUID,
    "shared_topic_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID,
    "target" "report_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(40) NOT NULL,
    "details" VARCHAR(500),
    "status" "report_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "moderator_id" UUID,
    "action" "moderation_action_kind" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "kind" "notification_kind" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "profile_id" UUID,
    "name" VARCHAR(60) NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_handle_key" ON "profiles"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "universes_name_key" ON "universes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "universes_slug_key" ON "universes"("slug");

-- CreateIndex
CREATE INDEX "communities_universe_id_idx" ON "communities"("universe_id");

-- CreateIndex
CREATE INDEX "communities_members_count_idx" ON "communities"("members_count");

-- CreateIndex
CREATE UNIQUE INDEX "communities_name_normalized_key" ON "communities"("name_normalized");

-- CreateIndex
CREATE INDEX "memberships_profile_id_idx" ON "memberships"("profile_id");

-- CreateIndex
CREATE INDEX "memberships_community_id_role_idx" ON "memberships"("community_id", "role");

-- CreateIndex
CREATE INDEX "topics_community_id_created_at_idx" ON "topics"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "topics_author_id_idx" ON "topics"("author_id");

-- CreateIndex
CREATE INDEX "answers_topic_id_created_at_idx" ON "answers"("topic_id", "created_at");

-- CreateIndex
CREATE INDEX "answers_author_id_created_at_idx" ON "answers"("author_id", "created_at");

-- CreateIndex
CREATE INDEX "follows_follower_id_target_idx" ON "follows"("follower_id", "target");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_community_id_key" ON "follows"("follower_id", "community_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_topic_id_key" ON "follows"("follower_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_followed_profile_id_key" ON "follows"("follower_id", "followed_profile_id");

-- CreateIndex
CREATE INDEX "hot_topics_topic_id_idx" ON "hot_topics"("topic_id");

-- CreateIndex
CREATE INDEX "cabin_members_profile_id_idx" ON "cabin_members"("profile_id");

-- CreateIndex
CREATE INDEX "cabin_invites_invitee_id_status_idx" ON "cabin_invites"("invitee_id", "status");

-- CreateIndex
CREATE INDEX "cabin_invites_inviter_id_cycle_date_idx" ON "cabin_invites"("inviter_id", "cycle_date");

-- CreateIndex
CREATE INDEX "messages_cabin_id_created_at_idx" ON "messages"("cabin_id", "created_at");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE INDEX "reports_target_target_id_idx" ON "reports"("target", "target_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "moderation_actions_community_id_created_at_idx" ON "moderation_actions"("community_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_profile_id_read_at_created_at_idx" ON "notifications"("profile_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_name_created_at_idx" ON "analytics_events"("name", "created_at");

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_universe_id_fkey" FOREIGN KEY ("universe_id") REFERENCES "universes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followed_profile_id_fkey" FOREIGN KEY ("followed_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hot_topics" ADD CONSTRAINT "hot_topics_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hot_topics" ADD CONSTRAINT "hot_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_members" ADD CONSTRAINT "cabin_members_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_members" ADD CONSTRAINT "cabin_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_invites" ADD CONSTRAINT "cabin_invites_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_invites" ADD CONSTRAINT "cabin_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_invites" ADD CONSTRAINT "cabin_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_cabin_id_fkey" FOREIGN KEY ("cabin_id") REFERENCES "cabins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_community_id_fkey" FOREIGN KEY ("shared_community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_shared_topic_id_fkey" FOREIGN KEY ("shared_topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
