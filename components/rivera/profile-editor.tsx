"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { ChangeEvent, FormEvent, ReactNode, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Protected } from "./protected";
import { countryOptions } from "@/lib/countries";
import { businessProfilePayload, creatorProfilePayload } from "@/lib/profile-draft";
import { useRiveraDialog } from "./rivera-dialog";

type Taxonomy = { id: string; name: string; slug: string };
type Social = {
  id: string;
  platform: string;
  username?: string;
  profileUrl?: string;
  followers: number;
  averageViews?: number;
  engagementRate?: string;
  isPrimary: boolean;
  verifiedByRivera: boolean;
};
type Portfolio = {
  id: string;
  title: string;
  description?: string;
  mediaType: string;
  mediaUrl?: string;
  externalUrl?: string;
  brandName?: string;
  published: boolean;
};
type Creator = {
  displayName: string;
  slug: string;
  headline: string;
  bio: string;
  countryCode: string;
  city: string;
  websiteUrl?: string;
  professionalContactEmail?: string;
  professionalPhone?: string;
  preferredContactMethod?: string;
  yearsExperience?: number;
  travelAvailable: boolean;
  remoteCampaignsAllowed: boolean;
  profileVisibility: string;
  verificationStatus: string;
  profileCompletion: number;
  profileImageUrl?: string;
  coverImageUrl?: string;
  categories: { category: Taxonomy; isPrimary: boolean }[];
  contentTypes: { contentType: Taxonomy }[];
  languages: { languageCode: string; proficiency?: string }[];
  socialAccounts: Social[];
  portfolio: Portfolio[];
  combinedFollowers: number;
};
type Business = {
  businessName: string;
  slug: string;
  shortDescription?: string;
  description: string;
  industryId?: string;
  website?: string;
  businessEmail?: string;
  businessPhone?: string;
  preferredContactMethod?: string;
  countryCode: string;
  city: string;
  address?: string;
  yearEstablished?: number;
  employeeSize?: string;
  profileVisibility: string;
  verificationStatus: string;
  profileCompletion: number;
  logoUrl?: string;
  coverImageUrl?: string;
};
const platforms = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "X",
  "LINKEDIN",
  "SNAPCHAT",
  "TWITCH",
  "PINTEREST",
  "BLOG",
  "PODCAST",
  "OTHER",
];
const message = (error: unknown) =>
  error instanceof ApiError ? error.message : "Please try again.";

type ProfileSection={name:string;hint:string;complete:boolean};
function ProfileStudio({role,completion,visibility,sections,active,onSelect,onSave,busy,dirty,children}:{role:'creator'|'business';completion:number;visibility:string;sections:ProfileSection[];active:number;onSelect:(index:number)=>void;onSave:()=>Promise<boolean>;busy:boolean;dirty:boolean;children:ReactNode}){
  const heading=useRef<HTMLHeadingElement>(null);
  const previous=useRef(active);
  useEffect(()=>{if(previous.current!==active){heading.current?.focus();previous.current=active}},[active]);
  async function next(){if(dirty&&!await onSave())return;onSelect(Math.min(active+1,sections.length-1))}
  return <main className="profile-shell profile-studio">
    <header className="profile-studio-header"><div><Link className="profile-studio-back" href={'/dashboard/'+role}>← Dashboard</Link><h1>{role==='creator'?'Your creator profile':'Your business profile'}</h1><p>A few details. A clearer first impression.</p></div><div className="profile-studio-save"><span role="status">{busy?'Saving…':dirty?'Unsaved changes':'Changes saved'}</span><button type="button" className="button secondary" disabled={busy} onClick={()=>void onSave()}>Save changes</button></div></header>
    <div className="profile-studio-layout"><aside className="profile-studio-sidebar"><div className="profile-studio-strength"><div><span>Profile strength</span><strong>{Math.max(0,Math.min(100,completion))}%</strong></div><div className="profile-studio-meter" role="progressbar" aria-label="Saved profile strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><i style={{width:Math.max(0,Math.min(100,completion))+'%'}}/></div><p>{dirty?'Save to update your progress.':'Build it at your own pace.'}</p></div><nav aria-label="Profile sections"><ol>{sections.map((section,index)=><li key={section.name}><button type="button" aria-current={active===index?'step':undefined} disabled={busy} onClick={()=>onSelect(index)}><span className="profile-studio-number" aria-hidden="true">{section.complete?'✓':index+1}</span><span>{section.name}</span></button></li>)}</ol></nav><p className="profile-studio-tip">✦ A complete profile helps the right people find you.</p></aside>
    <div className="profile-studio-workspace"><div className="profile-studio-step"><span>Section {active+1} of {sections.length}</span><span className="profile-studio-status">{visibility==='PUBLIC'?'Public profile':visibility==='UNLISTED'?'Link only':'Private profile'}</span></div><div className="profile-studio-section-heading"><h2 ref={heading} tabIndex={-1}>{sections[active].name}</h2><p>{sections[active].hint}</p></div>{children}<footer className="profile-studio-footer"><div>{active>0&&<button type="button" className="button secondary" disabled={busy} onClick={()=>onSelect(active-1)}>← Back</button>}</div><button type="button" className="button primary" disabled={busy} onClick={()=>active===sections.length-1?void onSave():void next()}>{busy?'Saving…':active===sections.length-1?'Save changes':dirty?'Save & continue':'Continue'}<span aria-hidden="true">↗</span></button></footer></div></div>
  </main>;
}

function ProfileChoices({title,items,selected,onChange,limit}:{title:string;items:Taxonomy[];selected:string[];onChange:(ids:string[])=>void;limit:number}){
  const [expanded,setExpanded]=useState(false),[query,setQuery]=useState('');
  const visible=items.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())).filter((item,index)=>expanded||index<8||selected.includes(item.id));
  return <div className="profile-choice-group"><div className="profile-field-heading"><h3>{title}</h3><span>{selected.length}/{limit} selected</span></div>{expanded&&<label className="field"><span className="sr-only">Search {title.toLowerCase()}</span><input type="search" placeholder={'Find '+title.toLowerCase()+'…'} value={query} onChange={e=>setQuery(e.target.value)}/></label>}<div className="profile-chips" role="group" aria-label={title}>{visible.map(item=><button key={item.id} type="button" aria-pressed={selected.includes(item.id)} disabled={!selected.includes(item.id)&&selected.length>=limit} onClick={()=>onChange(selected.includes(item.id)?selected.filter(id=>id!==item.id):[...selected,item.id])}>{selected.includes(item.id)?'✓ ':''}{item.name}</button>)}</div>{!items.length&&<p className="profile-help">No choices are available. Refresh the page to try again.</p>}{expanded&&query&&!visible.length&&<p className="profile-help">No matches. Try another word.</p>}{items.length>8&&<button type="button" className="profile-text-button" onClick={()=>{setExpanded(!expanded);setQuery('')}}>{expanded?'Show fewer':'See all '+title.toLowerCase()}</button>}</div>;
}

function ProfileReadiness({items,onSelect}:{items:{label:string;done:boolean;section:number}[];onSelect:(index:number)=>void}){
  const missing=items.filter(item=>!item.done).length;
  return <div className="profile-readiness"><h3>{missing?'A few things to finish':'Ready for the spotlight'}</h3><p>{missing?'Complete these details before publishing.':'Your essential profile details are in place.'}</p><ul>{items.map(item=><li key={item.label}><span aria-hidden="true">{item.done?'✓':'○'}</span><span>{item.label}</span>{!item.done&&<button type="button" className="profile-text-button" onClick={()=>onSelect(item.section)}>Add →</button>}</li>)}</ul></div>;
}

function MediaUpload({
  endpoint,
  label,
  onDone,
  currentUrl,
}: {
  endpoint: string;
  label: string;
  onDone: () => void;
  currentUrl?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const id = useId();
  const isCover = endpoint.endsWith("cover-image");
  const isLogo = endpoint.endsWith("logo");
  const subject = isCover ? "cover image" : isLogo ? "business logo" : "profile photo";
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    setBusy(true);
    setFailed(false);
    setFeedback("");
    try {
      const body = new FormData();
      body.append("file", file);
      await api(endpoint, { method: "POST", body });
      setFeedback(`${label} uploaded.`);
      onDone();
    } catch (error) {
      setFailed(true);
      setFeedback(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={"media-upload media-picker" + (isCover ? " media-picker-cover" : "")} aria-busy={busy}>
      <input
        ref={picker}
        id={id}
        className="media-picker-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={"Choose " + subject}
        tabIndex={-1}
        onChange={(event) => void upload(event)}
        disabled={busy}
      />
      <button
        type="button"
        className="media-picker-target"
        onClick={() => picker.current?.click()}
        disabled={busy}
        aria-label={(currentUrl ? "Change " : "Choose ") + subject}
        aria-describedby={id + "-help"}
      >
        <span className="media-picker-preview" aria-hidden="true">
          {currentUrl ? <Image unoptimized width={160} height={100} src={currentUrl} alt=""/> : isCover ? <ImagePlus size={26}/> : <Camera size={25}/>}
          {currentUrl&&<span className="media-picker-camera"><Camera size={14}/></span>}
        </span>
        <span className="media-picker-copy"><strong>{label}</strong><span>{busy ? "Uploading your image…" : "Click here to browse your device"}</span><small id={id + "-help"}>JPG, PNG or WebP · {isCover ? "A wide image works best" : isLogo ? "Use a square logo" : "Use a clear photo of yourself"}</small></span>
        <span className="media-picker-action">{busy ? <><LoaderCircle size={16} className="media-picker-spinner"/>Uploading…</> : <><ImagePlus size={16}/>{currentUrl ? "Change image" : isCover ? "Choose cover" : isLogo ? "Choose logo" : "Choose photo"}</>}</span>
      </button>
      {feedback&&<p className={"media-picker-feedback"+(failed?" is-error":"")} role={failed?"alert":"status"}>{feedback}</p>}
    </div>
  );
}

export function CreatorProfileEditor() {
  return (
    <Protected role="CREATOR" onboarding>
      <CreatorEditor />
    </Protected>
  );
}
function CreatorEditor() {
  const dialog = useRiveraDialog();
  const [active,setActive]=useState(0),[dirty,setDirty]=useState(false);
  const dirtyRef=useRef(false),saveLock=useRef(false);
  const [profile, setProfile] = useState<Creator | null>(null);
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [contentTypes, setContentTypes] = useState<Taxonomy[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [social, setSocial] = useState({
    platform: "INSTAGRAM",
    username: "",
    profileUrl: "",
    followers: "0",
    averageViews: "",
    engagementRate: "",
  });
  const [portfolio, setPortfolio] = useState({
    title: "",
    description: "",
    mediaType: "EXTERNAL_LINK",
    externalUrl: "",
    brandName: "",
  });
  const load = async () => {
    try {
      const [p, c, t] = await Promise.all([
        api<Creator>("/creators/me/profile"),
        api<Taxonomy[]>("/categories"),
        api<Taxonomy[]>("/content-types"),
      ]);
      setProfile(current=>current&&dirtyRef.current?{...p,...current,profileImageUrl:p.profileImageUrl,coverImageUrl:p.coverImageUrl,socialAccounts:p.socialAccounts,portfolio:p.portfolio,profileCompletion:p.profileCompletion,verificationStatus:p.verificationStatus,combinedFollowers:p.combinedFollowers}:p);
      setCategories(c);
      setContentTypes(t);
    } catch (e) {
      setError(message(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  if (!profile)
    return (
      <main className="profile-shell">
        <p>{error || "Loading profile…"}</p>
      </main>
    );
  const selectedCategories = profile.categories.map((item) => item.category.id);
  const selectedTypes = profile.contentTypes.map((item) => item.contentType.id);
  const patch = (value: Partial<Creator>) => {
    dirtyRef.current=true;setDirty(true);setSuccess('');setError('');
    setProfile((current) => (current ? { ...current, ...value } : current));
  };
  async function save(event?: FormEvent) {
    event?.preventDefault();
    const current = profile;
    if (!current||saveLock.current) return false;
    saveLock.current=true;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api<Creator>("/creators/me/profile", {
        method: "PATCH",
        body: JSON.stringify(creatorProfilePayload(current)),
      });
      setProfile(updated);
      dirtyRef.current=false;setDirty(false);
      setSuccess("Profile updated.");
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      setSaving(false);
      saveLock.current=false;
    }
  }
  async function publish() {
    if(!await save())return;
    setSaving(true);
    setError("");
    try {
      setProfile(
        await api<Creator>("/creators/me/publish", { method: "POST" }),
      );
      setSuccess("Your profile is public.");
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  }
  async function requestVerification() {
    try {
      await api("/verifications/request", {
        method: "POST",
        body: JSON.stringify({ profileType: "CREATOR" }),
      });
      setSuccess("Verification request submitted.");
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function addSocial(event: FormEvent) {
    event.preventDefault();
    if(saveLock.current)return;
    if(!social.username.trim()&&!social.profileUrl.trim()){setError('Add a username or a link to your social profile.');return}
    saveLock.current=true;setSaving(true);setError('');
    try {
      await api("/creators/me/social-accounts", {
        method: "POST",
        body: JSON.stringify({
          ...social,
          username:social.username.trim()||undefined,
          profileUrl:social.profileUrl.trim()||undefined,
          followers: Number(social.followers),
          averageViews: social.averageViews
            ? Number(social.averageViews)
            : undefined,
          engagementRate: social.engagementRate
            ? Number(social.engagementRate)
            : undefined,
        }),
      });
      setSocial({
        ...social,
        username: "",
        profileUrl: "",
        followers: "0",
        averageViews: "",
        engagementRate: "",
      });
      setSuccess("Social account added.");
      void load();
    } catch (e) {
      setError(message(e));
    } finally {
      saveLock.current=false;setSaving(false);
    }
  }
  async function removeSocial(id: string) {
    try {
      await api(`/creators/me/social-accounts/${id}`, { method: "DELETE" });
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function editSocial(item: Social) {
    const followers = await dialog.prompt({
      title: "Update follower count",
      description: `Keep the audience size for ${item.platform.toLowerCase()} accurate and current.`,
      label: "Current followers",
      defaultValue: String(item.followers),
      confirmLabel: "Save followers",
      required: true,
      inputMode: "numeric",
      maxLength: 12,
      validate: (value) => /^\d+$/.test(value) ? undefined : "Enter a whole number using digits only.",
    });
    if (followers === null) return;
    try {
      await api(`/creators/me/social-accounts/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          platform: item.platform,
          username: item.username,
          profileUrl: item.profileUrl,
          followers: Number(followers),
          averageViews: item.averageViews,
          engagementRate: item.engagementRate
            ? Number(item.engagementRate)
            : undefined,
          isPrimary: item.isPrimary,
        }),
      });
      setSuccess("Social account updated.");
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function primarySocial(id: string) {
    try {
      await api(`/creators/me/social-accounts/${id}/primary`, {
        method: "POST",
      });
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function addPortfolio(event: FormEvent) {
    event.preventDefault();
    if(saveLock.current)return;
    saveLock.current=true;setSaving(true);setError('');
    try {
      await api("/creators/me/portfolio", {
        method: "POST",
        body: JSON.stringify({ ...portfolio, published: true }),
      });
      setPortfolio({
        ...portfolio,
        title: "",
        description: "",
        externalUrl: "",
        brandName: "",
      });
      setSuccess("Portfolio item added.");
      void load();
    } catch (e) {
      setError(message(e));
    } finally {
      saveLock.current=false;setSaving(false);
    }
  }
  async function removePortfolio(id: string) {
    try {
      await api(`/creators/me/portfolio/${id}`, { method: "DELETE" });
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function updatePortfolio(item: Portfolio, changes: Partial<Portfolio>) {
    const { id, ...editable } = item;
    try {
      await api(`/creators/me/portfolio/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...editable, ...changes }),
      });
      setSuccess("Portfolio item updated.");
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  async function editPortfolio(item: Portfolio) {
    const title = await dialog.prompt({
      title: "Edit portfolio title",
      description: "Use a short, clear title that helps businesses understand this work.",
      label: "Portfolio title",
      defaultValue: item.title,
      confirmLabel: "Save title",
      required: true,
      minLength: 2,
      maxLength: 120,
    });
    if (!title) return;
    await updatePortfolio(item, { title });
  }
  async function movePortfolio(id: string, direction: -1 | 1) {
    const ids = profile?.portfolio.map((item) => item.id) ?? [];
    const index = ids.indexOf(id),
      target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await api("/creators/me/portfolio/reorder", {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      });
      setSuccess("Portfolio order updated.");
      void load();
    } catch (e) {
      setError(message(e));
    }
  }
  const sections:ProfileSection[]=[
    {name:'The basics',hint:'Introduce yourself. Let brands see the person behind the content.',complete:Boolean(profile.displayName&&profile.headline&&profile.bio&&profile.countryCode&&profile.city)},
    {name:'Photos',hint:'Choose a photo and cover that feel like you.',complete:Boolean(profile.profileImageUrl)},
    {name:'Your expertise',hint:'Choose the topics and formats that make your work stand out.',complete:Boolean(selectedCategories.length&&selectedTypes.length)},
    {name:'Social accounts',hint:'Show brands where your audience lives.',complete:Boolean(profile.socialAccounts.length)},
    {name:'Portfolio',hint:'Let your work do the talking.',complete:Boolean(profile.portfolio.length)},
    {name:'Preferences & sharing',hint:'Choose how you work, check your details and share your profile.',complete:profile.profileVisibility==='PUBLIC'},
  ];
  const readiness=[{label:'Name, headline and bio',done:Boolean(profile.displayName&&profile.headline&&profile.bio),section:0},{label:'Country and city',done:Boolean(profile.countryCode&&profile.city),section:0},{label:'At least one category and content type',done:Boolean(selectedCategories.length&&selectedTypes.length),section:2},{label:'At least one social account',done:Boolean(profile.socialAccounts.length),section:3}];
  return <ProfileStudio role="creator" completion={profile.profileCompletion} visibility={profile.profileVisibility} sections={sections} active={active} onSelect={setActive} onSave={()=>save()} busy={saving} dirty={dirty}>
    {error&&<p className="form-error" role="alert">{error}</p>}{success&&<p className="form-success" role="status">{success}</p>}
    <fieldset className="profile-editor-fields" disabled={saving}>
    <form id="creator-profile-form" onSubmit={e=>void save(e)} className="profile-editor-form">
      {active===0&&<section className="profile-panel">
        <div className="settings-grid"><label className="field">Your name<input maxLength={120} placeholder="The name you use as a creator" value={profile.displayName??''} onChange={e=>patch({displayName:e.target.value})}/></label><label className="field">Headline<input maxLength={120} placeholder="e.g. Beauty & lifestyle creator" value={profile.headline??''} onChange={e=>patch({headline:e.target.value})}/></label></div>
        <label className="field">A little about you<textarea rows={3} maxLength={2000} placeholder="Tell brands what you create, who your audience is, and what makes your work yours." value={profile.bio??''} onChange={e=>patch({bio:e.target.value})}/><small>{(profile.bio??'').length}/2000 characters</small></label>
        <div className="settings-grid"><label className="field">Country<select value={profile.countryCode??''} onChange={e=>patch({countryCode:e.target.value})}><option value="">Choose a country</option>{countryOptions.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label className="field">City<input value={profile.city??''} placeholder="e.g. Nairobi" onChange={e=>patch({city:e.target.value})}/></label></div>
        <details className="profile-more"><summary>Website & experience <span>Optional</span></summary><div className="settings-grid"><label className="field">Website<input type="url" placeholder="https://…" value={profile.websiteUrl??''} onChange={e=>patch({websiteUrl:e.target.value})}/></label><label className="field">Years creating content<input type="number" min={0} max={80} value={profile.yearsExperience??''} onChange={e=>patch({yearsExperience:e.target.value?Number(e.target.value):undefined})}/></label></div></details>
        <details className="profile-more"><summary>Your profile link <span>Optional</span></summary><label className="field">Profile address<small>riveracreators.com/creators/{profile.slug}</small><input value={profile.slug??''} onChange={e=>patch({slug:e.target.value.toLowerCase()})}/></label></details>
      </section>}
      {active===1&&<section className="profile-panel"><MediaUpload endpoint="/uploads/profile-image" label="Profile photo" currentUrl={profile.profileImageUrl} onDone={()=>void load()}/><MediaUpload endpoint="/uploads/cover-image" label="Cover image" currentUrl={profile.coverImageUrl} onDone={()=>void load()}/><p className="profile-note">A clear photo and a cover that reflects your work make a great first impression. Images upload as soon as you choose them.</p></section>}
      {active===2&&<section className="profile-panel">
        <ProfileChoices title="Categories" items={categories} selected={selectedCategories} limit={5} onChange={ids=>patch({categories:ids.map((id,index)=>({category:categories.find(item=>item.id===id)!,isPrimary:index===0}))})}/>
        <p className="profile-help">Your first choice is your main category.</p>
        <ProfileChoices title="Content types" items={contentTypes} selected={selectedTypes} limit={12} onChange={ids=>patch({contentTypes:ids.map(id=>({contentType:contentTypes.find(item=>item.id===id)!}))})}/>
        <label className="field">Main content language<select value={profile.languages[0]?.languageCode??''} onChange={e=>patch({languages:e.target.value?[{languageCode:e.target.value,proficiency:'PROFESSIONAL'},...profile.languages.slice(1).filter(item=>item.languageCode!==e.target.value)]:[]})}><option value="">Choose a language</option>{profile.languages[0]&&!['en','sw','ar','fr','es','pt'].includes(profile.languages[0].languageCode)&&<option value={profile.languages[0].languageCode}>{profile.languages[0].languageCode.toUpperCase()}</option>}<option value="en">English</option><option value="sw">Swahili</option><option value="ar">Arabic</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option></select></label>
        <details className="profile-more"><summary>More languages <span>Optional</span></summary><label className="field">Language codes<small>Separate with commas, e.g. en, sw, ar</small><input value={profile.languages.map(item=>item.languageCode).join(', ')} onChange={e=>patch({languages:e.target.value.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean).map(languageCode=>({languageCode,proficiency:'PROFESSIONAL'}))})}/></label></details>
      </section>}
      {active===5&&<section className="profile-panel">
        <h3 className="profile-field-title">How you like to work</h3><label className="check-line"><input type="checkbox" checked={profile.travelAvailable} onChange={e=>patch({travelAvailable:e.target.checked})}/>I’m available to travel</label><label className="check-line"><input type="checkbox" checked={profile.remoteCampaignsAllowed} onChange={e=>patch({remoteCampaignsAllowed:e.target.checked})}/>I’m open to remote campaigns</label>
        <details className="profile-more"><summary>Contact details after hiring <span>Private</span></summary><p className="profile-help">These details stay private until hired. Use Rivera messages before a partnership is confirmed.</p><div className="settings-grid"><label className="field">Professional email<input type="email" value={profile.professionalContactEmail??''} onChange={e=>patch({professionalContactEmail:e.target.value})}/></label><label className="field">Professional phone<input type="tel" value={profile.professionalPhone??''} onChange={e=>patch({professionalPhone:e.target.value})}/></label></div><label className="field">Preferred contact method<select value={profile.preferredContactMethod??'RIVERA'} onChange={e=>patch({preferredContactMethod:e.target.value})}><option value="RIVERA">Rivera messaging</option><option value="EMAIL">Email</option><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option></select></label></details>
        <label className="field profile-visibility-field">Who can see your profile?<select value={profile.profileVisibility} onChange={e=>patch({profileVisibility:e.target.value})}><option value="PUBLIC">Everyone — appear in creator search</option><option value="UNLISTED">People with my profile link</option><option value="PRIVATE">Only me and Rivera</option></select></label>
      </section>}
      <button type="submit" className="sr-only" tabIndex={-1}>Save profile</button>
    </form>
    {active===3&&<section className="profile-panel wide">
        <p className="profile-help">Add the accounts you use for your content. Your follower counts help businesses understand your audience.</p>
        {profile.socialAccounts.length ? (
          <div className="manage-list">
            {profile.socialAccounts.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>
                    {item.platform}
                    {item.isPrimary ? " · Primary" : ""}
                  </strong>
                  <p>
                    {item.username || item.profileUrl} ·{" "}
                    {new Intl.NumberFormat("en", {
                      notation: "compact",
                    }).format(item.followers)}{" "}
                    followers{" "}
                    {item.verifiedByRivera
                      ? "· Verified by Rivera"
                      : "· Creator provided"}
                  </p>
                </div>
                <div>
                  {!item.isPrimary && (
                    <button onClick={() => void primarySocial(item.id)}>
                      Make primary
                    </button>
                  )}
                  <button onClick={() => void editSocial(item)}>
                    Edit metrics
                  </button>
                  <button
                    aria-label={`Delete ${item.platform} account`}
                    onClick={() => void removeSocial(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>
            Show businesses where your audience lives. Add your first social
            account.
          </p>
        )}
        <form onSubmit={addSocial} className="inline-form profile-add-form">
          <label className="field">
            Platform
            <select
              value={social.platform}
              onChange={(e) =>
                setSocial({ ...social, platform: e.target.value })
              }
            >
              {platforms.map((value) => (
                <option key={value} value={value}>{value==='TIKTOK'?'TikTok':value==='YOUTUBE'?'YouTube':value.toLowerCase().replace(/^./,c=>c.toUpperCase())}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Username
            <input
              value={social.username}
              onChange={(e) =>
                setSocial({ ...social, username: e.target.value })
              }
            />
          </label>
          <label className="field">
            Profile link (https://…)
            <input
              type="url"
              value={social.profileUrl}
              onChange={(e) =>
                setSocial({ ...social, profileUrl: e.target.value })
              }
            />
          </label>
          <label className="field">
            Followers
            <input
              type="number"
              min="0"
              value={social.followers}
              onChange={(e) =>
                setSocial({ ...social, followers: e.target.value })
              }
            />
          </label>
          <label className="field">
            Engagement %
            <input
              type="number"
              min="0"
              max="100"
              step=".01"
              value={social.engagementRate}
              onChange={(e) =>
                setSocial({ ...social, engagementRate: e.target.value })
              }
            />
          </label>
          <button className="button primary" disabled={saving}>+ Add account</button>
        </form>
      </section>}
    {active===4&&<section className="profile-panel wide">
        <p className="profile-help">Show a few pieces you’re proud of. Link to a video, post or article so businesses can see your style.</p>
        {profile.portfolio.length ? (
          <div className="portfolio-manage">
            {profile.portfolio.map((item) => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <p>
                  {item.brandName || item.mediaType} ·{" "}
                  {item.published ? "Published" : "Hidden"}
                </p>
                <div>
                  <button onClick={() => void movePortfolio(item.id, -1)}>
                    Move up
                  </button>
                  <button onClick={() => void movePortfolio(item.id, 1)}>
                    Move down
                  </button>
                  <button onClick={() => void editPortfolio(item)}>Edit</button>
                  <button
                    onClick={() =>
                      void updatePortfolio(item, { published: !item.published })
                    }
                  >
                    {item.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    aria-label={`Delete ${item.title}`}
                    onClick={() => void removePortfolio(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>
            Show businesses what you can create. Add examples of your previous
            work.
          </p>
        )}
        <form onSubmit={addPortfolio} className="inline-form profile-add-form">
          <label className="field">
            Title
            <input
              required
              value={portfolio.title}
              onChange={(e) =>
                setPortfolio({ ...portfolio, title: e.target.value })
              }
            />
          </label>
          <label className="field">
            Type
            <select
              value={portfolio.mediaType}
              onChange={(e) =>
                setPortfolio({ ...portfolio, mediaType: e.target.value })
              }
            >
              <option value="EXTERNAL_LINK">Website link</option>
              <option value="VIDEO">Video</option>
              <option value="ARTICLE">Article</option>
              <option value="SOCIAL_POST">Social post</option>
            </select>
          </label>
          <label className="field">
            Link to your work (https://…)
            <input
              required
              type="url"
              value={portfolio.externalUrl}
              onChange={(e) =>
                setPortfolio({ ...portfolio, externalUrl: e.target.value })
              }
            />
          </label>
          <label className="field">
            Brand name
            <input
              value={portfolio.brandName}
              onChange={(e) =>
                setPortfolio({ ...portfolio, brandName: e.target.value })
              }
            />
          </label>
          <button className="button primary" disabled={saving}>+ Add to portfolio</button>
        </form>
      </section>}
    {active===5&&<section className="profile-panel profile-sharing">
      <ProfileReadiness items={readiness} onSelect={setActive}/>
      <div className="profile-sharing-actions">{profile.profileVisibility!=='PUBLIC'&&<button type="button" className="button primary" disabled={saving} onClick={()=>void publish()}>Save & publish profile</button>}{profile.slug&&<Link className="button secondary" href={'/creators/'+profile.slug}>Preview profile ↗</Link>}</div>
      <details className="profile-more"><summary>Rivera verification <span>{profile.verificationStatus==='VERIFIED'?'Verified':profile.verificationStatus==='PENDING'?'Under review':'Optional'}</span></summary><p className="profile-help">Ask Rivera to review your profile for a verification badge.</p>{!['VERIFIED','PENDING'].includes(profile.verificationStatus)&&<button type="button" className="button secondary" disabled={saving} onClick={()=>void requestVerification()}>Request verification</button>}</details>
    </section>}
    </fieldset>
  </ProfileStudio>;
}

export function BusinessProfileEditor() {
  return (
    <Protected role="BUSINESS" onboarding>
      <BusinessEditor />
    </Protected>
  );
}
function BusinessEditor() {
  const [active,setActive]=useState(0),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false);
  const dirtyRef=useRef(false),saveLock=useRef(false);
  const [profile, setProfile] = useState<Business | null>(null);
  const [industries, setIndustries] = useState<Taxonomy[]>([]);
  const [feedback, setFeedback] = useState("");
  const load = async () => {
    try {
      const [p, i] = await Promise.all([
        api<Business>("/businesses/me/profile"),
        api<Taxonomy[]>("/industries"),
      ]);
      setProfile(current=>current&&dirtyRef.current?{...p,...current,logoUrl:p.logoUrl,coverImageUrl:p.coverImageUrl,profileCompletion:p.profileCompletion,verificationStatus:p.verificationStatus}:p);
      setIndustries(i);
    } catch (e) {
      setFeedback(message(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);
  if (!profile)
    return (
      <main className="profile-shell">
        <p>{feedback || "Loading profile…"}</p>
      </main>
    );
  const patch = (value: Partial<Business>) => {dirtyRef.current=true;setDirty(true);setFeedback('');setProfile((current) => (current ? { ...current, ...value } : current))};
  async function save(event?: FormEvent) {
    event?.preventDefault();
    if(!profile||saveLock.current)return false;
    saveLock.current=true;setSaving(true);setFeedback('');
    try {
      setProfile(
        await api<Business>("/businesses/me/profile", {
          method: "PATCH",
          body: JSON.stringify(businessProfilePayload(profile)),
        }),
      );
      setFeedback("Business profile updated.");
      dirtyRef.current=false;setDirty(false);return true;
    } catch (e) {
      setFeedback(message(e));
      return false;
    } finally {
      setSaving(false);saveLock.current=false;
    }
  }
  async function publish() {
    if(!await save())return;
    setSaving(true);
    try {
      setProfile(
        await api<Business>("/businesses/me/publish", { method: "POST" }),
      );
      setFeedback("Your business profile is public.");
    } catch (e) {
      setFeedback(message(e));
    } finally {
      setSaving(false);
    }
  }
  async function verify() {
    try {
      await api("/verifications/request", {
        method: "POST",
        body: JSON.stringify({ profileType: "BUSINESS" }),
      });
      setFeedback("Verification request submitted.");
      void load();
    } catch (e) {
      setFeedback(message(e));
    }
  }
  const sections:ProfileSection[]=[
    {name:'About your business',hint:'Tell creators who you are and what your business does.',complete:Boolean(profile.businessName&&profile.description)},
    {name:'Industry & location',hint:'Help creators understand your market and where you’re based.',complete:Boolean(profile.industryId&&profile.countryCode&&profile.city)},
    {name:'Logo & cover',hint:'Add the visuals that make your business recognizable.',complete:Boolean(profile.logoUrl)},
    {name:'Contact details',hint:'Give your future partners a clear way to reach you.',complete:Boolean(profile.website||profile.businessEmail||profile.businessPhone)},
    {name:'Visibility & sharing',hint:'Check your details and choose how people discover your business.',complete:profile.profileVisibility==='PUBLIC'},
  ];
  const readiness=[{label:'Business name and description',done:Boolean(profile.businessName&&profile.description),section:0},{label:'Industry',done:Boolean(profile.industryId),section:1},{label:'Country and city',done:Boolean(profile.countryCode&&profile.city),section:1}];
  return <ProfileStudio role="business" completion={profile.profileCompletion} visibility={profile.profileVisibility} sections={sections} active={active} onSelect={setActive} onSave={()=>save()} busy={saving} dirty={dirty}>
    {feedback&&<p role={feedback.includes('updated')||feedback.includes('submitted')||feedback.includes('public')?'status':'alert'} className={feedback.includes('updated')||feedback.includes('submitted')||feedback.includes('public')?'form-success':'form-error'}>{feedback}</p>}
    <fieldset className="profile-editor-fields" disabled={saving}>
    <form id="business-profile-form" onSubmit={e=>void save(e)} className="profile-editor-form">
      {active===0&&<section className="profile-panel">
        <label className="field">Business name<input maxLength={120} placeholder="The name creators will see" value={profile.businessName??''} onChange={e=>patch({businessName:e.target.value})}/></label>
        <label className="field">Your business in one line<input maxLength={240} placeholder="e.g. Natural skincare made in Kenya" value={profile.shortDescription??''} onChange={e=>patch({shortDescription:e.target.value})}/><small>Shown on your public profile card.</small></label>
        <label className="field">About your business<textarea rows={3} maxLength={3000} placeholder="What do you do, who do you serve, and what makes your business different?" value={profile.description??''} onChange={e=>patch({description:e.target.value})}/><small>{(profile.description??'').length}/3000 characters</small></label>
        <details className="profile-more"><summary>More business details <span>Optional</span></summary><div className="settings-grid"><label className="field">Year established<input type="number" min={1800} max={new Date().getFullYear()} value={profile.yearEstablished??''} onChange={e=>patch({yearEstablished:e.target.value?Number(e.target.value):undefined})}/></label><label className="field">Profile address<small>riveracreators.com/businesses/{profile.slug}</small><input value={profile.slug??''} onChange={e=>patch({slug:e.target.value.toLowerCase()})}/></label></div></details>
      </section>}
      {active===1&&<section className="profile-panel">
        <label className="field">Your industry<select value={profile.industryId??''} onChange={e=>patch({industryId:e.target.value})}><option value="">Choose an industry</option>{industries.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="settings-grid"><label className="field">Country<select value={profile.countryCode??''} onChange={e=>patch({countryCode:e.target.value})}><option value="">Choose a country</option>{countryOptions.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label className="field">City<input value={profile.city??''} placeholder="e.g. Nairobi" onChange={e=>patch({city:e.target.value})}/></label></div>
        <details className="profile-more"><summary>Street address <span>Private · Optional</span></summary><label className="field">Business address<input value={profile.address??''} placeholder="Building, street or office" onChange={e=>patch({address:e.target.value})}/><small>This address is kept private.</small></label></details>
      </section>}
      {active===2&&<section className="profile-panel"><MediaUpload endpoint="/uploads/logo" label="Business logo" currentUrl={profile.logoUrl} onDone={()=>void load()}/><MediaUpload endpoint="/uploads/cover-image" label="Cover image" currentUrl={profile.coverImageUrl} onDone={()=>void load()}/><p className="profile-note">Use a clear logo and a cover that tells your brand’s story. Images upload as soon as you choose them.</p></section>}
      {active===3&&<section className="profile-panel">
        <label className="field">Website <span className="profile-optional">Optional</span><input type="url" placeholder="https://yourbusiness.com" value={profile.website??''} onChange={e=>patch({website:e.target.value})}/></label>
        <div className="settings-grid"><label className="field">Business email<input type="email" placeholder="hello@yourbusiness.com" value={profile.businessEmail??''} onChange={e=>patch({businessEmail:e.target.value})}/></label><label className="field">Business phone<input type="tel" placeholder="e.g. +254 700 000 000" value={profile.businessPhone??''} onChange={e=>patch({businessPhone:e.target.value})}/></label></div>
        <label className="field">Preferred contact after hiring<select value={profile.preferredContactMethod??'RIVERA'} onChange={e=>patch({preferredContactMethod:e.target.value})}><option value="RIVERA">Rivera messaging</option><option value="EMAIL">Email</option><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option></select></label>
        <p className="profile-note">Your business email and phone stay private until a partnership unlocks contact details. Your website can appear publicly.</p>
      </section>}
      {active===4&&<section className="profile-panel">
        <label className="field">Who can see your business profile?<select value={profile.profileVisibility} onChange={e=>patch({profileVisibility:e.target.value})}><option value="PUBLIC">Everyone — appear in business search</option><option value="UNLISTED">People with my profile link</option><option value="PRIVATE">Only me and Rivera</option></select></label>
        <ProfileReadiness items={readiness} onSelect={setActive}/>
      </section>}
      <button type="submit" className="sr-only" tabIndex={-1}>Save profile</button>
    </form>
    {active===4&&<section className="profile-panel profile-sharing">
      <div className="profile-sharing-actions">{profile.profileVisibility!=='PUBLIC'&&<button type="button" className="button primary" disabled={saving} onClick={()=>void publish()}>Save & publish profile</button>}{profile.slug&&<Link className="button secondary" href={'/businesses/'+profile.slug}>Preview profile ↗</Link>}</div>
      <details className="profile-more"><summary>Rivera verification <span>{profile.verificationStatus==='VERIFIED'?'Verified':profile.verificationStatus==='PENDING'?'Under review':'Optional'}</span></summary><p className="profile-help">Ask Rivera to review your business for a verification badge.</p>{!['VERIFIED','PENDING'].includes(profile.verificationStatus)&&<button type="button" className="button secondary" disabled={saving} onClick={()=>void verify()}>Request verification</button>}</details>
    </section>}
    </fieldset>
  </ProfileStudio>;

}
