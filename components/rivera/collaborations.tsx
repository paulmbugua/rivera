"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, API_URL } from "@/lib/api";
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
  fundingDueAt?: string;
  fundingOverdue?: boolean;
  activatedAt?: string;
  fundingStatus?: string;
  canSubmitWork?: boolean;
  completedAt?: string;
  progress?: { required: number; approved: number; percent: number; readyForCompletion: boolean };
  myReview?: { id: string; rating: number } | null;
  workItems?: WorkItem[];
};
type FundingQuote={campaignParticipantId:string;grossAmountMinor:number;platformFeeMinor:number;creatorNetMinor:number;currencyCode:string;status:string};
type Asset = { id:string; type:"FILE"|"LINK"; name:string; url?:string; mimeType?:string; fileSize?:number };
type Submission = { id:string; version:number; status:string; message?:string; revisionNote?:string; submittedAt:string; assets:Asset[] };
type WorkItem = { id:string; title:string; description?:string; quantity:number; dueDate?:string; required:boolean; status:string; submissions:Submission[] };
type CollaborationContact={creator:{professionalContactEmail?:string;professionalPhone?:string;preferredContactMethod:string};business:{businessEmail?:string;businessPhone?:string;preferredContactMethod:string}};
const safety =
  "Rivera funding, release and payout status is shown in your financial dashboard. Never share passwords, verification codes, card details or bank credentials in messages.";

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
  const [contact, setContact] = useState<CollaborationContact>(), [workspace,setWorkspace]=useState<Collaboration>(item), [funding,setFunding]=useState<FundingQuote>(),
    [error, setError] = useState(""), [busy,setBusy]=useState(""), [message,setMessage]=useState<Record<string,string>>({}), [link,setLink]=useState<Record<string,string>>({}), [files,setFiles]=useState<Record<string,File|undefined>>({}), [rating,setRating]=useState(5), [comment,setComment]=useState("");
  const load=()=>api<Collaboration>(role==="creator"?`/creators/me/collaborations/${item.id}/work-items`:`/business/campaign-participants/${item.id}/work-items`).then(setWorkspace).catch(e=>setError(errorText(e)));
  useEffect(()=>{void load();if(role==="business")void api<FundingQuote[]>("/business/collaboration-payments").then(rows=>setFunding(rows.find(x=>x.campaignParticipantId===item.id))).catch(e=>setError(errorText(e)))},[item.id,role]);
  async function submit(workItemId:string){setBusy(workItemId);setError("");try{const file=files[workItemId];if(file){const data=new FormData();data.append("file",file);data.append("message",message[workItemId]??"");await api(`/creators/me/work-items/${workItemId}/submissions/file`,{method:"POST",body:data});}else{await api(`/creators/me/work-items/${workItemId}/submissions`,{method:"POST",body:JSON.stringify({message:message[workItemId]||undefined,links:link[workItemId]?.trim()?[{name:"Deliverable link",url:link[workItemId].trim()}]:[]})});}setMessage({...message,[workItemId]:""});setLink({...link,[workItemId]:""});await load();}catch(e){setError(errorText(e));}finally{setBusy("");}}
  async function act(path:string,body?:unknown){setBusy(path);setError("");try{await api(path,{method:"POST",body:body?JSON.stringify(body):undefined});await load();}catch(e){setError(errorText(e));}finally{setBusy("");}}
  async function review(){await act("/reviews",{participantId:item.id,rating,comment:comment||undefined});}
  async function fund(){if(!funding||!window.confirm(`Fund this collaboration for ${money(funding.grossAmountMinor,funding.currencyCode)}?`))return;setBusy("fund");setError("");try{const result=await api<{checkoutUrl?:string}>(`/business/campaign-participants/${item.id}/payment`,{method:"POST"});if(result.checkoutUrl){window.location.assign(result.checkoutUrl);return;}await load();}catch(e){setError(errorText(e));}finally{setBusy("");}}
  async function cancelUnfunded(){if(!window.confirm("Cancel this unfunded collaboration and release its reserved Campaign slot?"))return;await act(role==="business"?`/business/campaign-participants/${item.id}/cancel-unfunded`:`/creators/me/collaborations/${item.id}/cancel-unfunded`);}
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
        <p className="eyebrow">{workspace.status} COLLABORATION</p>
        <h1>{item.campaign.title}</h1>
        <p>
          {role === "creator" ? item.business.name : item.creator.displayName}
        </p>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {workspace.status==="AWAITING_FUNDING"&&<section className="application-panel" aria-label="Funding required"><p className="eyebrow">AWAITING FUNDING</p><h2>{role==="creator"?"You’re hired — waiting for Business funding.":"Fund this collaboration before work begins"}</h2><p>{role==="creator"?"The Business must fund this collaboration before you begin submitting Campaign work through Rivera.":"This collaboration must be funded before Campaign work can be submitted."} Formal work is locked until Rivera verifies payment.</p>{workspace.fundingDueAt&&<p><strong>Funding deadline:</strong> {new Date(workspace.fundingDueAt).toLocaleString()}{workspace.fundingOverdue?" · Overdue":""}</p>}{role==="business"&&funding&&<><dl><dt>Creator compensation</dt><dd>{money(funding.creatorNetMinor,funding.currencyCode)}</dd><dt>Rivera fee</dt><dd>{money(funding.platformFeeMinor,funding.currencyCode)}</dd><dt>Total Business payment</dt><dd>{money(funding.grossAmountMinor,funding.currencyCode)}</dd></dl><div className="dashboard-actions"><button className="button primary" disabled={!!busy||funding.status==="PAYMENT_PENDING"} onClick={()=>void fund()}>{funding.status==="PAYMENT_PENDING"?"Payment processing":"Fund Collaboration"}</button><button className="button secondary" disabled={!!busy} onClick={()=>void cancelUnfunded()}>Cancel unfunded collaboration</button></div></>}{role==="creator"&&workspace.fundingOverdue&&<button className="button secondary" disabled={!!busy} onClick={()=>void cancelUnfunded()}>Cancel overdue unfunded collaboration</button>}</section>}
      {workspace.status==="ACTIVE"&&workspace.fundingStatus==="FUNDED"&&<section className="application-panel"><p className="eyebrow">FUNDED · WORK UNLOCKED</p><h2>Funding confirmed. Work can now begin.</h2>{role==="creator"&&<p>Complete payout setup before earnings can be released. Funded compensation is not the same as money received.</p>}</section>}
      <section className="application-panel" aria-label="Deliverable progress">
        <p className="eyebrow">WORKSPACE PROGRESS</p>
        <h2>{workspace.progress?.approved??0} of {workspace.progress?.required??0} required items approved</h2>
        <progress max={100} value={workspace.progress?.percent??0} style={{width:"100%"}}>{workspace.progress?.percent??0}%</progress>
      </section>
      <div className="application-detail-grid">
        <section className="application-panel">
          <h2>Accepted Offer</h2>
          <dl>
            <dt>Agreed compensation</dt>
            <dd>{money(item.agreedCompensationMinor, item.currencyCode)}</dd>
            <dt>Joined</dt>
            <dd>{new Date(item.joinedAt).toLocaleDateString()}</dd>
            <dt>Planned start</dt>
            <dd>{item.offer.startDate?new Date(item.offer.startDate).toLocaleDateString():"As agreed in the conversation"}</dd>
            <dt>Planned end</dt>
            <dd>{item.offer.endDate?new Date(item.offer.endDate).toLocaleDateString():"As agreed in the conversation"}</dd>
            <dt>Delivery deadline</dt>
            <dd>{item.offer.deliveryDeadline?new Date(item.offer.deliveryDeadline).toLocaleDateString():"No separate deadline"}</dd>
            <dt>Funding deadline</dt>
            <dd>{workspace.fundingDueAt?new Date(workspace.fundingDueAt).toLocaleString():"Not applicable"}</dd>
            <dt>Activated</dt>
            <dd>{workspace.activatedAt?new Date(workspace.activatedAt).toLocaleString():"Waiting for verified funding"}</dd>
            <dt>Payment status</dt>
            <dd>{statusLabel(workspace.fundingStatus??"NOT_FUNDED")}</dd>
          </dl>
          <h3>Agreed deliverables</h3><p>{item.offer.deliverablesSummary}</p>
          <h3>Usage rights</h3><p>{item.offer.usageRights || "As agreed in Rivera"}</p>
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
                api<CollaborationContact>(`/campaign-participants/${item.id}/contact`)
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
      <section className="application-panel">
        <p className="eyebrow">DELIVERABLE WORKFLOW</p><h2>Work items and submission history</h2>
        <div className="application-list">
          {workspace.workItems?.map(work=><article className="application-card" key={work.id} style={{display:"block"}}>
            <div><p className="eyebrow">{statusLabel(work.status)} · {work.required?"REQUIRED":"OPTIONAL"}</p><h3>{work.title}{work.quantity>1?` × ${work.quantity}`:""}</h3><p>{work.description}</p>{work.dueDate&&<p>Due {new Date(work.dueDate).toLocaleDateString()}</p>}</div>
            {work.submissions.map(sub=><div key={sub.id} className="privacy-note"><strong>Version {sub.version} · {statusLabel(sub.status)}</strong>{sub.message&&<p>{sub.message}</p>}{sub.revisionNote&&<p><strong>Revision note:</strong> {sub.revisionNote}</p>}<div className="dashboard-actions">{sub.assets.map(asset=>asset.type==="LINK"?<a className="button secondary" key={asset.id} href={asset.url} target="_blank" rel="noreferrer">Open {asset.name}</a>:<a className="button secondary" key={asset.id} href={`${API_URL}/submission-assets/${asset.id}/file`}>Download {asset.name}</a>)}</div>
              {role==="business"&&sub===work.submissions[0]&&sub.status==="SUBMITTED"&&<div className="dashboard-actions"><button className="button primary" disabled={!!busy} onClick={()=>void act(`/business/submissions/${sub.id}/approve`)}>Approve</button><button className="button secondary" disabled={!!busy} onClick={()=>{const note=window.prompt("Describe the required revision (at least 10 characters)");if(note)void act(`/business/submissions/${sub.id}/request-revision`,{note});}}>Request revision</button></div>}
            </div>)}
            {role==="creator"&&workspace.canSubmitWork&&["PENDING","IN_PROGRESS","REVISION_REQUESTED"].includes(work.status)&&<div className="settings-grid"><label className="field">Submission note<textarea rows={3} value={message[work.id]??""} onChange={e=>setMessage({...message,[work.id]:e.target.value})}/></label><label className="field">HTTPS deliverable link<input type="url" placeholder="https://…" value={link[work.id]??""} onChange={e=>setLink({...link,[work.id]:e.target.value})}/></label><label className="field">Or private file (JPG, PNG, WEBP, PDF, MP4)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" onChange={e=>setFiles({...files,[work.id]:e.target.files?.[0]})}/></label><button className="button primary" disabled={busy===work.id||(!link[work.id]?.trim()&&!files[work.id])} onClick={()=>void submit(work.id)}>Submit new version</button></div>}
          </article>)}
        </div>
        {role==="business"&&workspace.status==="ACTIVE"&&<button className="button primary" disabled={!workspace.progress?.readyForCompletion||!!busy} onClick={()=>void act(`/business/campaign-participants/${item.id}/complete`)}>Complete collaboration</button>}
      </section>
      {workspace.status==="COMPLETED"&&!workspace.myReview&&<section className="application-panel"><p className="eyebrow">MUTUAL REVIEW</p><h2>Share your experience</h2><label className="field">Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(x=><option value={x} key={x}>{x} star{x===1?"":"s"}</option>)}</select></label><label className="field">Comment<textarea rows={4} maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)}/></label><button className="button primary" disabled={!!busy} onClick={()=>void review()}>Publish review</button></section>}
      {workspace.myReview&&<p className="privacy-note">Your {workspace.myReview.rating}-star review has been published.</p>}
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
        <h1>Your Collaborations</h1>
        <p>Accepted work stays locked until the Business completes funding.</p>
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
              <p>{statusLabel(x.status)} · {statusLabel(x.fundingStatus??"NOT_FUNDED")}</p>
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
    accepted: number;
    awaitingFunding: number;
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
          {data?.accepted ?? 0} accepted · {data?.awaitingFunding ?? 0} awaiting funding · {data?.active ?? 0} funded and active · {data?.slotsRemaining ?? 0} slots remaining
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
