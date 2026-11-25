import React,{useEffect,useMemo,useState} from 'react';
import {supabase,isConfigured} from './lib/supabase';
import {PawPrint,LayoutDashboard,Sparkles,Library,Building2,Settings,LogOut,ArrowUpRight,Plus,Copy,Download,Menu,X,ChevronRight,CheckCircle2,LoaderCircle,Dog,Send,LockKeyhole,Mail,Image,Search,PenLine,Newspaper,Megaphone,Globe,Target,Package,PanelLeftClose} from 'lucide-react';

const tools=[
 {id:'social',name:'Social content',desc:'Posts, captions and campaign ideas',icon:Megaphone,tag:'SOCIAL'},
 {id:'blog',name:'Blog & articles',desc:'Helpful articles with an SEO angle',icon:Newspaper,tag:'CONTENT'},
 {id:'design',name:'Design direction',desc:'Branded visual concepts and image prompts',icon:Image,tag:'CREATIVE'},
 {id:'seo',name:'SEO assistant',desc:'Keywords, metadata and local search ideas',icon:Search,tag:'GROWTH'},
 {id:'pr',name:'PR & email',desc:'Press releases, pitches and newsletters',icon:Mail,tag:'COMMUNICATIONS'},
 {id:'website',name:'Website review',desc:'Conversion and website improvements',icon:Globe,tag:'WEBSITE'},
 {id:'strategy',name:'Marketing strategy',desc:'A practical plan for the next 30 days',icon:Target,tag:'STRATEGY'},
 {id:'product',name:'Product & service copy',desc:'Descriptions that explain your value',icon:Package,tag:'COPY'}
];
const suggestions={
 social:'Create five social media posts for next week. Include platform-specific captions, a clear call to action and suggested visual direction.',
 blog:'Write a useful, SEO-aware blog article for my target customers. Include a compelling title, headings, meta description and a clear call to action.',
 design:'Create a detailed creative direction for a branded social graphic. Include layout, headline, supporting copy, imagery, colours and a prompt for an image generator.',
 seo:'Give me ten relevant keyword opportunities and practical local SEO improvements. Separate quick wins from longer-term work.',
 pr:'Write a concise press release about a business announcement, with a headline, opening paragraph, quote placeholder and media contact placeholder.',
 website:'Review the website details I provide and recommend the five highest-impact improvements for clarity, trust, SEO and enquiries.',
 strategy:'Create a realistic 30-day marketing plan with weekly priorities, actions, channels and simple measures of success.',
 product:'Write a persuasive, accurate description for my main product or service, with benefits, differentiators and a call to action.'
};
const emptyProfile={business_name:'',industry:'',location:'',website:'',audience:'',services:'',tone:'Friendly, confident and straightforward',goal:'Generate more enquiries',brand_colours:'',brand_notes:''};
function App(){
 const [session,setSession]=useState(null),[authMode,setAuthMode]=useState('signin'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[authBusy,setAuthBusy]=useState(false),[authMessage,setAuthMessage]=useState('');
 const [page,setPage]=useState('home'),[profile,setProfile]=useState(emptyProfile),[profileReady,setProfileReady]=useState(false);
 const [kind,setKind]=useState('social'),[prompt,setPrompt]=useState(suggestions.social),[output,setOutput]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [credits,setCredits]=useState(100),[history,setHistory]=useState([]),[mobileNav,setMobileNav]=useState(false);
 const [editingProfile,setEditingProfile]=useState(false);
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(session)loadWorkspace();else{setProfileReady(false);setHistory([])}},[session]);
 async function loadWorkspace(){
  const {data:p,error}=await supabase.from('business_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
  if(p){setProfile(p);setCredits(p.credits_remaining??100)}else{setProfile({...emptyProfile});setEditingProfile(true)}
  const {data:h}=await supabase.from('generations').select('*').order('created_at',{ascending:false}).limit(30);
  setHistory(h||[]);setProfileReady(true);
 }
 async function authenticate(e){
  e.preventDefault();setAuthBusy(true);setAuthMessage('');
  try{
   if(authMode==='signup'){
    const {data,error}=await supabase.auth.signUp({email,password});
    if(error)throw error;
    if(data.session){setAuthMessage('Account created. Welcome to Sheepdog Studio.')}
    else setAuthMessage('Check your email to confirm your account, then sign in.');
   }else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
  }catch(err){setAuthMessage(err.message||'Authentication failed.')}finally{setAuthBusy(false)}
 }
 async function saveProfile(e){
  e?.preventDefault();if(!session)return;
  const payload={...profile,user_id:session.user.id,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('business_profiles').upsert(payload,{onConflict:'user_id'}).select().single();
  if(error){setNotice(error.message);return}
  setProfile(data);setCredits(data.credits_remaining??credits);setEditingProfile(false);setNotice('Business profile saved.');
 }
 async function generate(){
  if(!prompt.trim())return;setBusy(true);setNotice('');setOutput('');
  try{
   const {data:{session:current}}=await supabase.auth.getSession();
   const {data,error}=await supabase.functions.invoke('marketing-agent',{body:{type:kind,prompt,profile}});
   if(error)throw error;
   if(data?.error)throw new Error(data.error);
   setOutput(data.output||'No content was returned.');
   setCredits(data.credits_remaining??Math.max(0,credits-(data.credits_used||2)));
   const {data:h}=await supabase.from('generations').select('*').order('created_at',{ascending:false}).limit(30);
   setHistory(h||[]);
  }catch(err){setNotice(err.message||'Could not generate content. Check your Supabase function deployment.')}finally{setBusy(false)}
 }
 async function signOut(){await supabase.auth.signOut();setPage('home')}
 async function copyOutput(){await navigator.clipboard.writeText(output);setNotice('Copied to clipboard.')}
 function downloadOutput(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([output],{type:'text/plain'}));a.download='sheepdog-studio-content.txt';a.click();URL.revokeObjectURL(a.href)}
 function chooseTool(id){setKind(id);setPrompt(suggestions[id]);setOutput('');setNotice('');setPage('studio');setMobileNav(false)}
 const title=profile.business_name||'Your business';
 if(!isConfigured)return <SetupScreen/>;
 if(!session)return <AuthScreen {...{authMode,setAuthMode,email,setEmail,password,setPassword,authBusy,authMessage,authenticate}}/>;
 const activeTool=tools.find(t=>t.id===kind)||tools[0];
 return <div className="shell">
  <aside className={'sidebar '+(mobileNav?'open':'')}>
   <div className="brand"><div className="brand-mark"><PawPrint size={23}/></div><div><b>sheepdog<span>.</span></b><small>MARKETING STUDIO</small></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
   <div className="brand-line">A Sheepdog Marketing product</div>
   <div className="workspace"><div className="workspace-icon">{(title[0]||'B').toUpperCase()}</div><div><b>{title}</b><small>Business workspace</small></div></div>
   <div className="nav-label">WORKSPACE</div>
   <NavButton icon={LayoutDashboard} label="Overview" active={page==='home'} onClick={()=>{setPage('home');setMobileNav(false)}}/>
   <NavButton icon={Sparkles} label="AI marketing desk" active={page==='studio'} onClick={()=>{setPage('studio');setMobileNav(false)}}/>
   <NavButton icon={Library} label="Content library" active={page==='library'} onClick={()=>{setPage('library');setMobileNav(false)}}/>
   <NavButton icon={Building2} label="Business profile" active={page==='profile'} onClick={()=>{setPage('profile');setMobileNav(false)}}/>
   <div className="nav-label tools-label">YOUR MARKETING TOOLS</div>
   {tools.map(t=><button className="tool-nav" key={t.id} onClick={()=>chooseTool(t.id)}><t.icon size={16}/><span>{t.name}</span></button>)}
   <div className="sidebar-bottom"><div className="credits"><div><span>Monthly credits</span><b>{credits}</b></div><div className="meter"><i style={{width:`${Math.min(100,credits)}%`}}/></div><small>Remaining this billing period</small></div><button className="signout" onClick={signOut}><LogOut size={15}/> Sign out</button><div className="powered">POWERED BY SHEEPDOG MARKETING</div></div>
  </aside>
  {mobileNav&&<div className="scrim" onClick={()=>setMobileNav(false)}/>}
  <main className="main">
   <header className="topbar"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumb">Sheepdog Studio <span>/</span> {page==='home'?'Overview':page==='studio'?'AI marketing desk':page==='library'?'Content library':'Business profile'}</div><div className="top-right"><span className="top-plan">AI MARKETING, MADE PRACTICAL</span><div className="user-dot">{(session.user.email||'S')[0].toUpperCase()}</div></div></header>
   {!profileReady?<div className="loading-page"><LoaderCircle className="spin"/> Loading your workspace…</div>:<>
   {page==='home'&&<div className="page">
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR AI MARKETING PARTNER</div><h1>Good marketing.<br/><em>Less guesswork.</em></h1><p>Meet your marketing desk. Get ideas, create content and make your next move with an AI assistant that understands your business.</p><button className="button-dark" onClick={()=>{setPage('studio');setKind('strategy');setPrompt(suggestions.strategy)}}>Build my marketing plan <ArrowUpRight size={16}/></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-dog"><PawPrint size={80} strokeWidth={1.25}/></div><div className="hero-sticker">THINK<br/>LOCAL.<br/><b>GROW.</b></div><div className="hero-note">YOUR BUSINESS<br/>HAS A TEAM.</div></div></section>
    <div className="welcome-row"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>What are we working on, {title}?</h2><p>Choose a tool or ask your AI marketing desk to help.</p></div><button className="button-outline" onClick={()=>setPage('profile')}>Edit business profile <ChevronRight size={15}/></button></div>
    <div className="tool-grid">{tools.map((t,i)=><button className="tool-card" key={t.id} onClick={()=>chooseTool(t.id)}><div className="tool-card-top"><div className="tool-icon"><t.icon size={19}/></div><span>{String(i+1).padStart(2,'0')}</span></div><h3>{t.name}</h3><p>{t.desc}</p><div className="tool-open">OPEN TOOL <ArrowUpRight size={13}/></div></button>)}</div>
    <div className="lower-grid"><div className="panel"><div className="panel-heading"><div><span className="eyebrow">YOUR RECENT WORK</span><h2>Content library</h2></div><button className="link-button" onClick={()=>setPage('library')}>View all <ArrowUpRight size={14}/></button></div>{history.length?history.slice(0,4).map(h=><HistoryRow key={h.id} item={h} onClick={()=>{setKind(h.tool_type);setPrompt(h.prompt);setOutput(h.output);setPage('studio')}}/>):<div className="empty-inline">Your first creation will show up here. Let's make something useful.</div>}</div><div className="quote-panel"><PawPrint size={25}/><span className="eyebrow">THE SHEEPDOG APPROACH</span><h2>Good marketing is built on consistency.</h2><p>Clear thinking. Useful content. A little progress, every week.</p><span className="quote-foot">SHEEPDOG MARKETING · EST. 2024</span></div></div>
   </div>}
   {page==='studio'&&<div className="page"><div className="page-intro"><span className="eyebrow">THE AI MARKETING DESK</span><h1>What do you need <em>today?</em></h1><p>Your AI marketer knows your business. Tell it what you're trying to achieve.</p></div><div className="studio-layout"><div className="specialists"><span className="eyebrow">CHOOSE A SPECIALIST</span>{tools.map(t=><button className={kind===t.id?'specialist active':'specialist'} key={t.id} onClick={()=>{setKind(t.id);setPrompt(suggestions[t.id]);setOutput('')}}><t.icon size={17}/><span>{t.name}</span><ChevronRight size={14}/></button>)}<div className="profile-callout"><b>Using your brand profile</b><small>{profile.industry||'Add your industry'} · {profile.location||'Add your location'}</small><button onClick={()=>setPage('profile')}>Update business details ↗</button></div></div><div className="creator"><div className="creator-head"><div className="creator-icon"><activeTool.icon size={20}/></div><div><b>{activeTool.name}</b><small>{activeTool.desc}</small></div><span className="ready">● READY</span></div><label>WHAT WOULD YOU LIKE TO CREATE?</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Tell your AI marketer what you need…"/><div className="prompt-foot"><span>◈ {credits} credits available</span><span>Tailored to {title}</span></div><button className="button-dark generate" disabled={busy||!prompt.trim()||credits<=0} onClick={generate}>{busy?<><LoaderCircle className="spin" size={16}/> Working on it…</>:<>Generate with AI <Sparkles size={16}/></>}</button>{notice&&<div className="notice">{notice}</div>}{output&&<div className="output"><div className="output-head"><div><span className="eyebrow">YOUR NEW CREATION</span><h2>Ready for your review.</h2></div><div className="output-buttons"><button onClick={copyOutput}><Copy size={14}/> Copy</button><button onClick={downloadOutput}><Download size={14}/> Download</button></div></div><article>{output}</article><div className="review-note">Give the content a final human review before publishing. Check facts, prices, links and any regulated claims.</div></div>}</div></div></div>}
   {page==='library'&&<div className="page"><div className="page-intro"><span className="eyebrow">YOUR CONTENT WORKSPACE</span><h1>Made by you.<br/><em>Kept in one place.</em></h1><p>Review and reuse the marketing content you've created.</p></div><div className="library">{history.length?history.map(h=><HistoryRow key={h.id} item={h} onClick={()=>{setKind(h.tool_type);setPrompt(h.prompt);setOutput(h.output);setPage('studio')}}/>):<div className="empty-inline">Nothing here yet. Create your first piece of marketing content.</div>}</div></div>}
   {page==='profile'&&<div className="page"><div className="page-intro"><span className="eyebrow">YOUR BUSINESS DNA</span><h1>Help us get to <em>know you.</em></h1><p>The better we understand your business, the more useful your AI marketer becomes.</p></div><form className="profile-form" onSubmit={saveProfile}><div className="form-grid">{[['business_name','Business name'],['industry','Industry'],['location','Location'],['website','Website URL'],['audience','Target customers'],['services','Products and services'],['tone','Tone of voice'],['goal','Main marketing goal'],['brand_colours','Brand colours']].map(([k,l])=><label key={k}>{l}{['audience','services','tone','goal'].includes(k)?<textarea rows="2" value={profile[k]||''} onChange={e=>setProfile({...profile,[k]:e.target.value})}/>:<input value={profile[k]||''} onChange={e=>setProfile({...profile,[k]:e.target.value})} required={k==='business_name'}/>}</label>)}<label className="wide">Brand notes<textarea rows="3" value={profile.brand_notes||''} onChange={e=>setProfile({...profile,brand_notes:e.target.value})} placeholder="Anything your AI marketer should always know…"/></label></div><div className="form-bottom"><span>Your profile is private to your account.</span><button className="button-dark" type="submit">Save business profile <CheckCircle2 size={16}/></button></div>{notice&&<div className="notice">{notice}</div>}</form></div>}
   </>}
   <footer className="footer"><span>© {new Date().getFullYear()} SHEEPDOG MARKETING</span><span>SHEEPDOG STUDIO <b>·</b> YOUR AI MARKETING DESK</span></footer>
  </main>
 </div>
}
function NavButton({icon:Icon,label,active,onClick}){return <button className={'nav-button '+(active?'active':'')} onClick={onClick}><Icon size={17}/>{label}</button>}
function HistoryRow({item,onClick}){const t=tools.find(x=>x.id===item.tool_type)||tools[0];return <button className="history-row" onClick={onClick}><div className="history-icon"><t.icon size={17}/></div><div className="history-text"><b>{item.title||item.prompt?.slice(0,70)}</b><small>{t.name} · {new Date(item.created_at).toLocaleDateString('en-GB')}</small></div><ArrowUpRight size={15}/></button>}
function AuthScreen(p){return <div className="auth-shell"><div className="auth-brand"><div className="brand-mark"><PawPrint size={25}/></div><div><b>sheepdog<span>.</span></b><small>MARKETING STUDIO</small></div></div><div className="auth-grid"><div className="auth-pitch"><span className="eyebrow">A SHEEPDOG MARKETING PRODUCT</span><h1>Your marketing desk.<br/><em>Always on your side.</em></h1><p>Practical marketing support for the people running the business. Plan it, write it, improve it — with a little help from AI.</p><div className="auth-paw"><PawPrint size={115}/></div><span className="auth-caption">THINK CLEARLY. MARKET BETTER.</span></div><div className="auth-card"><span className="eyebrow">{p.authMode==='signin'?'WELCOME BACK':'GET STARTED'}</span><h2>{p.authMode==='signin'?'Good to see you.':'Make room for better marketing.'}</h2><p>{p.authMode==='signin'?'Sign in to pick up where you left off.':'Create your private business workspace.'}</p><form onSubmit={p.authenticate}><label>Email address<input type="email" value={p.email} onChange={e=>p.setEmail(e.target.value)} required placeholder="you@yourbusiness.co.uk"/></label><label>Password<input type="password" value={p.password} onChange={e=>p.setPassword(e.target.value)} required minLength="8" placeholder="At least 8 characters"/></label><button className="button-dark auth-submit" disabled={p.authBusy}>{p.authBusy?<LoaderCircle className="spin"/>:p.authMode==='signin'?'Sign in':'Create account'} <ArrowUpRight size={16}/></button></form>{p.authMessage&&<div className="notice">{p.authMessage}</div>}<div className="auth-switch">{p.authMode==='signin'?"New to Sheepdog Studio?":"Already have an account?"} <button onClick={()=>{p.setAuthMode(p.authMode==='signin'?'signup':'signin');p.setAuthMessage('')}}>{p.authMode==='signin'?'Create an account':'Sign in'}</button></div><div className="auth-secure"><LockKeyhole size={13}/> Your workspace is protected by Supabase authentication.</div></div></div><div className="auth-footer">SHEEPDOG MARKETING · PRACTICAL MARKETING FOR AMBITIOUS BUSINESSES</div></div>}
function SetupScreen(){return <div className="setup"><div className="auth-brand"><div className="brand-mark"><PawPrint/></div><div><b>sheepdog<span>.</span></b><small>MARKETING STUDIO</small></div></div><h1>One quick setup<br/><em>before we get going.</em></h1><p>Add your Supabase project URL and anon key to the GitHub repository's Actions secrets, then redeploy.</p><div className="setup-card"><b>Required GitHub Actions secrets</b><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code><small>See SETUP.md in the project for the full instructions.</small></div></div>}
