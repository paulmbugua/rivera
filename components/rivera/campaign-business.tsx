'use client';
import { AccountCampaignBudget } from './payment-currency';
/* eslint-disable react-hooks/exhaustive-deps */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Campaign, deadline, label, location, objectives, platforms } from '@/lib/campaigns';
import { countryOptions } from '@/lib/countries';
import { campaignDraftFields, campaignSelectionsSaved } from '@/lib/campaign-draft';
import { useAuth } from './auth-provider';
import { accountCurrency } from '@/lib/currency';

type Taxonomy={id:string;name:string;slug:string};
const wizardSteps=[
  {name:'Campaign basics',short:'Basics',title:'Tell us about your campaign',hint:'A clear title and a few details help creators understand your idea.'},
  {name:'Creator requirements',short:'Creators',title:'Find the right creators',hint:'Choose where they create and who you want to reach.'},
  {name:'Deliverables',short:'Content',title:'What would you like them to make?',hint:'Start with a content idea, then tell creators what you need.'},
  {name:'Budget & dates',short:'Budget',title:'Set a budget and timeline',hint:'Let creators know what you can offer and when to apply.'},
  {name:'Review & publish',short:'Review',title:'Ready to meet your creators?',hint:'Check the details below. You can edit your campaign after publishing.'},
];
const deliverableIdeas=[{title:'TikTok video',platform:'TIKTOK',content:'tiktok-videos'},{title:'Instagram reel',platform:'INSTAGRAM',content:'instagram-reels'},{title:'YouTube video',platform:'YOUTUBE',content:'youtube-videos'},{title:'Photo set',platform:'INSTAGRAM',content:'photography'}];
const empty={title:'',shortDescription:'',fullDescription:'',productOrServiceName:'',productOrServiceDescription:'',productUrl:'',campaignObjective:'BRAND_AWARENESS',targetAudience:'',expectedOutcomes:'',locationType:'GLOBAL',campaignCountryCode:'',campaignCity:'',campaignRegion:'',verifiedCreatorsOnly:false,categoryIds:[] as string[],creatorLocations:[] as {countryCode:string;city?:string}[],platforms:[] as {platform:string;required:boolean;minimumFollowers?:number}[],languages:[{languageCode:'en',required:true}],deliverables:[] as {title:string;description?:string;quantity:number;platform?:string;contentTypeId?:string;dueDate?:string}[],usageRights:'TO_BE_DISCUSSED',usageRightsNotes:'',productProvided:false,travelExpensesCovered:false,specialInstructions:'',budgetMinMinor:undefined as number|undefined,budgetMaxMinor:undefined as number|undefined,currencyCode:'USD',budgetVisibility:'PUBLIC',creatorSlots:1,applicationDeadline:'',campaignStartDate:'',campaignEndDate:'',visibility:'PUBLIC'};

export function CampaignWizard({campaignId}:{campaignId?:string}){
  const router=useRouter();
  const {user}=useAuth();
  const [step,setStep]=useState(1),[id,setId]=useState(campaignId),[form,setForm]=useState({...empty}),[categories,setCategories]=useState<Taxonomy[]>([]),[contentTypes,setContentTypes]=useState<Taxonomy[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const saving=useRef(false);
  const currencyInitialized=useRef(false);
  useEffect(()=>{if(!campaignId&&user&&!currencyInitialized.current){currencyInitialized.current=true;setForm(current=>({...current,currencyCode:accountCurrency(user.countryCode)}))}},[campaignId,user]);
  const heading=useRef<HTMLHeadingElement>(null);
  const [categorySearch,setCategorySearch]=useState(''),[showAllCategories,setShowAllCategories]=useState(false),[savedAt,setSavedAt]=useState('');
  useEffect(()=>{heading.current?.focus({preventScroll:true})},[step]);
  const [loading,setLoading]=useState(Boolean(campaignId)),[taxonomyLoading,setTaxonomyLoading]=useState(true),[taxonomyError,setTaxonomyError]=useState('');
  useEffect(()=>{let cancelled=false;setTaxonomyLoading(true);Promise.all([api<Taxonomy[]>('/categories'),api<Taxonomy[]>('/content-types')]).then(([a,b])=>{if(!cancelled){setCategories(a);setContentTypes(b);setTaxonomyError('')}}).catch(()=>{if(!cancelled)setTaxonomyError('Categories could not be loaded. Reload this page before publishing.')}).finally(()=>{if(!cancelled)setTaxonomyLoading(false)});return()=>{cancelled=true}},[]);
  const [loadError,setLoadError]=useState('');
  useEffect(()=>{if(!campaignId)return;let cancelled=false;setLoading(true);setLoadError('');api<Campaign>(`/business/campaigns/${campaignId}`).then(c=>{if(!cancelled)setForm(campaignDraftFields(empty,c))}).catch(e=>{if(!cancelled)setLoadError(message(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[campaignId]);
  const patch=(value:Partial<typeof form>|((current:typeof form)=>Partial<typeof form>))=>{setError('');setNotice('');setForm(current=>({...current,...(typeof value==='function'?value(current):value)}))};
  const payload=()=>{
    const flexibleLocation=['GLOBAL','REMOTE'].includes(form.locationType);
    const countryCode=form.campaignCountryCode.trim().toUpperCase();
    const city=form.campaignCity.trim();
    return {...form,
      title:form.title.trim()||undefined,
      applicationDeadline:form.applicationDeadline?new Date(`${form.applicationDeadline}T23:59:59Z`).toISOString():undefined,
      campaignStartDate:form.campaignStartDate?new Date(`${form.campaignStartDate}T12:00:00Z`).toISOString():undefined,
      campaignEndDate:form.campaignEndDate?new Date(`${form.campaignEndDate}T12:00:00Z`).toISOString():undefined,
      budgetMinMinor:form.budgetMinMinor,budgetMaxMinor:form.budgetMaxMinor,
      campaignCountryCode:!flexibleLocation&&countryCode?countryCode:undefined,
      campaignCity:form.locationType==='LOCAL'&&city?city:undefined,
      campaignRegion:!flexibleLocation&&form.campaignRegion.trim()?form.campaignRegion.trim():undefined,
      creatorLocations:!flexibleLocation&&countryCode?[{countryCode,city:form.locationType==='LOCAL'&&city?city:undefined}]:[],
      productUrl:form.productUrl.trim()||undefined,
    };
  };
  function validateStep(target:number){const fail=(at:number,text:string)=>{setError(text);setStep(at);return false};if(target===1||target===5){if(form.title.trim().length<2)return fail(1,'Give your campaign a short, clear title.');if(form.shortDescription.trim().length<20)return fail(1,'Add a short description of at least 20 characters.');if(!form.categoryIds.length)return fail(1,'Choose at least one category below.')}if((target===2||target===5)&&!form.platforms.length)return fail(2,'Choose at least one platform for your campaign.');if((target===2||target===5)&&['LOCAL','NATIONAL'].includes(form.locationType)&&!form.campaignCountryCode)return fail(2,'Choose the country you want to reach.');if((target===2||target===5)&&form.locationType==='LOCAL'&&!form.campaignCity.trim())return fail(2,'Add the city you want to reach.');if(target===3||target===5){if(!form.deliverables.length||form.deliverables.some(item=>item.title.trim().length<2||!Number.isInteger(item.quantity)||item.quantity<1))return fail(3,'Add a content item with a name and quantity.');if(form.fullDescription.trim().length<50)return fail(3,'Tell creators a little more in the campaign brief (at least 50 characters).')}return true}
  async function save(show=true){if(saving.current||loading||loadError)return null;saving.current=true;setBusy(true);setError('');try{const submitted=payload();const campaign=await api<Campaign>(id?`/business/campaigns/${id}`:'/business/campaigns',{method:id?'PATCH':'POST',body:JSON.stringify(submitted)});setId(campaign.id);if(!campaignSelectionsSaved(submitted,campaign)){throw new Error('Your category or deliverable selections were not saved. Please try saving again.')}setSavedAt(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));if(show)setNotice('Draft saved. You can come back to it anytime.');return campaign;}catch(e){setError(e instanceof Error?e.message:message(e));return null}finally{saving.current=false;setBusy(false)}}
  async function next(){if(!validateStep(step))return;const saved=await save(false);if(saved)setStep(value=>Math.min(5,value+1));}
  async function publish(){if(!validateStep(5))return;const saved=await save(false);if(!saved)return;saving.current=true;setBusy(true);try{await api(`/business/campaigns/${saved.id}/publish`,{method:'POST'});router.push('/dashboard/business/campaigns');}catch(e){setError(message(e));setBusy(false)}finally{saving.current=false}}
  const toggleCategory=(categoryId:string)=>patch(current=>({categoryIds:current.categoryIds.includes(categoryId)?current.categoryIds.filter(id=>id!==categoryId):[...current.categoryIds,categoryId].slice(0,5)}));
  const togglePlatform=(platform:string)=>patch(current=>({platforms:current.platforms.some(x=>x.platform===platform)?current.platforms.filter(x=>x.platform!==platform):[...current.platforms,{platform,required:true}]}));
  const addDeliverable=()=>patch(current=>({deliverables:[...current.deliverables,{title:'',description:'',quantity:1,platform:current.platforms[0]?.platform??'INSTAGRAM'}]}));
  if(loading)return <main className="campaign-builder"><p role="status">Loading your saved campaign…</p></main>;
  if(loadError)return <main className="campaign-builder"><Link href="/dashboard/business/campaigns">← Campaigns</Link><p role="alert" className="form-error">{loadError} Reload this page to load your draft before editing.</p></main>;
  const currentStep=wizardSteps[step-1];
  const selectedCategories=categories.filter(item=>form.categoryIds.includes(item.id));
  const visibleCategories=categories.filter(item=>item.name.toLowerCase().includes(categorySearch.toLowerCase())).filter((item,index)=>showAllCategories||Boolean(categorySearch)||index<8||form.categoryIds.includes(item.id));
  const addIdea=(idea:typeof deliverableIdeas[number])=>patch(current=>({deliverables:[...current.deliverables,{title:idea.title,quantity:1,platform:idea.platform,contentTypeId:contentTypes.find(type=>type.slug===idea.content)?.id}]}));
  const editDeliverable=(index:number,change:Partial<typeof form.deliverables[number]>)=>patch(current=>({deliverables:current.deliverables.map((item,i)=>i===index?{...item,...change}:item)}));
  const money=(minor:number)=>new Intl.NumberFormat('en',{style:'currency',currency:/^[A-Z]{3}$/.test(form.currencyCode)?form.currencyCode:'USD',maximumFractionDigits:0}).format(minor/100);
  return <main className="campaign-builder campaign-studio">
    <header className="studio-header">
      <div><Link className="studio-back" href="/dashboard/business/campaigns">← All campaigns</Link><h1>{id?'Your campaign':'Create a campaign'}</h1></div>
      <div className="studio-save"><span role="status">{busy?'Saving…':savedAt?'Saved at '+savedAt:'Private until published'}</span><button type="button" className="button secondary" disabled={busy} onClick={()=>void save()}>Save draft</button></div>
    </header>
    <div className="studio-layout">
      <aside className="studio-sidebar">
        <p className="studio-kicker">BUILD YOUR CAMPAIGN</p>
        <nav aria-label="Campaign creation steps"><ol className="campaign-steps">
          {wizardSteps.map((item,index)=><li className={step===index+1?'active':step>index+1?'visited':''} key={item.name}>
            <button type="button" aria-current={step===index+1?'step':undefined} disabled={busy} onClick={()=>{setError('');setStep(index+1)}}>
              <span className="studio-step-number" aria-hidden="true">{step>index+1?'✓':index+1}</span><span className="studio-step-name">{item.short}</span><span className="sr-only">{item.name}</span>
            </button>
          </li>)}
        </ol></nav>
        <div className="studio-tip"><span aria-hidden="true">✦</span><strong>Start simple.</strong><p>Save a draft at any point. Publish when your details feel right.</p></div>
      </aside>
      <div className="studio-workspace">
        <div className="studio-progress"><span>Step {step} of 5</span><span>{currentStep.short}</span><div role="progressbar" aria-label="Campaign steps" aria-valuemin={1} aria-valuemax={5} aria-valuenow={step}><i style={{width:step*20+'%'}}/></div></div>
        <section className="campaign-form-panel studio-panel" aria-labelledby="campaign-step-heading">
          <div className="studio-panel-heading"><h2 id="campaign-step-heading" ref={heading} tabIndex={-1}>{currentStep.title}</h2><p>{currentStep.hint}</p></div>
          {error&&<p role="alert" className="form-error">{error}</p>}
          {notice&&<p role="status" className="form-success">{notice}</p>}
          <fieldset className="studio-fields" disabled={busy}>
          {step===1&&<>
            <label className="field">Campaign title<input required maxLength={160} value={form.title} placeholder="e.g. Introduce our new skincare range" onChange={e=>patch({title:e.target.value})}/></label>
            <div className="settings-grid">
              <label className="field">Product or service <span className="studio-optional">Optional</span><input value={form.productOrServiceName} placeholder="e.g. Natural skincare" onChange={e=>patch({productOrServiceName:e.target.value})}/></label>
              <label className="field">Your main goal<select value={form.campaignObjective} onChange={e=>patch({campaignObjective:e.target.value})}>{objectives.map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label>
            </div>
            <label className="field">A quick introduction<textarea rows={2} maxLength={350} value={form.shortDescription} placeholder="What are you promoting, and why should creators be excited?" onChange={e=>patch({shortDescription:e.target.value})}/><small className="studio-help">{form.shortDescription.length}/350 characters · Shown on your campaign card</small></label>
            <div className="studio-field-heading"><h3>Choose your categories</h3><span>{form.categoryIds.length}/5 selected</span></div>
            <p className="studio-help">Pick the topics that best match your campaign.</p>
            {taxonomyLoading?<p role="status" className="studio-help">Loading categories…</p>:taxonomyError?<p role="alert" className="form-error">{taxonomyError}</p>:!categories.length?<p role="alert" className="form-error">No categories are available yet. Contact support@riveracreators.com.</p>:<>
              {showAllCategories&&<label className="field studio-search"><span className="sr-only">Find a category</span><input type="search" placeholder="Find a category…" value={categorySearch} onChange={e=>setCategorySearch(e.target.value)}/></label>}
              <div className="studio-chips" role="group" aria-label="Campaign categories">{visibleCategories.map(item=><button type="button" key={item.id} aria-pressed={form.categoryIds.includes(item.id)} disabled={!form.categoryIds.includes(item.id)&&form.categoryIds.length>=5} onClick={()=>toggleCategory(item.id)}>{form.categoryIds.includes(item.id)&&<span aria-hidden="true">✓ </span>}{item.name}</button>)}</div>
              {categorySearch&&!visibleCategories.length&&<p className="studio-help">No matching categories. Try another word.</p>}
              <button type="button" className="studio-text-button" onClick={()=>{setShowAllCategories(!showAllCategories);setCategorySearch('')}}>{showAllCategories?'Show fewer categories':'See all categories'}</button>
            </>}
          </>}
          {step===2&&<>
            <div className="studio-field-heading"><h3>Where should your content appear?</h3><span>Choose one or more</span></div>
            <div className="studio-chips studio-platforms" role="group" aria-label="Creator platforms">{platforms.map(value=><button type="button" key={value} aria-pressed={form.platforms.some(item=>item.platform===value)} onClick={()=>togglePlatform(value)}>{form.platforms.some(item=>item.platform===value)&&<span aria-hidden="true">✓ </span>}{value==='TIKTOK'?'TikTok':value==='YOUTUBE'?'YouTube':value==='LINKEDIN'?'LinkedIn':label(value)}</button>)}</div>
            <div className="settings-grid">
              <label className="field">Where are your creators based?<select value={form.locationType} onChange={e=>patch({locationType:e.target.value})}><option value="GLOBAL">Anywhere in the world</option><option value="REMOTE">Remote / online only</option><option value="NATIONAL">A specific country</option><option value="LOCAL">A specific city</option></select></label>
              <label className="field">Content language<select value={form.languages[0]?.languageCode??'en'} onChange={e=>patch({languages:[{languageCode:e.target.value,required:true}]})}>{!['en','sw','ar','fr','es','pt'].includes(form.languages[0]?.languageCode)&&form.languages[0]&&<option value={form.languages[0].languageCode}>{form.languages[0].languageCode.toUpperCase()}</option>}<option value="en">English</option><option value="sw">Swahili</option><option value="ar">Arabic</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option></select></label>
            </div>
            {!['GLOBAL','REMOTE'].includes(form.locationType)&&<div className="settings-grid"><label className="field">Country<select required value={form.campaignCountryCode} onChange={e=>patch({campaignCountryCode:e.target.value})}><option value="">Choose a country</option>{countryOptions.map(country=><option key={country.code} value={country.code}>{country.name}</option>)}</select></label>{form.locationType==='LOCAL'&&<label className="field">City<input required value={form.campaignCity} placeholder="e.g. Nairobi" onChange={e=>patch({campaignCity:e.target.value})}/></label>}</div>}
            <details className="studio-details"><summary>More creator preferences <span>Optional</span></summary><div className="studio-details-body">
              <div className="settings-grid">{form.platforms.map(item=><label key={item.platform} className="field">{label(item.platform)} minimum followers<input type="number" min={0} value={item.minimumFollowers??''} placeholder="Any audience size" onChange={e=>{const value=e.target.value;patch(current=>({platforms:current.platforms.map(x=>x.platform===item.platform?{...x,minimumFollowers:value?Number(value):undefined}:x)}))}}/></label>)}</div>
              <label className="field">Additional languages<small className="studio-help">Language codes separated by commas, e.g. en, sw</small><input value={form.languages.map(item=>item.languageCode).join(', ')} onChange={e=>patch({languages:e.target.value.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean).map(languageCode=>({languageCode,required:true}))})}/></label>
              <label className="check-line"><input type="checkbox" checked={form.verifiedCreatorsOnly} onChange={e=>patch({verifiedCreatorsOnly:e.target.checked})}/>Only Rivera-verified creators</label>
            </div></details>
          </>}
          {step===3&&<>
            <div className="studio-field-heading"><h3>Content to create</h3><span>{form.deliverables.length} item{form.deliverables.length===1?'':'s'}</span></div>
            <p className="studio-help">Tap an idea to add it. You can change its name and quantity.</p>
            <div className="studio-chips studio-ideas">{deliverableIdeas.map(idea=><button key={idea.title} type="button" disabled={form.deliverables.length>=20} onClick={()=>addIdea(idea)}>+ {idea.title}</button>)}</div>
            {form.deliverables.map((item,index)=><article className="deliverable-editor studio-deliverable" key={index}>
              <div className="studio-deliverable-top"><strong>Content {index+1}</strong><button type="button" className="studio-text-button" aria-label={'Remove content item '+(index+1)} onClick={()=>patch(current=>({deliverables:current.deliverables.filter((_,i)=>i!==index)}))}>Remove</button></div>
              <div className="studio-deliverable-fields"><label className="field">What should they create?<input value={item.title} maxLength={160} placeholder="e.g. A 30-second product review" onChange={e=>editDeliverable(index,{title:e.target.value})}/></label><label className="field">Quantity<input type="number" min={1} max={1000} value={item.quantity} onChange={e=>editDeliverable(index,{quantity:Number(e.target.value)})}/></label><label className="field">Platform<select value={item.platform??''} onChange={e=>editDeliverable(index,{platform:e.target.value||undefined})}><option value="">Any platform</option>{platforms.map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label></div>
              <details className="studio-item-details"><summary>Add content details</summary><div className="studio-details-body"><label className="field">Instructions <span className="studio-optional">Optional</span><textarea rows={2} value={item.description??''} placeholder="Length, format, key points or examples" onChange={e=>editDeliverable(index,{description:e.target.value})}/></label><label className="field">Content type<select value={item.contentTypeId??''} onChange={e=>editDeliverable(index,{contentTypeId:e.target.value||undefined})}><option value="">Not specified</option>{contentTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label></div></details>
            </article>)}
            <button type="button" className="studio-text-button" disabled={form.deliverables.length>=20} onClick={addDeliverable}>+ Add a custom content item</button>
            <label className="field studio-brief">Campaign brief<textarea rows={3} maxLength={5000} value={form.fullDescription} placeholder="Tell creators about your product, the message to share, and what a great result looks like." onChange={e=>patch({fullDescription:e.target.value})}/><small className="studio-help">{form.fullDescription.length}/5000 characters · At least 50 characters</small></label>
            <details className="studio-details"><summary>Extra brief details <span>Optional</span></summary><div className="studio-details-body">
              <div className="settings-grid"><label className="field">Who is the content for?<textarea rows={2} value={form.targetAudience} onChange={e=>patch({targetAudience:e.target.value})}/></label><label className="field">What results are you hoping for?<textarea rows={2} value={form.expectedOutcomes} onChange={e=>patch({expectedOutcomes:e.target.value})}/></label></div>
              <label className="field">How will you use the content?<select value={form.usageRights} onChange={e=>patch({usageRights:e.target.value})}>{['TO_BE_DISCUSSED','ORGANIC_ONLY','PAID_ADS','BUSINESS_WEBSITE','SOCIAL_MEDIA','FULL_COMMERCIAL'].map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label>
              <label className="field">Anything else creators should know?<textarea rows={2} value={form.specialInstructions} onChange={e=>patch({specialInstructions:e.target.value})}/></label>
              <label className="check-line"><input type="checkbox" checked={form.productProvided} onChange={e=>patch({productProvided:e.target.checked})}/>We will supply the product</label>
              <label className="check-line"><input type="checkbox" checked={form.travelExpensesCovered} onChange={e=>patch({travelExpensesCovered:e.target.checked})}/>We will cover travel costs</label>
            </div></details>
          </>}
          {step===4&&<>
            <div className="studio-field-heading"><h3>Your total campaign budget</h3></div><p className="studio-help">Give a range to help creators decide if the opportunity is a fit.</p>
            <div className="studio-budget-fields"><label className="field">Currency<select value={form.currencyCode} onChange={e=>patch({currencyCode:e.target.value})}>{['KES','USD'].map(value=><option key={value} value={value}>{value}</option>)}</select></label><label className="field">From<input type="number" min={0} value={form.budgetMinMinor==null?'':form.budgetMinMinor/100} placeholder="e.g. 100" onChange={e=>patch({budgetMinMinor:e.target.value?Math.round(Number(e.target.value)*100):undefined})}/></label><label className="field">To<input type="number" min={0} value={form.budgetMaxMinor==null?'':form.budgetMaxMinor/100} placeholder="e.g. 300" onChange={e=>patch({budgetMaxMinor:e.target.value?Math.round(Number(e.target.value)*100):undefined})}/></label></div>
            <p className="studio-hint">Paystack charges in KES. Fixed Rivera rate: USD 1 = KES 130. Creator payouts currently require an eligible Kenyan M-Pesa account.</p>
            <label className="check-line studio-budget-toggle"><input type="checkbox" checked={form.budgetVisibility==='HIDDEN'} onChange={e=>patch({budgetVisibility:e.target.checked?'HIDDEN':'PUBLIC'})}/>Discuss the budget privately with creators</label>
            <div className="settings-grid"><label className="field">How many creators do you need?<input type="number" min={1} max={10000} value={form.creatorSlots} onChange={e=>patch({creatorSlots:Number(e.target.value)})}/></label><label className="field">Apply by <span className="studio-optional">Optional</span><input type="date" value={form.applicationDeadline} onChange={e=>patch({applicationDeadline:e.target.value})}/><small className="studio-help">Leave blank for a flexible closing date.</small></label></div>
            <details className="studio-details"><summary>Campaign dates <span>Optional</span></summary><div className="studio-details-body settings-grid"><label className="field">Start date<input type="date" value={form.campaignStartDate} onChange={e=>patch({campaignStartDate:e.target.value})}/></label><label className="field">End date<input type="date" value={form.campaignEndDate} onChange={e=>patch({campaignEndDate:e.target.value})}/></label></div></details>
          </>}
          {step===5&&<div className="studio-review">
            <article className="studio-review-lead"><span className="studio-kicker">YOUR OPPORTUNITY</span><h3>{form.title||'Untitled campaign'}</h3><p>{form.shortDescription||'Add a quick introduction.'}</p><div className="studio-review-tags">{selectedCategories.map(item=><span key={item.id}>{item.name}</span>)}{!form.categoryIds.length&&<span>Choose a category</span>}</div><button type="button" className="studio-text-button" onClick={()=>setStep(1)}>Edit campaign basics</button></article>
            <article><div className="studio-review-title"><h3>Your creators</h3><button type="button" className="studio-text-button" onClick={()=>setStep(2)}>Edit</button></div><p>{form.platforms.map(item=>label(item.platform)).join(' · ')||'No platforms selected'}</p><p className="studio-help">{['GLOBAL','REMOTE'].includes(form.locationType)?form.locationType==='GLOBAL'?'Worldwide':'Remote / online':[form.campaignCity,countryOptions.find(country=>country.code===form.campaignCountryCode)?.name].filter(Boolean).join(', ')} · {form.languages.map(item=>item.languageCode.toUpperCase()).join(', ')}</p></article>
            <article><div className="studio-review-title"><h3>Content to create</h3><button type="button" className="studio-text-button" onClick={()=>setStep(3)}>Edit</button></div>{form.deliverables.length?form.deliverables.map((item,index)=><div className="studio-review-content" key={index}><span>{item.quantity} × {item.title||'Untitled content item'}</span><small>{label(item.platform)}</small></div>):<p>Add at least one content item.</p>}</article>
            <article><div className="studio-review-title"><h3>Budget & timeline</h3><button type="button" className="studio-text-button" onClick={()=>setStep(4)}>Edit</button></div><p className="studio-review-money">{form.budgetVisibility==='HIDDEN'?'Budget discussed privately':form.budgetMinMinor==null?'Budget to be discussed':money(form.budgetMinMinor)+(form.budgetMaxMinor!=null?' – '+money(form.budgetMaxMinor):'')}</p><p className="studio-help">{form.creatorSlots} creator{form.creatorSlots===1?'':'s'} · {form.applicationDeadline?'Applications close '+deadline(form.applicationDeadline):'Flexible application deadline'}</p></article>
            <p className="studio-private-note"><span aria-hidden="true">✓</span> Your full brief stays private until creators enter the authorized application process.</p>
          </div>}
          </fieldset>
        </section>
        <footer className="wizard-footer studio-footer">
          <div>{step>1?<button type="button" className="button secondary" disabled={busy} onClick={()=>{setError('');setStep(value=>value-1)}}>← Back</button>:<span className="studio-help">Your idea. Your pace.</span>}</div>
          <button type="button" className="button primary" disabled={busy||taxonomyLoading} onClick={()=>step===5?void publish():void next()}>{busy?'Saving…':step===5?'Publish campaign':'Continue to '+wizardSteps[step].short.toLowerCase()}<span aria-hidden="true">↗</span></button>
        </footer>
      </div>
    </div>
  </main>;
}

export function BusinessCampaigns(){const [result,setResult]=useState<{items:Campaign[]}|null>(null),[filter,setFilter]=useState(''),[error,setError]=useState('');const load=()=>api<{items:Campaign[]}>(`/business/campaigns${filter?`?status=${filter}`:''}`).then(setResult).catch(e=>setError(message(e)));useEffect(()=>{void load()},[filter]);async function act(id:string,action:string){try{await api(`/business/campaigns/${id}/${action}`,{method:'POST'});load()}catch(e){setError(message(e))}}async function remove(id:string){try{await api(`/business/campaigns/${id}`,{method:'DELETE'});load()}catch(e){setError(message(e))}}return <main className="campaign-dashboard"><header><div><Link href="/dashboard/business">← Dashboard</Link><p className="eyebrow">BUSINESS CAMPAIGNS</p><h1>Campaigns</h1></div><Link className="button primary" href="/dashboard/business/campaigns/new">Create campaign</Link></header><label className="field status-filter">Status<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All</option>{['DRAFT','PENDING_REVIEW','OPEN','PAUSED','CLOSED','CANCELLED'].map(x=><option key={x}>{x}</option>)}</select></label>{error&&<p className="form-error">{error}</p>}{result?.items.length?<div className="campaign-list">{result.items.map(c=><article className="owner-campaign" key={c.id}><div><p className="eyebrow">{c.status} · {c.visibility}</p><h2>{c.title}</h2><p>{c.shortDescription||'Draft description not added yet.'}</p><div className="campaign-facts"><span>{location(c)}</span><span><AccountCampaignBudget campaign={c}/></span><span>{c.viewCount??0} views</span><span>{deadline(c.applicationDeadline)}</span></div></div><div className="owner-actions"><Link href={`/dashboard/business/campaigns/${c.id}`}>Manage</Link><Link href={`/dashboard/business/campaigns/${c.id}/edit`}>Edit</Link>{c.status==='DRAFT'&&<><button onClick={()=>void act(c.id,'publish')}>Publish</button><button onClick={()=>void remove(c.id)}>Delete draft</button></>}{c.status==='OPEN'&&<button onClick={()=>void act(c.id,'pause')}>Pause</button>}{c.status==='PAUSED'&&<button onClick={()=>void act(c.id,'resume')}>Resume</button>}{['OPEN','PAUSED'].includes(c.status)&&<button onClick={()=>void act(c.id,'close')}>Close</button>}<button onClick={()=>void act(c.id,'duplicate')}>Duplicate</button></div></article>)}</div>:<div className="dashboard-empty"><h2>Create your first campaign.</h2><p>Describe the opportunity, define the Creators you need and publish it to Rivera.</p></div>}</main>}

export function BusinessCampaignDetail({id}:{id:string}){const [campaign,setCampaign]=useState<Campaign|null>(null),[error,setError]=useState('');useEffect(()=>{api<Campaign>(`/business/campaigns/${id}`).then(setCampaign).catch(e=>setError(message(e)))},[id]);if(error)return <p className="form-error">{error}</p>;if(!campaign)return <p>Loading campaign…</p>;return <main className="campaign-detail owner-brief"><header><Link href="/dashboard/business/campaigns">← Campaigns</Link><p className="eyebrow">{campaign.status} · OWNER FULL BRIEF</p><h1>{campaign.title}</h1><p>{campaign.applicationsCount ?? 0} application{campaign.applicationsCount===1?'':'s'}</p><div className="dashboard-actions"><Link className="button primary" href={`/dashboard/business/campaigns/${id}/applications`}>View Applications</Link><Link className="button secondary" href={`/dashboard/business/campaigns/${id}/creators`}>Hired Creators</Link><Link className="button secondary" href={`/dashboard/business/campaigns/${id}/edit`}>Edit campaign</Link>{campaign.status==='OPEN'&&<Link className="button secondary" href={`/campaigns/${campaign.slug}`}>Public preview</Link>}</div></header><section><h2>Public summary</h2><p>{campaign.shortDescription}</p><div className="campaign-facts"><span>{location(campaign)}</span><span>{budget(campaign)}</span><span>{label(campaign.campaignObjective)}</span></div></section><section className="locked-brief"><p className="eyebrow">LOCKED BRIEF</p><h2>Full description</h2><p>{campaign.fullDescription}</p><h3>Target audience</h3><p>{campaign.targetAudience||'Not specified'}</p><h3>Expected outcomes</h3><p>{campaign.expectedOutcomes||'Not specified'}</p><h3>Special instructions</h3><p>{campaign.specialInstructions||'None'}</p></section><section><h2>Deliverables</h2>{campaign.deliverables.map((x,i)=><article key={x.id??i}><strong>{x.quantity} × {x.title}</strong><p>{x.description}</p></article>)}</section></main>}

function message(error:unknown){return error instanceof ApiError?error.message:'Something went wrong. Please try again.'}
