"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Protected } from "./protected";
import { useAuth } from "./auth-provider";
import { api } from "@/lib/api";
import { ArrowUpRight, HeartHandshake, Sparkles, LayoutDashboard, Megaphone, Settings, LogOut, Menu, X, MessageSquare, UserRound, Wallet, Search, FileText, Handshake, Bookmark, ShieldCheck, BarChart3, ChevronRight, Plus, Eye } from "lucide-react";

function navigationIcon(text:string){
  if(text==='Overview')return LayoutDashboard;
  if(text.includes('Message')||text==='Support')return MessageSquare;
  if(text==='Settings')return Settings;
  if(text.includes('Profile')||text==='Creators'||text==='Businesses')return UserRound;
  if(text==='Saved')return Bookmark;
  if(text.includes('Payment')||text.includes('Fee')||text==='Earnings'||text==='Payouts'||text==='Transfers'||text==='Refunds')return Wallet;
  if(text.includes('Application')||text==='Reports'||text==='Data Requests')return FileText;
  if(text==='Offers'||text==='Collaborations')return Handshake;
  if(text==='Find Creators'||text==='Recommended')return Search;
  if(text==='Verifications'||text==='Reviews')return ShieldCheck;
  if(text==='Analytics')return BarChart3;
  return Megaphone;
}
const humanLabel=(value?:string)=>value?value.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()):'Loading…';
type Summary = {
  slug: string;
  profileCompletion: number;
  profileVisibility: string;
  verificationStatus: string;
  combinedFollowers?: number;
  socialAccounts?: unknown[];
  portfolio?: unknown[];
};
type MarketSummary = {
  activeCampaigns?: number;
  draftCampaigns?: number;
  closedCampaigns?: number;
  campaignViews?: number;
  savedOpportunities?: number;
  newestOpportunities?: number;
  recommendedOpportunities?: number;
  applicationsReceived?: number;
  applicationsViewed?: number;
  applicationsSubmitted?: number;
  draftApplications?: number;
  freeApplicationCredits?: number;
  applicationsShortlisted?: number;
  offersSent?: number;
  creatorsHired?: number;
  awaitingFunding?: number;
  fundedCreators?: number;
  offersReceived?: number;
  activeCollaborations?: number;
  completedCollaborations?: number;
  awaitingReview?: number;
  revisionsRequested?: number;
  reviewsPending?: number;
};
export function Dashboard({
  role,
}: {
  role: "BUSINESS" | "CREATOR" | "ADMIN";
}) {
  return (
    <Protected role={role} onboarding={role === "ADMIN" ? undefined : true}>
      <Inner role={role} />
    </Protected>
  );
}
function Inner({ role }: { role: "BUSINESS" | "CREATOR" | "ADMIN" }) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [market, setMarket] = useState<MarketSummary>({});
  const [menuOpen,setMenuOpen]=useState(false),[loggingOut,setLoggingOut]=useState(false);
  const menuButton=useRef<HTMLButtonElement>(null),menuPanel=useRef<HTMLElement>(null);
  const [marketLoading,setMarketLoading]=useState(role!=='ADMIN'),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
  function toggleMenu(){setMenuOpen(current=>!current)}
  function openMenu(){setMenuOpen(true);window.requestAnimationFrame(()=>{menuPanel.current?.scrollIntoView({behavior:'instant',block:'start'});menuPanel.current?.querySelector<HTMLAnchorElement>('a')?.focus()})}
  async function signOut(){setLoggingOut(true);await logout()}
  useEffect(() => {
    let cancelled=false;
    if (role !== "ADMIN") {
      setMarketLoading(true);setLoadError('');
      api<Summary>(
        role === "CREATOR" ? "/creators/me/profile" : "/businesses/me/profile",
      )
        .then(value=>{if(!cancelled)setSummary(value)})
        .catch(() => {if(!cancelled)setLoadError('Some dashboard details could not load. Try again.');});
      Promise.allSettled([
        api<MarketSummary>(
          role === "CREATOR"
            ? "/creator/campaigns/summary/dashboard"
            : "/business/campaigns/summary/dashboard",
        ),
        api<MarketSummary>(
          role === "CREATOR"
            ? "/creators/me/applications/summary"
            : "/business/applications/summary",
        ),
        api<MarketSummary>(
          role === "CREATOR"
            ? "/creators/me/workspace-summary"
            : "/business/workspace-summary",
        ),
      ])
        .then(results=>{if(cancelled)return;setMarket(Object.assign({},...results.filter(result=>result.status==='fulfilled').map(result=>result.value)));if(results.some(result=>result.status==='rejected'))setLoadError('Some dashboard details could not load. Try again.');setMarketLoading(false)});
    }
    return()=>{cancelled=true};
  }, [role,retry]);
  const links =
    role === "ADMIN"
      ? [
          ["Overview", "/admin"],
          ["Reports", "/admin/reports"],
          ["Support", "/admin/support"],
          ["Analytics", "/admin/analytics"],
          ["Data Requests", "/admin/data-requests"],
          ["Creators", "/admin/creators"],
          ["Businesses", "/admin/businesses"],
          ["Campaigns", "/admin/campaigns"],
          ["Applications", "/admin/applications"],
          ["Reviews", "/admin/reviews"],
          ["Application Fees", "/admin/application-fees"],
          ["Application Payments", "/admin/payments"],
          ["Collaboration Payments", "/admin/collaboration-payments"],
          ["Transfers", "/admin/transfers"],
          ["Refunds", "/admin/refunds"],
          ["Payment Issues", "/admin/payment-issues"],
          ["Payout Accounts", "/admin/payout-accounts"],
          ["Verifications", "/admin/verifications"],
          ["Categories", "/admin/categories"],
          ["Industries", "/admin/industries"],
        ]
      : role === "BUSINESS"
        ? [
            ["Overview", "/dashboard/business"],
            ["Campaigns", "/dashboard/business/campaigns"],
            ["Messages", "/dashboard/business/messages"],
            ["Payments", "/dashboard/business/payments"],
            ["Create Campaign", "/dashboard/business/campaigns/new"],
            ["Profile", "/dashboard/business/profile"],
            ["Find Creators", "/creators"],
            ["Settings", "/settings"],
          ]
        : [
            ["Overview", "/dashboard/creator"],
            ["Opportunities", "/dashboard/creator/opportunities"],
            ["Recommended", "/dashboard/creator/opportunities/recommended"],
            ["Saved", "/dashboard/creator/saved-campaigns"],
            ["Applications", "/dashboard/creator/applications"],
            ["Offers", "/dashboard/creator/offers"],
            ["Messages", "/dashboard/creator/messages"],
            ["Collaborations", "/dashboard/creator/collaborations"],
            ["Earnings", "/dashboard/creator/earnings"],
            ["Payouts", "/dashboard/creator/payouts"],
            ["Application Fee Payments", "/dashboard/creator/payments"],
            ["Profile", "/dashboard/creator/profile"],
            ["Settings", "/settings"],
          ];
  const businessStats: [string, number | undefined][] = [
    ["Active campaigns", market.activeCampaigns],
    ["Awaiting review", market.awaitingReview],
    ["Revisions requested", market.revisionsRequested],
    ["Reviews pending", market.reviewsPending],
    ["Creators hired", market.creatorsHired],
    ["Awaiting funding", market.awaitingFunding],
    ["Funded / active", market.activeCollaborations ?? market.fundedCreators],
    ["Campaign views", market.campaignViews],
  ];
  const creatorStats: [string, number | undefined][] = [
    ["Applications submitted", market.applicationsSubmitted],
    ["Awaiting review", market.awaitingReview],
    ["Revisions requested", market.revisionsRequested],
    ["Completed", market.completedCollaborations],
    ["Waiting for funding", market.awaitingFunding],
    ["Reviews pending", market.reviewsPending],
    ["Active collaborations", market.activeCollaborations],
  ];
  const base=role==='ADMIN'?'/admin':'/dashboard/'+role.toLowerCase();
  const campaignsHref=role==='BUSINESS'?base+'/campaigns':role==='CREATOR'?base+'/opportunities':'/admin/campaigns';
  const profileHref=base+'/profile';
  const mainStats=role==='BUSINESS'?[
    {label:'Active campaigns',value:market.activeCampaigns,href:base+'/campaigns',icon:Megaphone},
    {label:'Creators hired',value:market.creatorsHired,href:base+'/campaigns',icon:Handshake},
    {label:'Awaiting review',value:market.awaitingReview,href:base+'/campaigns',icon:FileText},
    {label:'Awaiting funding',value:market.awaitingFunding,href:base+'/payments',icon:Wallet},
  ]:[
    {label:'Active collaborations',value:market.activeCollaborations,href:base+'/collaborations',icon:Handshake},
    {label:'Offers received',value:market.offersReceived,href:base+'/offers',icon:FileText},
    {label:'Applications submitted',value:market.applicationsSubmitted,href:base+'/applications',icon:Megaphone},
    {label:'Awaiting review',value:market.awaitingReview,href:base+'/collaborations',icon:Eye},
  ];
  const shortcuts=role==='ADMIN'?[
    {label:'Verifications',hint:'Review pending requests',href:'/admin/verifications',icon:ShieldCheck},
    {label:'Reports',hint:'Review marketplace reports',href:'/admin/reports',icon:FileText},
    {label:'Support',hint:'Help your community',href:'/admin/support',icon:MessageSquare},
    {label:'Analytics',hint:'Marketplace performance',href:'/admin/analytics',icon:BarChart3},
  ]:role==='BUSINESS'?[
    {label:'My campaigns',hint:'Manage your opportunities',href:campaignsHref,icon:Megaphone},
    {label:'Messages',hint:'Keep partnerships moving',href:base+'/messages',icon:MessageSquare},
    {label:'Find creators',hint:'Meet your next collaborator',href:'/creators',icon:Search},
    {label:'Payments',hint:'Funding and payment history',href:base+'/payments',icon:Wallet},
  ]:[
    {label:'My applications',hint:'Follow your proposals',href:base+'/applications',icon:FileText},
    {label:'Messages',hint:'Continue the conversation',href:base+'/messages',icon:MessageSquare},
    {label:'Collaborations',hint:'Your active partnerships',href:base+'/collaborations',icon:Handshake},
    {label:'Earnings',hint:'View your payment progress',href:base+'/earnings',icon:Wallet},
  ];
  const bottomLinks=role==='ADMIN'?[{label:'Home',href:'/admin',icon:LayoutDashboard},{label:'Reports',href:'/admin/reports',icon:FileText},{label:'Support',href:'/admin/support',icon:MessageSquare},{label:'Settings',href:'/settings',icon:Settings}]:[{label:'Home',href:base,icon:LayoutDashboard},{label:'Campaigns',href:campaignsHref,icon:Megaphone},{label:'Messages',href:base+'/messages',icon:MessageSquare},{label:'Profile',href:profileHref,icon:UserRound}];
  return (
    <main className="dashboard-shell dashboard-modern">
      <a className="dashboard-skip" href="#dashboard-content">Skip to dashboard</a>
      <header className="dashboard-topbar">
        <Link href="/" className="brand" aria-label="Rivera home"><span className="brand-mark">R.</span>rivera</Link>
        <button ref={menuButton} type="button" className="dashboard-menu-button" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={toggleMenu}>{menuOpen?<X size={18}/>:<Menu size={18}/>}<span>{menuOpen?'Close menu':'Menu'}</span></button>
        <nav className="dashboard-top-actions" aria-label="Account shortcuts">
          <Link className="dashboard-top-campaigns" href={campaignsHref} prefetch={false}><Megaphone size={17} aria-hidden="true"/><span>Campaigns</span></Link>
          <Link className="dashboard-top-settings" href="/settings" prefetch={false}><Settings size={17} aria-hidden="true"/><span>Settings</span></Link>
          <button className="dashboard-top-logout" type="button" disabled={loggingOut} onClick={()=>void signOut()}><LogOut size={17} aria-hidden="true"/><span>{loggingOut?'Leaving…':'Log out'}</span></button>
        </nav>
      </header>
      <div className="dashboard-layout">
        <aside ref={menuPanel} id="dashboard-navigation" className={'dashboard-navigation'+(menuOpen?' is-open':'')} aria-label={role.toLowerCase()+' navigation'} onKeyDown={event=>{if(event.key==='Escape'){setMenuOpen(false);menuButton.current?.focus()}}}>
          <p className="dashboard-nav-caption">YOUR WORKSPACE</p>
          <nav aria-label="Workspace pages">{links.map(([text,href],index)=>{const Icon=navigationIcon(text);return <Link className={index===0?'dashboard-nav-active':''} key={href} href={href} prefetch={false} aria-current={index===0?'page':undefined}><Icon size={17} aria-hidden="true"/><span>{text}</span></Link>})}</nav>
          <div className="dashboard-nav-note"><HeartHandshake size={19} aria-hidden="true"/><p>Good partnerships start with a conversation.</p></div>
        </aside>
        <section id="dashboard-content" className="dashboard-content" tabIndex={-1}>
          <div className="dashboard-welcome"><div><p className="dashboard-kicker">{role==='BUSINESS'?'BUSINESS WORKSPACE':role==='CREATOR'?'CREATOR WORKSPACE':'RIVERA ADMIN'}</p><h1>{user?.firstName?'Hi, '+user.firstName+'.':'Welcome back.'}</h1><p>{role==='BUSINESS'?'Your next great partnership starts here.':role==='CREATOR'?'Your work, opportunities and conversations in one place.':'A clear view of your marketplace.'}</p></div><span className="dashboard-welcome-avatar" aria-hidden="true">{user?.firstName?.slice(0,1).toUpperCase()||'R'}</span></div>
          {loadError&&<div className="dashboard-load-error" role="status"><span>{loadError}</span><button type="button" disabled={marketLoading} onClick={()=>setRetry(value=>value+1)}>Retry</button></div>}
          <div className="dashboard-focus">
            <span aria-hidden="true">{role==='ADMIN'?<HeartHandshake size={22}/>:<Sparkles size={22}/>}</span>
            <div><small>{role==='ADMIN'?'TODAY’S FOCUS':'MAKE YOUR NEXT MOVE'}</small><h2>{role==='BUSINESS'?'Turn your idea into a campaign.':role==='CREATOR'?'Find your next opportunity.':'Keep the marketplace healthy.'}</h2><p>{role==='BUSINESS'?'A clear brief brings the right creators closer.':role==='CREATOR'?'Discover campaigns that fit your style and audience.':'Start with the requests that need your attention.'}</p></div>
            <Link href={role==='ADMIN'?'/admin/verifications':role==='BUSINESS'?base+'/campaigns/new':campaignsHref} prefetch={false}>{role==='BUSINESS'?<Plus size={17}/>:<ArrowUpRight size={17}/>}<span>{role==='BUSINESS'?'Create campaign':role==='CREATOR'?'Explore campaigns':'Review verifications'}</span></Link>
          </div>
          {role!=='ADMIN'&&<>
            <div className="dashboard-block-heading"><h2>At a glance</h2><span>Your latest activity</span></div>
            <div className="dashboard-stats dashboard-primary-stats" aria-busy={marketLoading}>{mainStats.map(item=><Link key={item.label} href={item.href} prefetch={false} className="dashboard-stat-card"><span className="dashboard-stat-top"><item.icon size={17} aria-hidden="true"/><ArrowUpRight size={13} aria-hidden="true"/></span><strong>{marketLoading?'—':item.value??'—'}</strong><span>{item.label}</span></Link>)}</div>
          </>}
          <div className="dashboard-block-heading"><h2>{role==='ADMIN'?'Admin tools':'Quick access'}</h2><span>Pick up where you left off</span></div>
          <div className="dashboard-quick-grid">{shortcuts.map(item=><Link key={item.label} href={item.href} prefetch={false} className="dashboard-quick-link"><span className="dashboard-quick-icon"><item.icon size={20} aria-hidden="true"/></span><span><strong>{item.label}</strong><small>{item.hint}</small></span><ChevronRight size={16} aria-hidden="true"/></Link>)}</div>
          {role!=='ADMIN'&&<>
            <section className="dashboard-profile-card" aria-labelledby="dashboard-profile-heading"><div className="dashboard-profile-top"><span className="dashboard-quick-icon"><UserRound size={20} aria-hidden="true"/></span><div><h2 id="dashboard-profile-heading">Your profile</h2><p>{summary?summary.profileCompletion>=100?'Looking good. Keep your details up to date.':'A few small details can make a stronger first impression.':'Loading profile details…'}</p></div><Link href={profileHref} prefetch={false}>Edit profile <ArrowUpRight size={14}/></Link></div><div className="dashboard-profile-progress"><span>{summary?summary.profileCompletion+'% complete':'Loading…'}</span><div role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary?.profileCompletion??0}><i style={{width:Math.max(0,Math.min(100,summary?.profileCompletion??0))+'%'}}/></div></div><div className="dashboard-profile-tags"><span>Visibility: <strong>{humanLabel(summary?.profileVisibility)}</strong></span><span>Verification: <strong>{humanLabel(summary?.verificationStatus)}</strong></span>{summary?.slug&&<Link href={'/'+(role==='CREATOR'?'creators':'businesses')+'/'+summary.slug} prefetch={false}>Preview profile ↗</Link>}</div></section>
            <details className="dashboard-more-activity"><summary>More activity details <span>View all numbers</span></summary><div className="dashboard-secondary-stats">{(role==='BUSINESS'?businessStats:creatorStats).map(([text,value])=><div key={text}><span>{text}</span><strong>{marketLoading?'—':value??'—'}</strong></div>)}</div></details>
          </>}
        </section>
      </div>
      <nav className="dashboard-bottom-nav" aria-label="Mobile quick navigation">{bottomLinks.map((item,index)=><Link href={item.href} key={item.href} prefetch={false} aria-current={index===0?'page':undefined}><item.icon size={20} aria-hidden="true"/><span>{item.label}</span></Link>)}<button type="button" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={()=>menuOpen?(setMenuOpen(false),menuButton.current?.focus()):openMenu()}><Menu size={20} aria-hidden="true"/><span>More</span></button></nav>
    </main>
  );
}
