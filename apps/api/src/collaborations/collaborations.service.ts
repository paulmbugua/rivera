/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpStatus, Injectable } from "@nestjs/common";
import { ApplicationStatus, Prisma } from "@prisma/client";
import { ApiException } from "../common/api-error";
import { PrismaService } from "../common/prisma.service";
import { MailService } from "../auth/mail.service";
import { ApplicationStatusService } from "./application-status.service";
import {
  MessageDto,
  MessageQueryDto,
  OfferDto,
  RejectApplicationDto,
} from "./dto";

const activeConversationStates: ApplicationStatus[] = [
  "SHORTLISTED",
  "OFFERED",
  "ACCEPTED",
];
const offerSelect = {
  id: true,
  applicationId: true,
  campaignId: true,
  creatorId: true,
  businessId: true,
  version: true,
  status: true,
  compensationMinor: true,
  currencyCode: true,
  deliverablesSummary: true,
  startDate: true,
  endDate: true,
  deliveryDeadline: true,
  usageRights: true,
  additionalTerms: true,
  expiresAt: true,
  sentAt: true,
  acceptedAt: true,
  declinedAt: true,
  withdrawnAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class CollaborationsService {
  constructor(
    private db: PrismaService,
    private statuses: ApplicationStatusService,
    private mail: MailService,
  ) {}
  private fail(status: HttpStatus, code: string, message: string): never {
    throw new ApiException(status, code, message);
  }
  private async businessApplication(userId: string, id: string) {
    const app = await this.db.campaignApplication.findFirst({
      where: { id, campaign: { business: { userId } } },
      include: {
        campaign: { include: { business: { include: { user: true } } } },
        creator: { include: { user: true } },
        conversation: true,
        collaborationOffers: { orderBy: { version: "desc" } },
      },
    });
    if (!app)
      this.fail(
        HttpStatus.FORBIDDEN,
        "CAMPAIGN_OWNERSHIP_REQUIRED",
        "Only the Campaign owner can manage this Application.",
      );
    return app;
  }
  private async creatorOffer(userId: string, id: string) {
    const offer = await this.db.collaborationOffer.findFirst({
      where: { id, creator: { userId } },
      include: {
        application: true,
        campaign: { include: { business: true } },
        creator: true,
      },
    });
    if (!offer)
      this.fail(HttpStatus.NOT_FOUND, "OFFER_NOT_FOUND", "Offer not found.");
    return offer;
  }
  private audit(
    tx: Prisma.TransactionClient,
    applicationId: string,
    actorUserId: string,
    action: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return tx.applicationAuditLog.create({
      data: { applicationId, actorUserId, action, metadata },
    });
  }
  private system(
    tx: Prisma.TransactionClient,
    conversationId: string,
    content: string,
  ) {
    return Promise.all([
      tx.message.create({ data: { conversationId, type: "SYSTEM", content } }),
      tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);
  }

  async shortlist(userId: string, id: string) {
    const app = await this.businessApplication(userId, id);
    this.statuses.assert(app.status, "SHORTLISTED");
    const value = await this.db.$transaction(
      async (tx) => {
        const updated = await tx.campaignApplication.update({
          where: { id },
          data: { status: "SHORTLISTED", shortlistedAt: new Date() },
        });
        const conversation = await tx.conversation.upsert({
          where: { applicationId: id },
          create: {
            applicationId: id,
            campaignId: app.campaignId,
            participants: {
              create: [{ userId }, { userId: app.creator.userId }],
            },
            messages: {
              create: {
                type: "SYSTEM",
                content: `${app.creator.displayName} was shortlisted for ${app.campaign.title}.`,
              },
            },
          },
          update: {
            participants: {
              createMany: {
                data: [{ userId }, { userId: app.creator.userId }],
                skipDuplicates: true,
              },
            },
            lastMessageAt: new Date(),
          },
        });
        await this.audit(tx, id, userId, "APPLICATION_SHORTLISTED");
        await tx.notification.create({
          data: {
            userId: app.creator.userId,
            creatorId: app.creatorId,
            applicationId: id,
            type: "APPLICATION_SHORTLISTED",
            title: "You were shortlisted",
            body: `You can now message ${app.campaign.business.name} about ${app.campaign.title}.`,
          },
        });
        return { application: updated, conversationId: conversation.id };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    void this.mail.sendMarketplaceEmail(
      app.creator.user.email,
      "You were shortlisted on Rivera",
      `${app.campaign.business.name} shortlisted your application for ${app.campaign.title}. Rivera messaging is now available.`,
      app.creator.userId,
      "APPLICATIONS",
    );
    return value;
  }
  async removeShortlist(userId: string, id: string) {
    const app = await this.businessApplication(userId, id);
    this.statuses.assert(app.status, "VIEWED");
    return this.db.$transaction(async (tx) => {
      const updated = await tx.campaignApplication.update({
        where: { id },
        data: { status: "VIEWED", shortlistedAt: null },
      });
      await this.audit(tx, id, userId, "APPLICATION_SHORTLIST_REMOVED");
      if (app.conversation)
        await this.system(
          tx,
          app.conversation.id,
          "The shortlist was removed. Messaging is paused unless the Creator is shortlisted again.",
        );
      return updated;
    });
  }
  async reject(userId: string, id: string, dto: RejectApplicationDto) {
    const app = await this.businessApplication(userId, id);
    this.statuses.assert(app.status, "REJECTED");
    return this.db.$transaction(async (tx) => {
      const updated = await tx.campaignApplication.update({
        where: { id },
        data: { status: "REJECTED", rejectedAt: new Date() },
      });
      await this.audit(tx, id, userId, "APPLICATION_REJECTED", {
        reason: dto.reason,
        note: dto.note ?? null,
      });
      if (app.conversation)
        await this.system(
          tx,
          app.conversation.id,
          `The Application was not selected (${dto.reason.replaceAll("_", " ").toLowerCase()}).`,
        );
      await tx.notification.create({
        data: {
          userId: app.creator.userId,
          creatorId: app.creatorId,
          applicationId: id,
          type: "APPLICATION_REJECTED",
          title: "Application update",
          body: `Your Application for ${app.campaign.title} was not selected.`,
        },
      });
      return updated;
    });
  }

  private async conversation(userId: string, id: string) {
    const conversation = await this.db.conversation.findFirst({
      where: {
        id,
        participants: { some: { userId } },
        application: { status: { in: activeConversationStates } },
      },
      include: {
        application: { select: { id: true, status: true } },
        campaign: { select: { id: true, title: true, slug: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });
    if (!conversation)
      this.fail(
        HttpStatus.FORBIDDEN,
        "CONVERSATION_ACCESS_DENIED",
        "You cannot access this Conversation.",
      );
    return conversation;
  }
  async conversations(userId: string) {
    const rows = await this.db.conversation.findMany({
      where: {
        participants: { some: { userId } },
        application: { status: { in: activeConversationStates } },
      },
      include: {
        campaign: { select: { id: true, title: true, slug: true } },
        application: { select: { id: true, status: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
    });
    return Promise.all(
      rows.map(async (row) => {
        const membership = row.participants.find((p) => p.userId === userId)!;
        const unread = await this.db.message.count({
          where: {
            conversationId: row.id,
            createdAt: { gt: membership.lastReadAt ?? membership.joinedAt },
            NOT: { senderId: userId },
          },
        });
        return {
          id: row.id,
          campaign: row.campaign,
          application: row.application,
          participants: row.participants.map((p) => p.user),
          lastMessage: row.messages[0] ?? null,
          lastMessageAt: row.lastMessageAt,
          unread,
        };
      }),
    );
  }
  async messages(userId: string, id: string, query: MessageQueryDto) {
    await this.conversation(userId, id);
    const items = await this.db.message.findMany({
      where: { conversationId: id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: query.limit,
    });
    return {
      items: items.reverse(),
      nextCursor: items.length === query.limit ? items[0]?.id : null,
    };
  }
  async sendMessage(userId: string, id: string, dto: MessageDto) {
    const conversation = await this.conversation(userId, id);
    const content = dto.content.trim();
    if (!content)
      this.fail(
        HttpStatus.BAD_REQUEST,
        "EMPTY_MESSAGE",
        "Message cannot be empty.",
      );
    const message = await this.db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: id, senderId: userId, type: "TEXT", content },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      });
      await tx.conversation.update({
        where: { id },
        data: { lastMessageAt: created.createdAt },
      });
      const recipients = conversation.participants.filter(
        (p) => p.userId !== userId,
      );
      if (recipients.length)
        await tx.notification.createMany({
          data: recipients.map((p) => ({
            userId: p.userId,
            applicationId: conversation.application.id,
            type: "NEW_MESSAGE",
            title: "New Rivera message",
            body: `You have a new message about ${conversation.campaign.title}.`,
          })),
        });
      return created;
    });
    return message;
  }
  async markRead(userId: string, id: string) {
    await this.conversation(userId, id);
    await this.db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { lastReadAt: new Date() },
    });
    return { success: true };
  }

  async sendOffer(userId: string, applicationId: string, dto: OfferDto) {
    const app = await this.businessApplication(userId, applicationId);
    if (app.status !== "SHORTLISTED")
      this.fail(
        HttpStatus.CONFLICT,
        "APPLICATION_NOT_SHORTLISTED",
        "Only a shortlisted Creator can receive an Offer.",
      );
    if (dto.currencyCode.toUpperCase() !== app.campaign.currencyCode)
      this.fail(
        HttpStatus.BAD_REQUEST,
        "INVALID_OFFER_CURRENCY",
        `Offer currency must be ${app.campaign.currencyCode}.`,
      );
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date())
      this.fail(
        HttpStatus.BAD_REQUEST,
        "INVALID_OFFER_EXPIRY",
        "Offer expiry must be in the future.",
      );
    const conversation = app.conversation;
    if (!conversation)
      this.fail(
        HttpStatus.CONFLICT,
        "CONVERSATION_REQUIRED",
        "Shortlist the Creator before sending an Offer.",
      );
    const offer = await this.db.$transaction(
      async (tx) => {
        const active = await tx.collaborationOffer.findFirst({
          where: { applicationId, status: "SENT" },
        });
        if (active) {
          await tx.collaborationOffer.update({
            where: { id: active.id },
            data: { status: "WITHDRAWN", withdrawnAt: new Date() },
          });
          await this.system(
            tx,
            conversation.id,
            `Offer version ${active.version} was withdrawn and replaced.`,
          );
        }
        const latest = await tx.collaborationOffer.aggregate({
          where: { applicationId },
          _max: { version: true },
        });
        const created = await tx.collaborationOffer.create({
          data: {
            applicationId,
            campaignId: app.campaignId,
            businessId: app.campaign.businessId,
            creatorId: app.creatorId,
            version: (latest._max.version ?? 0) + 1,
            status: "SENT",
            compensationMinor: dto.compensationMinor,
            currencyCode: app.campaign.currencyCode,
            deliverablesSummary: dto.deliverablesSummary,
            startDate: dto.startDate ? new Date(dto.startDate) : null,
            endDate: dto.endDate ? new Date(dto.endDate) : null,
            deliveryDeadline: dto.deliveryDeadline
              ? new Date(dto.deliveryDeadline)
              : null,
            usageRights: dto.usageRights,
            additionalTerms: dto.additionalTerms,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            sentAt: new Date(),
          },
          select: offerSelect,
        });
        await tx.campaignApplication.update({
          where: { id: applicationId },
          data: { status: "OFFERED" },
        });
        await this.audit(
          tx,
          applicationId,
          userId,
          "COLLABORATION_OFFER_SENT",
          { offerId: created.id, version: created.version },
        );
        await this.system(
          tx,
          conversation.id,
          `Collaboration Offer version ${created.version} was sent.`,
        );
        await tx.notification.create({
          data: {
            userId: app.creator.userId,
            creatorId: app.creatorId,
            applicationId,
            type: "OFFER_RECEIVED",
            title: "Collaboration Offer received",
            body: `${app.campaign.business.name} sent an Offer for ${app.campaign.title}.`,
          },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    void this.mail.sendMarketplaceEmail(
      app.creator.user.email,
      "Collaboration Offer received",
      `${app.campaign.business.name} sent you a Collaboration Offer for ${app.campaign.title}. Review it in Rivera.`,
      app.creator.userId,
      "OFFERS",
    );
    return offer;
  }
  async withdrawOffer(userId: string, id: string) {
    const offer = await this.db.collaborationOffer.findFirst({
      where: { id, business: { userId } },
      include: {
        application: {
          include: { conversation: true, creator: { include: { user: true } } },
        },
        campaign: true,
      },
    });
    if (!offer)
      this.fail(HttpStatus.NOT_FOUND, "OFFER_NOT_FOUND", "Offer not found.");
    if (offer.status !== "SENT")
      this.fail(
        HttpStatus.CONFLICT,
        "OFFER_NOT_ACTIVE",
        "Only a sent Offer can be withdrawn.",
      );
    return this.db.$transaction(async (tx) => {
      const updated = await tx.collaborationOffer.update({
        where: { id },
        data: { status: "WITHDRAWN", withdrawnAt: new Date() },
        select: offerSelect,
      });
      await tx.campaignApplication.update({
        where: { id: offer.applicationId },
        data: { status: "SHORTLISTED" },
      });
      await this.audit(
        tx,
        offer.applicationId,
        userId,
        "COLLABORATION_OFFER_WITHDRAWN",
        { offerId: id },
      );
      if (offer.application.conversation)
        await this.system(
          tx,
          offer.application.conversation.id,
          "The Business withdrew the Collaboration Offer.",
        );
      await tx.notification.create({
        data: {
          userId: offer.application.creator.userId,
          creatorId: offer.creatorId,
          applicationId: offer.applicationId,
          type: "OFFER_WITHDRAWN",
          title: "Offer withdrawn",
          body: `The Offer for ${offer.campaign.title} was withdrawn.`,
        },
      });
      return updated;
    });
  }
  async offers(userId: string) {
    const creator = await this.db.creatorProfile.findUnique({
      where: { userId },
    });
    if (!creator)
      this.fail(
        HttpStatus.BAD_REQUEST,
        "CREATOR_PROFILE_REQUIRED",
        "Complete your Creator profile first.",
      );
    return this.db.collaborationOffer.findMany({
      where: { creatorId: creator.id },
      select: {
        ...offerSelect,
        campaign: { select: { id: true, title: true, slug: true } },
        business: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        application: {
          select: {
            id: true,
            status: true,
            proposedAmountMinor: true,
            proposedCurrencyCode: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async offer(userId: string, id: string) {
    const item = await this.creatorOffer(userId, id);
    return {
      ...item,
      creator: undefined,
      campaign: {
        id: item.campaign.id,
        title: item.campaign.title,
        slug: item.campaign.slug,
        currencyCode: item.campaign.currencyCode,
        business: item.campaign.business,
      },
      application: {
        id: item.application.id,
        status: item.application.status,
        proposedAmountMinor: item.application.proposedAmountMinor,
        proposedCurrencyCode: item.application.proposedCurrencyCode,
        pitch: item.application.pitch,
        proposedDeliverables: item.application.proposedDeliverables,
      },
    };
  }
  async declineOffer(userId: string, id: string) {
    const offer = await this.creatorOffer(userId, id);
    if (offer.status !== "SENT" || offer.application.status !== "OFFERED")
      this.fail(
        HttpStatus.CONFLICT,
        "OFFER_NOT_ACTIVE",
        "This Offer can no longer be declined.",
      );
    const result = await this.db.$transaction(async (tx) => {
      const updated = await tx.collaborationOffer.update({
        where: { id },
        data: { status: "DECLINED", declinedAt: new Date() },
        select: offerSelect,
      });
      await tx.campaignApplication.update({
        where: { id: offer.applicationId },
        data: { status: "SHORTLISTED" },
      });
      await this.audit(
        tx,
        offer.applicationId,
        userId,
        "COLLABORATION_OFFER_DECLINED",
        { offerId: id },
      );
      const conversation = await tx.conversation.findUnique({
        where: { applicationId: offer.applicationId },
      });
      if (conversation)
        await this.system(
          tx,
          conversation.id,
          "The Creator declined the Collaboration Offer. Negotiation may continue.",
        );
      await tx.notification.create({
        data: {
          userId: offer.campaign.business.userId,
          businessId: offer.campaign.businessId,
          applicationId: offer.applicationId,
          type: "OFFER_DECLINED",
          title: "Offer declined",
          body: `The Creator declined Offer version ${offer.version} for ${offer.campaign.title}.`,
        },
      });
      return updated;
    });
    return result;
  }
  async acceptOffer(userId: string, id: string) {
    const current = await this.creatorOffer(userId, id);
    if (
      current.status === "SENT" &&
      current.expiresAt &&
      current.expiresAt <= new Date()
    ) {
      await this.db.$transaction(async (tx) => {
        await tx.collaborationOffer.update({
          where: { id },
          data: { status: "EXPIRED" },
        });
        await tx.campaignApplication.updateMany({
          where: { id: current.applicationId, status: "OFFERED" },
          data: { status: "SHORTLISTED" },
        });
        const conversation = await tx.conversation.findUnique({
          where: { applicationId: current.applicationId },
        });
        if (conversation)
          await this.system(
            tx,
            conversation.id,
            "The Collaboration Offer expired before it was accepted.",
          );
      });
      this.fail(
        HttpStatus.CONFLICT,
        "OFFER_EXPIRED",
        "This Offer has expired.",
      );
    }
    const participant = await this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${current.campaignId}))`;
        const offer = await tx.collaborationOffer.findUniqueOrThrow({
          where: { id },
          include: {
            application: true,
            campaign: { include: { business: true } },
            creator: { include: { user: true } },
          },
        });
        if (offer.creator.userId !== userId)
          this.fail(
            HttpStatus.FORBIDDEN,
            "OFFER_ACCESS_DENIED",
            "Only the Offer Creator can accept it.",
          );
        if (offer.status !== "SENT" || offer.application.status !== "OFFERED")
          this.fail(
            HttpStatus.CONFLICT,
            "OFFER_NOT_ACTIVE",
            "This Offer can no longer be accepted.",
          );
        if (offer.expiresAt && offer.expiresAt <= new Date()) {
          this.fail(
            HttpStatus.CONFLICT,
            "OFFER_EXPIRED",
            "This Offer has expired.",
          );
        }
        if (!["OPEN", "IN_PROGRESS"].includes(offer.campaign.status))
          this.fail(
            HttpStatus.CONFLICT,
            "CAMPAIGN_NOT_ACTIVE",
            "This Campaign is not accepting Offer decisions.",
          );
        const hired = await tx.campaignParticipant.count({
          where: {
            campaignId: offer.campaignId,
            status: { in: ["AWAITING_FUNDING", "ACTIVE", "COMPLETED"] },
          },
        });
        if (hired >= offer.campaign.creatorSlots)
          this.fail(
            HttpStatus.CONFLICT,
            "CAMPAIGN_SLOTS_FILLED",
            "All Creator slots are filled.",
          );
        const acceptedAt = new Date();
        const fundingDeadlineHours = Number(
          process.env.COLLABORATION_FUNDING_DEADLINE_HOURS ?? 48,
        );
        const fundingDueAt = new Date(
          acceptedAt.getTime() + fundingDeadlineHours * 60 * 60_000,
        );
        await tx.collaborationOffer.update({
          where: { id },
          data: { status: "ACCEPTED", acceptedAt },
        });
        await tx.campaignApplication.update({
          where: { id: offer.applicationId },
          data: { status: "ACCEPTED", acceptedAt },
        });
        const created = await tx.campaignParticipant.create({
          data: {
            campaignId: offer.campaignId,
            creatorId: offer.creatorId,
            businessId: offer.campaign.businessId,
            applicationId: offer.applicationId,
            offerId: id,
            status: "AWAITING_FUNDING",
            agreedCompensationMinor: offer.compensationMinor,
            currencyCode: offer.currencyCode,
            joinedAt: acceptedAt,
            fundingDueAt,
          },
          include: {
            campaign: true,
            creator: { include: { user: true } },
            business: { include: { user: true } },
            offer: true,
            application: { include: { conversation: true } },
          },
        });
        const deliverables = await tx.campaignDeliverable.findMany({
          where: { campaignId: offer.campaignId },
          orderBy: { sortOrder: "asc" },
        });
        const work = deliverables.length
          ? deliverables
          : [{ title: "Agreed deliverables", description: offer.deliverablesSummary, quantity: 1, platform: null, contentTypeId: null, dueDate: offer.deliveryDeadline, sortOrder: 0 }];
        await tx.campaignWorkItem.createMany({
          data: work.map((item) => ({
            campaignParticipantId: created.id,
            campaignId: offer.campaignId,
            creatorId: offer.creatorId,
            businessId: offer.campaign.businessId,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            platform: item.platform,
            contentTypeId: item.contentTypeId,
            dueDate: item.dueDate,
            sortOrder: item.sortOrder,
            required: true,
          })),
        });
        if (hired + 1 >= offer.campaign.creatorSlots)
          await tx.campaign.update({
            where: { id: offer.campaignId },
            data: { status: "IN_PROGRESS" },
          });
        await this.audit(
          tx,
          offer.applicationId,
          userId,
          "COLLABORATION_OFFER_ACCEPTED",
          { offerId: id, participantId: created.id },
        );
        if (created.application.conversation)
          await this.system(
            tx,
            created.application.conversation.id,
            "The Collaboration Offer was accepted. The collaboration is awaiting Business funding before work can begin.",
          );
        await tx.notification.createMany({
          data: [
            {
              userId: offer.creator.userId,
              creatorId: offer.creatorId,
              applicationId: offer.applicationId,
              type: "COLLABORATION_AWAITING_FUNDING",
              title: "You're hired — waiting for funding",
              body: `The Business must fund ${offer.campaign.title} before Campaign work can begin.`,
            },
            {
              userId: offer.campaign.business.userId,
              businessId: offer.campaign.businessId,
              applicationId: offer.applicationId,
              type: "OFFER_ACCEPTED",
              title: "Offer accepted",
              body: `${offer.creator.displayName} accepted the Offer for ${offer.campaign.title}. Fund the collaboration by ${fundingDueAt.toISOString()}.`,
            },
            ...(hired + 1 >= offer.campaign.creatorSlots
              ? [
                  {
                    userId: offer.campaign.business.userId,
                    businessId: offer.campaign.businessId,
                    applicationId: offer.applicationId,
                    type: "CAMPAIGN_SLOTS_FILLED",
                    title: "Campaign slots filled",
                    body: `All Creator slots for ${offer.campaign.title} are filled.`,
                  },
                ]
              : []),
          ],
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    void this.mail.sendMarketplaceEmail(
      participant.business.user.email,
      "Your Rivera Offer was accepted",
      `${participant.creator.displayName} accepted the Offer for ${participant.campaign.title}. Fund the collaboration before Campaign work begins.`,
      participant.business.userId,
      "OFFERS",
    );
    return this.participantDto(participant);
  }

  private participantDto(p: any) {
    const paymentStatus = p.collaborationPayment?.status ?? "NOT_FUNDED";
    const fundingOverdue =
      p.status === "AWAITING_FUNDING" &&
      p.fundingDueAt &&
      new Date(p.fundingDueAt) < new Date();
    return {
      id: p.id,
      status: p.status,
      joinedAt: p.joinedAt,
      fundingDueAt: p.fundingDueAt,
      fundingOverdue: Boolean(fundingOverdue),
      activatedAt: p.activatedAt,
      endedAt: p.endedAt,
      agreedCompensationMinor: p.agreedCompensationMinor,
      currencyCode: p.currencyCode,
      campaign: {
        id: p.campaign.id,
        title: p.campaign.title,
        slug: p.campaign.slug,
        campaignStartDate: p.campaign.campaignStartDate,
        campaignEndDate: p.campaign.campaignEndDate,
      },
      creator: {
        id: p.creator.id,
        displayName: p.creator.displayName,
        slug: p.creator.slug,
        profileImageUrl: p.creator.profileImageUrl,
      },
      business: {
        id: p.business.id,
        name: p.business.name,
        slug: p.business.slug,
        logoUrl: p.business.logoUrl,
      },
      offer: { ...p.offer },
      conversationId: p.application?.conversation?.id ?? null,
      fundingStatus: paymentStatus,
      paymentNotice:
        paymentStatus === "FUNDED"
          ? "Funded — work can begin. Creator payout is released only after approved completion."
          : "The Business must fund this collaboration before the Creator submits Campaign work through Rivera.",
    };
  }
  private participantInclude() {
    return {
      campaign: true,
      creator: true,
      business: true,
      offer: true,
      application: { include: { conversation: true } },
      collaborationPayment: {
        select: { id: true, status: true, fundedAt: true },
      },
    } as const;
  }
  async creatorCollaborations(userId: string, id?: string) {
    const creator = await this.db.creatorProfile.findUnique({
      where: { userId },
    });
    if (!creator)
      this.fail(
        HttpStatus.BAD_REQUEST,
        "CREATOR_PROFILE_REQUIRED",
        "Complete your Creator profile first.",
      );
    if (id) {
      const item = await this.db.campaignParticipant.findFirst({
        where: { id, creatorId: creator.id },
        include: this.participantInclude(),
      });
      if (!item)
        this.fail(
          HttpStatus.NOT_FOUND,
          "COLLABORATION_NOT_FOUND",
          "Collaboration not found.",
        );
      return this.participantDto(item);
    }
    const items = await this.db.campaignParticipant.findMany({
      where: { creatorId: creator.id },
      include: this.participantInclude(),
      orderBy: { joinedAt: "desc" },
    });
    return items.map((x) => this.participantDto(x));
  }
  async businessParticipants(userId: string, campaignId: string, id?: string) {
    const campaign = await this.db.campaign.findFirst({
      where: { id: campaignId, business: { userId } },
    });
    if (!campaign)
      this.fail(
        HttpStatus.FORBIDDEN,
        "CAMPAIGN_OWNERSHIP_REQUIRED",
        "Only the Campaign owner can view its hired Creators.",
      );
    if (id) {
      const item = await this.db.campaignParticipant.findFirst({
        where: { id, campaignId },
        include: this.participantInclude(),
      });
      if (!item)
        this.fail(
          HttpStatus.NOT_FOUND,
          "COLLABORATION_NOT_FOUND",
          "Collaboration not found.",
        );
      return this.participantDto(item);
    }
    const items = await this.db.campaignParticipant.findMany({
      where: { campaignId },
      include: this.participantInclude(),
      orderBy: { joinedAt: "desc" },
    });
    return {
      items: items.map((x) => this.participantDto(x)),
      creatorSlots: campaign.creatorSlots,
      accepted: items.filter((x) => x.status !== "CANCELLED").length,
      awaitingFunding: items.filter(
        (x) => x.status === "AWAITING_FUNDING",
      ).length,
      active: items.filter((x) => x.status === "ACTIVE").length,
      slotsRemaining: Math.max(
        0,
        campaign.creatorSlots -
          items.filter((x) =>
            ["AWAITING_FUNDING", "ACTIVE", "COMPLETED"].includes(x.status),
          ).length,
      ),
    };
  }
  async cancelUnfunded(
    userId: string,
    id: string,
    role: "CREATOR" | "BUSINESS",
  ) {
    const participant = await this.db.campaignParticipant.findFirst({
      where: {
        id,
        ...(role === "CREATOR"
          ? { creator: { userId } }
          : { business: { userId } }),
      },
      include: {
        creator: { include: { user: true } },
        business: { include: { user: true } },
        campaign: true,
        collaborationPayment: true,
        application: { include: { conversation: true } },
      },
    });
    if (!participant)
      this.fail(
        HttpStatus.FORBIDDEN,
        "COLLABORATION_CANCELLATION_DENIED",
        "Only this collaboration's Creator or Business can cancel it.",
      );
    if (participant.status !== "AWAITING_FUNDING")
      this.fail(
        HttpStatus.CONFLICT,
        "COLLABORATION_NOT_AWAITING_FUNDING",
        "Only an unfunded collaboration can be cancelled here.",
      );
    if (
      participant.collaborationPayment &&
      !["NOT_FUNDED", "FAILED", "CANCELLED"].includes(
        participant.collaborationPayment.status,
      )
    )
      this.fail(
        HttpStatus.CONFLICT,
        "COLLABORATION_FUNDING_IN_PROGRESS",
        "This collaboration cannot be cancelled while funding is processing or confirmed.",
      );
    if (
      role === "CREATOR" &&
      (!participant.fundingDueAt || participant.fundingDueAt > new Date())
    )
      this.fail(
        HttpStatus.CONFLICT,
        "FUNDING_DEADLINE_NOT_PASSED",
        "The Creator can cancel after the Business funding deadline passes.",
      );
    const now = new Date();
    return this.db.$transaction(async (tx) => {
      const cancelled = await tx.campaignParticipant.updateMany({
        where: { id, status: "AWAITING_FUNDING" },
        data: { status: "CANCELLED", endedAt: now },
      });
      if (!cancelled.count)
        this.fail(
          HttpStatus.CONFLICT,
          "COLLABORATION_STATE_CHANGED",
          "The collaboration changed while cancellation was being processed.",
        );
      if (participant.collaborationPayment)
        await tx.collaborationPayment.updateMany({
          where: {
            id: participant.collaborationPayment.id,
            fundedAt: null,
            status: { in: ["NOT_FUNDED", "FAILED", "CANCELLED"] },
          },
          data: { status: "CANCELLED" },
        });
      await tx.applicationAuditLog.create({
        data: {
          applicationId: participant.applicationId,
          actorUserId: userId,
          action: "COLLABORATION_CANCELLED_UNFUNDED",
          metadata: { participantId: id, role },
        },
      });
      const other =
        role === "CREATOR"
          ? participant.business.user
          : participant.creator.user;
      await tx.notification.create({
        data: {
          userId: other.id,
          creatorId: role === "BUSINESS" ? participant.creatorId : null,
          businessId: role === "CREATOR" ? participant.businessId : null,
          applicationId: participant.applicationId,
          type: "COLLABORATION_CANCELLED_UNFUNDED",
          title: "Unfunded collaboration cancelled",
          body: `The unfunded collaboration for ${participant.campaign.title} was cancelled.`,
        },
      });
      if (participant.application.conversation)
        await this.system(
          tx,
          participant.application.conversation.id,
          "The unfunded collaboration was cancelled. No Campaign work or Creator payout is due.",
        );
      return tx.campaignParticipant.findUniqueOrThrow({ where: { id } });
    });
  }
  async contact(userId: string, id: string) {
    const item = await this.db.campaignParticipant.findFirst({
      where: {
        id,
        status: { in: ["ACTIVE", "COMPLETED"] },
        OR: [{ creator: { userId } }, { business: { userId } }],
      },
      include: { creator: true, business: true },
    });
    if (!item)
      this.fail(
        HttpStatus.FORBIDDEN,
        "COLLABORATION_CONTACT_LOCKED",
        "Professional contact details unlock only for active or completed collaboration participants.",
      );
    return {
      creator: {
        professionalContactEmail: item.creator.professionalContactEmail,
        professionalPhone: item.creator.professionalPhone,
        preferredContactMethod: item.creator.preferredContactMethod,
      },
      business: {
        businessEmail: item.business.businessEmail,
        businessPhone: item.business.businessPhone,
        preferredContactMethod: item.business.preferredContactMethod,
      },
      safetyNotice:
        "Funding and payout are separate Rivera states. Never share passwords, verification codes, card details or bank credentials in messages.",
    };
  }
  async dashboard(userId: string, role: "CREATOR" | "BUSINESS") {
    if (role === "CREATOR") {
      const creator = await this.db.creatorProfile.findUnique({
        where: { userId },
      });
      if (!creator) return {};
      const [shortlisted, offers, awaitingFunding, active, unread] =
        await Promise.all([
        this.db.campaignApplication.count({
          where: { creatorId: creator.id, status: "SHORTLISTED" },
        }),
        this.db.collaborationOffer.count({
          where: { creatorId: creator.id, status: "SENT" },
        }),
        this.db.campaignParticipant.count({
          where: { creatorId: creator.id, status: "AWAITING_FUNDING" },
        }),
        this.db.campaignParticipant.count({
          where: { creatorId: creator.id, status: "ACTIVE" },
        }),
        this.db.message.count({
          where: {
            conversation: { participants: { some: { userId } } },
            NOT: { senderId: userId },
            createdAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60_000) },
          },
        }),
      ]);
      return {
        shortlisted,
        offersReceived: offers,
        awaitingFunding,
        activeCollaborations: active,
        recentMessages: unread,
      };
    }
    const business = await this.db.businessProfile.findUnique({
      where: { userId },
    });
    if (!business) return {};
    const [shortlisted, offers, awaitingFunding, active, hired, slots] =
      await Promise.all([
      this.db.campaignApplication.count({
        where: { campaign: { businessId: business.id }, status: "SHORTLISTED" },
      }),
      this.db.collaborationOffer.count({
        where: { businessId: business.id, status: "SENT" },
      }),
      this.db.campaignParticipant.count({
        where: { businessId: business.id, status: "AWAITING_FUNDING" },
      }),
      this.db.campaignParticipant.count({
        where: { businessId: business.id, status: "ACTIVE" },
      }),
      this.db.campaignParticipant.count({
        where: {
          businessId: business.id,
          status: { in: ["AWAITING_FUNDING", "ACTIVE", "COMPLETED"] },
        },
      }),
      this.db.campaign.aggregate({
        where: {
          businessId: business.id,
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
        _sum: { creatorSlots: true },
      }),
    ]);
    return {
      shortlisted,
      offersSent: offers,
      awaitingFunding,
      fundedCreators: active,
      creatorsHired: hired,
      slotsRemaining: Math.max(0, (slots._sum.creatorSlots ?? 0) - hired),
    };
  }
}
