"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { money, statusLabel } from "@/lib/applications";

const errorText = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something went wrong.";
type Conversation = {
  id: string;
  campaign: { id: string; title: string };
  application: { id: string; status: string };
  participants: { id: string; firstName: string; lastName: string }[];
  lastMessage?: { content: string; createdAt: string } | null;
  lastMessageAt: string;
  unread: number;
};
type Message = {
  id: string;
  type: "TEXT" | "SYSTEM";
  content: string;
  createdAt: string;
  sender?: { id: string; firstName: string; lastName: string } | null;
};
type Offer = {
  id: string;
  version: number;
  status: string;
  compensationMinor: number;
  currencyCode: string;
  deliverablesSummary: string;
  startDate?: string;
  endDate?: string;
  deliveryDeadline?: string;
  usageRights?: string;
  additionalTerms?: string;
  expiresAt?: string;
  campaign: { id: string; title: string; slug: string };
  business?: { name: string; slug: string };
  application: {
    id: string;
    status: string;
    proposedAmountMinor: number;
    proposedCurrencyCode: string;
  };
};
type Collaboration = {
  id: string;
  status: string;
  joinedAt: string;
  agreedCompensationMinor: number;
  currencyCode: string;
  campaign: {
    id: string;
    title: string;
    slug: string;
    campaignStartDate?: string;
    campaignEndDate?: string;
  };
  creator: { displayName: string; slug: string };
  business: { name: string; slug: string };
  offer: Offer;
  conversationId?: string | null;
  paymentNotice: string;
};
const safety =
  "Rivera does not currently process Creator campaign payments. Never share passwords or verification codes, and be cautious with requests for unusual upfront payments.";

export function Messages({ role }: { role: "creator" | "business" }) {
  const [items, setItems] = useState<Conversation[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api<Conversation[]>("/conversations")
      .then(setItems)
      .catch((e) => setError(errorText(e)));
  }, []);
  return (
    <main className="application-shell">
      <header>
        <Link href={`/dashboard/${role}`}>← Dashboard</Link>
        <p className="eyebrow">RIVERA MESSAGING</p>
        <h1>Campaign conversations</h1>
        <p>
          Messaging opens after shortlisting. Professional contact details
          remain private until an Offer is accepted.
        </p>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="application-list">
        {items.map((x) => (
          <article className="application-card" key={x.id}>
            <div>
              <p className="eyebrow">
                {statusLabel(x.application.status)} · {x.unread} unread
              </p>
              <h2>{x.campaign.title}</h2>
              <p>{x.lastMessage?.content ?? "Conversation opened"}</p>
            </div>
            <Link href={`/dashboard/${role}/messages/${x.id}`}>
              Open conversation →
            </Link>
          </article>
        ))}
      </div>
      {!items.length && !error && (
        <div className="dashboard-empty">
          <h2>No conversations yet.</h2>
          <p>A conversation appears when a Business shortlists a Creator.</p>
        </div>
      )}
    </main>
  );
}

export function ConversationDetail({
  role,
  id,
}: {
  role: "creator" | "business";
  id: string;
}) {
  const [items, setItems] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    api<{ items: Message[] }>(`/conversations/${id}/messages?limit=100`)
      .then((x) => {
        setItems(x.items);
        void api(`/conversations/${id}/read`, { method: "POST" });
      })
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 7000);
    return () => clearInterval(timer);
  }, [id]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api(`/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setText("");
      await load();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <main className="application-shell message-shell">
      <header>
        <Link href={`/dashboard/${role}/messages`}>← Messages</Link>
        <p className="eyebrow">PRIVATE RIVERA CONVERSATION</p>
        <h1>Campaign discussion</h1>
      </header>
      {error && <p className="form-error">{error}</p>}
      <section className="message-thread" aria-live="polite">
        {items.map((x) => (
          <article
            key={x.id}
            className={`message ${x.type === "SYSTEM" ? "system-message" : ""}`}
          >
            <strong>
              {x.type === "SYSTEM"
                ? "Rivera"
                : x.sender
                  ? `${x.sender.firstName} ${x.sender.lastName}`
                  : "Member"}
            </strong>
            <p>{x.content}</p>
            <time>{new Date(x.createdAt).toLocaleString()}</time>
          </article>
        ))}
      </section>
      <form className="message-composer" onSubmit={send}>
        <label className="field">
          Message
          <textarea
            rows={3}
            maxLength={3000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button className="button primary">Send message</button>
      </form>
      <p className="privacy-note">{safety}</p>
    </main>
  );
}

export function BusinessApplicationActions({
  applicationId,
  campaignId,
  status,
  currencyCode,
  activeOfferId,
}: {
  applicationId: string;
  campaignId: string;
  status: string;
  currencyCode: string;
  activeOfferId?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conversation, setConversation] = useState<string>(),
    [offer, setOffer] = useState({
      amount: "",
      deliverables: "",
      terms: "",
      expiry: "",
    });
  useEffect(() => {
    api<Conversation[]>("/conversations")
      .then((xs) =>
        setConversation(xs.find((x) => x.application.id === applicationId)?.id),
      )
      .catch(() => {});
  }, [applicationId, status]);
  async function action(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ conversationId?: string }>(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      if (result.conversationId) setConversation(result.conversationId);
      location.reload();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }
  return (
    <section className="application-panel">
      <h2>Application actions</h2>
      {error && <p className="form-error">{error}</p>}{" "}
      {["SUBMITTED", "VIEWED"].includes(status) && (
        <div className="dashboard-actions">
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              void action(`/business/applications/${applicationId}/shortlist`)
            }
          >
            Shortlist Creator
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void action(`/business/applications/${applicationId}/reject`, {
                reason: "OTHER",
              })
            }
          >
            Reject
          </button>
        </div>
      )}
      {status === "SHORTLISTED" && (
        <>
          <div className="dashboard-actions">
            {conversation && (
              <Link
                className="button secondary"
                href={`/dashboard/business/messages/${conversation}`}
              >
                Message Creator
              </Link>
            )}
            <button
              className="button secondary"
              onClick={() =>
                void action(
                  `/business/applications/${applicationId}/remove-shortlist`,
                )
              }
            >
              Remove shortlist
            </button>
            <button
              className="button secondary"
              onClick={() =>
                void action(`/business/applications/${applicationId}/reject`, {
                  reason: "OTHER",
                })
              }
            >
              Reject
            </button>
          </div>
          <h3>Send Collaboration Offer</h3>
          <div className="settings-grid">
            <label className="field">
              Compensation ({currencyCode})
              <input
                type="number"
                min="0"
                step="0.01"
                value={offer.amount}
                onChange={(e) => setOffer({ ...offer, amount: e.target.value })}
              />
            </label>
            <label className="field">
              Offer expiry
              <input
                type="datetime-local"
                value={offer.expiry}
                onChange={(e) => setOffer({ ...offer, expiry: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            Agreed deliverables
            <textarea
              rows={5}
              value={offer.deliverables}
              onChange={(e) =>
                setOffer({ ...offer, deliverables: e.target.value })
              }
            />
          </label>
          <label className="field">
            Additional terms
            <textarea
              rows={4}
              value={offer.terms}
              onChange={(e) => setOffer({ ...offer, terms: e.target.value })}
            />
          </label>
          <button
            className="button primary"
            disabled={
              busy || !offer.amount || offer.deliverables.trim().length < 3
            }
            onClick={() =>
              void action(`/business/applications/${applicationId}/offers`, {
                compensationMinor: Math.round(Number(offer.amount) * 100),
                currencyCode,
                deliverablesSummary: offer.deliverables,
                additionalTerms: offer.terms || undefined,
                expiresAt: offer.expiry
                  ? new Date(offer.expiry).toISOString()
                  : undefined,
              })
            }
          >
            Send Offer
          </button>
        </>
      )}
      {status === "OFFERED" && (
        <div className="dashboard-actions">
          {conversation && (
            <Link
              className="button primary"
              href={`/dashboard/business/messages/${conversation}`}
            >
              Message Creator
            </Link>
          )}
          {activeOfferId && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void action(`/business/offers/${activeOfferId}/withdraw`)
              }
            >
              Withdraw Offer
            </button>
          )}
          <span>Offer sent. The Creator can accept or decline it.</span>
        </div>
      )}
      {status === "ACCEPTED" && (
        <div className="dashboard-actions">
          <Link
            className="button primary"
            href={`/dashboard/business/campaigns/${campaignId}/creators`}
          >
            View Collaboration
          </Link>
          {conversation && (
            <Link
              className="button secondary"
              href={`/dashboard/business/messages/${conversation}`}
            >
              Message Creator
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function CreatorOffers({ id }: { id?: string }) {
  const [items, setItems] = useState<Offer[]>([]),
    [error, setError] = useState("");
  const load = () =>
    api<Offer[]>("/creators/me/offers")
      .then(setItems)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, []);
  const offer = id ? items.find((x) => x.id === id) : undefined;
  async function decide(action: "accept" | "decline") {
    try {
      await api(`/creators/me/offers/${id}/${action}`, { method: "POST" });
      location.href =
        action === "accept"
          ? "/dashboard/creator/collaborations"
          : "/dashboard/creator/offers";
    } catch (e) {
      setError(errorText(e));
    }
  }
  if (id && !offer && !error)
    return (
      <main className="application-shell">
        <p>Loading Offer…</p>
      </main>
    );
  if (offer)
    return (
      <main className="application-shell">
        <header>
          <Link href="/dashboard/creator/offers">← Offers</Link>
          <p className="eyebrow">
            OFFER VERSION {offer.version} · {offer.status}
          </p>
          <h1>{offer.campaign.title}</h1>
          <p>
            Creator Proposal:{" "}
            {money(
              offer.application.proposedAmountMinor,
              offer.application.proposedCurrencyCode,
            )}{" "}
            · Business Offer:{" "}
            {money(offer.compensationMinor, offer.currencyCode)}
          </p>
        </header>
        {error && <p className="form-error">{error}</p>}
        <section className="application-panel">
          <h2>Collaboration terms</h2>
          <h3>Deliverables</h3>
          <p>{offer.deliverablesSummary}</p>
          <h3>Usage rights</h3>
          <p>{offer.usageRights || "As discussed in Rivera"}</p>
          <h3>Additional terms</h3>
          <p>{offer.additionalTerms || "None"}</p>
          <p>
            Expiry:{" "}
            {offer.expiresAt
              ? new Date(offer.expiresAt).toLocaleString()
              : "No expiry"}
          </p>
          {offer.status === "SENT" && (
            <div className="dashboard-actions">
              <button
                className="button primary"
                onClick={() => void decide("accept")}
              >
                Accept Offer
              </button>
              <button
                className="button secondary"
                onClick={() => void decide("decline")}
              >
                Decline Offer
              </button>
            </div>
          )}
        </section>
        <p className="privacy-note">{safety}</p>
      </main>
    );
  return (
    <main className="application-shell">
      <header>
        <Link href="/dashboard/creator">← Dashboard</Link>
        <p className="eyebrow">COLLABORATION OFFERS</p>
        <h1>Offers received</h1>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="application-list">
        {items.map((x) => (
          <article className="application-card" key={x.id}>
            <div>
              <p className="eyebrow">
                {x.status} · VERSION {x.version}
              </p>
              <h2>{x.campaign.title}</h2>
              <p>{money(x.compensationMinor, x.currencyCode)}</p>
            </div>
            <Link href={`/dashboard/creator/offers/${x.id}`}>
              Review Offer →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}

function CollaborationView({
  item,
  role,
}: {
  item: Collaboration;
  role: "creator" | "business";
}) {
  const [contact, setContact] = useState<any>(),
    [error, setError] = useState("");
  return (
    <main className="application-shell">
      <header>
        <Link
          href={
            role === "creator"
              ? "/dashboard/creator/collaborations"
              : `/dashboard/business/campaigns/${item.campaign.id}/creators`
          }
        >
          ← Collaborations
        </Link>
        <p className="eyebrow">ACTIVE COLLABORATION</p>
        <h1>{item.campaign.title}</h1>
        <p>
          {role === "creator" ? item.business.name : item.creator.displayName}
        </p>
      </header>
      <div className="application-detail-grid">
        <section className="application-panel">
          <h2>Accepted Offer</h2>
          <dl>
            <dt>Agreed compensation</dt>
            <dd>{money(item.agreedCompensationMinor, item.currencyCode)}</dd>
            <dt>Joined</dt>
            <dd>{new Date(item.joinedAt).toLocaleDateString()}</dd>
            <dt>Payment status</dt>
            <dd>Not managed by Rivera</dd>
          </dl>
          <h3>Deliverables</h3>
          <p>{item.offer.deliverablesSummary}</p>
          <h3>Additional terms</h3>
          <p>{item.offer.additionalTerms || "None"}</p>
          {item.conversationId && (
            <Link
              className="button primary"
              href={`/dashboard/${role}/messages/${item.conversationId}`}
            >
              Open Rivera Conversation
            </Link>
          )}
        </section>
        <section className="application-panel">
          <h2>Professional contact</h2>
          {!contact && (
            <button
              className="button secondary"
              onClick={() =>
                api(`/campaign-participants/${item.id}/contact`)
                  .then(setContact)
                  .catch((e) => setError(errorText(e)))
              }
            >
              View unlocked contact
            </button>
          )}
          {contact && (
            <>
              <h3>Creator</h3>
              <p>
                {contact.creator.professionalContactEmail ||
                  "No professional email provided"}
                <br />
                {contact.creator.professionalPhone ||
                  "No professional phone provided"}
                <br />
                Preferred: {statusLabel(contact.creator.preferredContactMethod)}
              </p>
              <h3>Business</h3>
              <p>
                {contact.business.businessEmail || "No Business email provided"}
                <br />
                {contact.business.businessPhone || "No Business phone provided"}
                <br />
                Preferred:{" "}
                {statusLabel(contact.business.preferredContactMethod)}
              </p>
            </>
          )}
          {error && <p className="form-error">{error}</p>}
          <p className="privacy-note">{safety}</p>
        </section>
      </div>
    </main>
  );
}
export function CreatorCollaborations({ id }: { id?: string }) {
  const [items, setItems] = useState<Collaboration[]>([]);
  useEffect(() => {
    api<Collaboration[]>("/creators/me/collaborations").then(setItems);
  }, []);
  const item = id ? items.find((x) => x.id === id) : undefined;
  if (id)
    return item ? (
      <CollaborationView item={item} role="creator" />
    ) : (
      <main className="application-shell">
        <p>Loading collaboration…</p>
      </main>
    );
  return (
    <main className="application-shell">
      <header>
        <Link href="/dashboard/creator">← Dashboard</Link>
        <p className="eyebrow">HIRED CREATOR WORK</p>
        <h1>Active Collaborations</h1>
      </header>
      <div className="application-list">
        {items.map((x) => (
          <article className="application-card" key={x.id}>
            <div>
              <h2>{x.campaign.title}</h2>
              <p>
                {x.business.name} ·{" "}
                {money(x.agreedCompensationMinor, x.currencyCode)}
              </p>
            </div>
            <Link href={`/dashboard/creator/collaborations/${x.id}`}>
              View Collaboration →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
export function BusinessCollaborations({
  campaignId,
  id,
}: {
  campaignId: string;
  id?: string;
}) {
  const [data, setData] = useState<{
    items: Collaboration[];
    creatorSlots: number;
    active: number;
    slotsRemaining: number;
  }>();
  useEffect(() => {
    api<typeof data>(`/business/campaigns/${campaignId}/participants`).then(
      setData,
    );
  }, [campaignId]);
  const item = id ? data?.items.find((x) => x.id === id) : undefined;
  if (id)
    return item ? (
      <CollaborationView item={item} role="business" />
    ) : (
      <main className="application-shell">
        <p>Loading collaboration…</p>
      </main>
    );
  return (
    <main className="application-shell">
      <header>
        <Link href={`/dashboard/business/campaigns/${campaignId}`}>
          ← Campaign
        </Link>
        <p className="eyebrow">HIRED CREATORS</p>
        <h1>Campaign Collaborations</h1>
        <p>
          {data?.active ?? 0} hired · {data?.slotsRemaining ?? 0} slots
          remaining
        </p>
      </header>
      <div className="application-list">
        {data?.items.map((x) => (
          <article className="application-card" key={x.id}>
            <div>
              <h2>{x.creator.displayName}</h2>
              <p>
                {money(x.agreedCompensationMinor, x.currencyCode)} · {x.status}
              </p>
            </div>
            <Link
              href={`/dashboard/business/campaigns/${campaignId}/creators/${x.id}`}
            >
              View Collaboration →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
