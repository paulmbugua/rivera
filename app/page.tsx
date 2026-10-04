import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, Globe2, HeartHandshake, Megaphone, Sparkles, Users } from "lucide-react";

const steps = [
  ["01", "Share the real brief", "Set the goal, budget, audience and creative direction without the guesswork."],
  ["02", "Meet your right fit", "Discover people and opportunities through context—not vanity metrics alone."],
  ["03", "Create with clarity", "Keep proposals, funding, delivery and feedback moving in one calm workspace."],
];

export default function Home() {
  return <main>
    <header className="site-header wrap">
      <Link className="brand" href="/" aria-label="Rivera home"><span className="brand-mark">R.</span>rivera</Link>
      <nav aria-label="Main navigation"><Link href="/creators">Find creators</Link><a href="#how">How it works</a><a href="#business">For businesses</a><a href="#creators">For creators</a></nav>
      <span className="auth-nav"><Link href="/login">Log in</Link><Link className="header-link" href="/register">Join Rivera <ArrowUpRight size={16} /></Link></span>
    </header>

    <section className="hero wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> WHERE BRANDS MEET CREATORS</div>
        <h1>Make work<br />people <em>feel.</em></h1>
        <p>Rivera helps thoughtful brands and distinctive creators find each other, agree on the work, and build campaigns worth remembering.</p>
        <div className="hero-actions"><Link className="button primary" href="/register">Start a collaboration <ArrowUpRight size={19} /></Link><Link className="button secondary" href="/campaigns">Explore opportunities <ArrowRight size={19} /></Link></div>
        <div className="hero-reassurance"><span><BadgeCheck size={17} /> Clear expectations</span><span><HeartHandshake size={17} /> Human partnerships</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-image-wrap"><Image src="/images/rivera-hero-diverse.png" alt="A diverse group of creators and business owners shaping a campaign together in a sunlit studio" fill priority sizes="(max-width: 900px) 100vw, 48vw" /></div>
        <div className="hero-note"><Sparkles size={17} /><span><strong>Good chemistry matters.</strong><br />Rivera makes room for it.</span></div>
        <div className="hero-stamp">RIVERA<br /><span>CREATE TOGETHER</span></div>
      </div>
    </section>

    <div className="ticker"><div className="ticker-track"><span>One place</span><b>✳</b><span>Better collaborations</span><b>✳</b><span>Clearer work</span><b>✳</b><span>More human stories</span></div></div>

    <section className="intro wrap" id="how">
      <div className="section-lead"><span className="section-index">01 / A BETTER WAY TO COLLABORATE</span><h2>From first hello<br />to <em>great work.</em></h2></div>
      <div className="intro-right"><p className="lead-copy">The best partnerships feel easy because the important things are clear. Rivera gives businesses and creators a shared path from discovery to delivery.</p><div className="steps">{steps.map(([number, title, copy]) => <article key={number}><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></article>)}</div></div>
    </section>

    <section className="audiences wrap" aria-label="Ways to use Rivera">
      <article className="audience-card business" id="business"><div className="card-top"><span>FOR BUSINESSES</span><Megaphone size={29} /></div><div><p className="card-kicker">Your idea deserves the right voice.</p><h2>Find creators who<br />understand the feeling.</h2><p>Share a thoughtful brief, discover relevant talent and manage the whole collaboration with confidence.</p><Link href="/register">Build your business profile <ArrowUpRight size={18} /></Link></div><span className="card-number">01</span></article>
      <article className="audience-card creator" id="creators"><div className="card-top"><span>FOR CREATORS</span><Sparkles size={29} /></div><div><p className="card-kicker">Your point of view has value.</p><h2>Find work that feels<br />like a natural fit.</h2><p>Show what makes your work yours, discover clear opportunities and grow relationships that respect your craft.</p><Link href="/register">Build your creator profile <ArrowUpRight size={18} /></Link></div><span className="card-number">02</span></article>
    </section>

    <section className="values wrap"><div><span className="section-index">02 / MADE FOR REAL WORK</span><h2>Simple where it should be.<br /><em>Thoughtful where it matters.</em></h2></div><div className="value-grid"><article><BadgeCheck /><strong>Clarity from day one</strong><p>Briefs, expectations and next steps stay visible to everyone involved.</p></article><article><Users /><strong>People before profiles</strong><p>Make informed choices while still leaving room for chemistry and creative instinct.</p></article><article><Globe2 /><strong>Local perspective, wider reach</strong><p>Build partnerships rooted in culture, context and the audiences you care about.</p></article></div></section>

    <section className="closing wrap"><div className="closing-icons"><Globe2 /><Users /></div><span className="section-index">YOUR NEXT GREAT PARTNERSHIP</span><h2>Start with a shared idea.<br />Make something <em>genuine.</em></h2><p>Whether you have a brief ready or a story waiting to be told, there’s a place for you here.</p><Link className="button primary" href="/register">Join Rivera <ArrowUpRight size={18} /></Link></section>
    <footer className="footer wrap"><Link className="brand" href="/"><span className="brand-mark">R.</span>rivera</Link><p>Where brands and creators make meaningful work.</p><nav><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><span>© {new Date().getFullYear()} Rivera</span></nav></footer>
  </main>;
}
