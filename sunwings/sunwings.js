const API={
  services:'/api/admin/sunwings/services',
  locations:'/api/admin/sunwings/locations',
  blog:'/api/admin/sunwings/blog-posts',
  quotes:'/api/admin/sunwings/quote-requests',
  settings:'/api/admin/sunwings/site-settings',
  integrations:'/api/admin/sunwings/integrations',
  facebookPosts:'/api/admin/sunwings/facebook-posts',
};

const state={
  services:[],
  locations:[],
  blog:[],
  quotes:[],
  service:null,
  location:null,
  blogPost:null,
  faq:[],
  integrations:{},
  facebookPosts:[],
};

const views={
  dashboard:'Dashboard',
  services:'Service Posts',
  'service-editor':'Service Post',
  locations:'Location Posts',
  'location-editor':'Location Post',
  blog:'Moving Tips',
  'blog-editor':'Moving Tip',
  quotes:'Quote Requests',
  settings:'Website Settings',
  integrations:'Integrations',
};

const nav=[...document.querySelectorAll('.nav-item')];
const panels=[...document.querySelectorAll('.view')];
const title=document.getElementById('viewTitle');
const alertBox=document.getElementById('alert');
const sidebar=document.getElementById('sidebar');
const scrim=document.getElementById('scrim');

function token(){
  return localStorage.getItem('justinnovate-admin-access-token')||'';
}

async function api(url,options={}){
  const accessToken=token();
  const response=await fetch(url,{
    ...options,
    headers:{
      ...(options.headers||{}),
      ...(accessToken?{Authorization:`Bearer ${accessToken}`}:{}),
    },
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401&&!accessToken){
      throw new Error('Sunwings admin is ready, but the parent Just Innovate login still needs to pass its access token into this workspace.');
    }
    throw new Error(payload.error||payload.message||'Request failed.');
  }
  return payload;
}

function notice(message,type='success'){
  alertBox.textContent=message;
  alertBox.className=`alert ${type}`;
  clearTimeout(notice.timer);
  notice.timer=setTimeout(()=>alertBox.classList.add('hidden'),5000);
}

function closeMenu(){sidebar.classList.remove('open');scrim.classList.remove('show')}

function showView(name){
  if(!views[name])name='dashboard';
  nav.forEach(button=>button.classList.toggle('active',button.dataset.view===name));
  panels.forEach(panel=>panel.classList.toggle('active',panel.id===`view-${name}`));
  title.textContent=views[name];
  history.replaceState(null,'',`#${name}`);
  closeMenu();
}

function slugify(value=''){
  return String(value).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-');
}
function lines(value=''){return String(value||'').split('
').map(item=>item.trim()).filter(Boolean)}
function toLines(value=[]){return Array.isArray(value)?value.join('
'):''}
function byName(form,name){return form.elements.namedItem(name)}
function readForm(form){
  return Object.fromEntries(new FormData(form).entries());
}
function date(value){return value?new Date(value).toLocaleDateString():'—'}

function renderPostList(target,posts,type){
  if(!posts.length){
    target.innerHTML=`<div class="empty">No ${type} posts yet.</div>`;
    return;
  }
  target.innerHTML=posts.map(post=>`
    <article class="post-row">
      <div><strong>${escapeHtml(post.title||'Untitled')}</strong><small>/${type}/${escapeHtml(post.slug||'')}</small></div>
      <span class="status ${post.status==='published'?'published':'draft'}">${escapeHtml(post.status||'draft')}</span>
      <span>${date(post.updated_at)}</span>
      <button class="secondary" data-edit-${type}="${post.id}">Edit</button>
    </article>
  `).join('');
}

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}

async function loadServices(){
  const payload=await api(API.services);
  state.services=Array.isArray(payload.posts)?payload.posts:[];
  renderPostList(document.getElementById('serviceList'),state.services,'services');
  document.getElementById('metricServices').textContent=state.services.length;
}
async function loadLocations(){
  const payload=await api(API.locations);
  state.locations=Array.isArray(payload.posts)?payload.posts:[];
  renderPostList(document.getElementById('locationList'),state.locations,'locations');
  document.getElementById('metricLocations').textContent=state.locations.length;
}
async function loadBlog(){
  const payload=await api(API.blog);
  state.blog=Array.isArray(payload.posts)?payload.posts:[];
  renderPostList(document.getElementById('blogList'),state.blog,'blog');
  document.getElementById('metricBlog').textContent=state.blog.length;
}

function blogToForm(post={}){
  const form=document.getElementById('blogForm');
  state.blogPost=post.id?post:null;
  const published=post.published_at?new Date(post.published_at):null;
  const localPublished=published&&!Number.isNaN(published.getTime())
    ? new Date(published.getTime()-published.getTimezoneOffset()*60000).toISOString().slice(0,16)
    : '';
  const map={
    title:post.title||'',slug:post.slug||'',category:post.category||'Guides',
    authorName:post.author_name||'Sunwings Transport',excerpt:post.excerpt||'',
    tags:toLines(post.tags),featuredImage:post.featured_image||'',body:post.body||'',
    status:post.status||'draft',publishedAt:localPublished,
    seoTitle:post.seo_title||'',seoDescription:post.seo_description||'',
  };
  Object.entries(map).forEach(([key,value])=>{if(byName(form,key))byName(form,key).value=value});
  document.getElementById('blogEditorTitle').textContent=post.id?'Edit Moving Tip':'New Moving Tip';
  document.getElementById('blogDanger').classList.toggle('hidden',!post.id);
  syncBlogSlugPreview();
  showView('blog-editor');
}

function syncBlogSlugPreview(){
  const form=document.getElementById('blogForm');
  const value=byName(form,'slug').value||slugify(byName(form,'title').value)||'post-name';
  document.querySelector('[data-preview="blog-slug"]').textContent=value;
}

async function saveBlogPost(){
  const form=document.getElementById('blogForm');
  const values=readForm(form);
  const body={
    ...(state.blogPost?.id?{id:state.blogPost.id}:{}),
    ...values,
    slug:slugify(values.slug||values.title),
    tags:lines(values.tags),
    publishedAt:values.publishedAt?new Date(values.publishedAt).toISOString():null,
  };
  const payload=await api(API.blog,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  state.blogPost=payload.post;
  notice('Moving Tip saved.');
  await loadBlog();
  blogToForm(payload.post);
}

async function loadQuotes(){
  const payload=await api(API.quotes);
  state.quotes=Array.isArray(payload.requests)?payload.requests:[];
  document.getElementById('metricQuotes').textContent=state.quotes.filter(item=>item.status==='new').length;
  const target=document.getElementById('quoteList');
  if(!state.quotes.length){target.innerHTML='<div class="empty">No quote requests yet.</div>';return}
  target.innerHTML=state.quotes.map(item=>`
    <article class="post-row quote-row">
      <div><strong>${escapeHtml(item.name)}</strong><small>${date(item.created_at)} · ${escapeHtml(item.phone)}</small></div>
      <div><strong>${escapeHtml(item.service||'General request')}</strong><small>${escapeHtml(item.move_from||'')} ${item.move_to?'→ '+escapeHtml(item.move_to):''}</small></div>
      <div><small class="quote-meta">${escapeHtml(item.email||'No email')}</small></div>
      <select data-quote-status="${item.id}">
        ${['new','contacted','quoted','closed'].map(status=>`<option value="${status}" ${status===item.status?'selected':''}>${status}</option>`).join('')}
      </select>
    </article>
  `).join('');
}

function serviceToForm(post={}){
  const form=document.getElementById('serviceForm');
  state.service=post.id?post:null;
  const map={
    title:post.title||'',slug:post.slug||'',sortOrder:post.sort_order??0,eyebrow:post.eyebrow||'',
    bannerImage:post.banner_image||'',bannerAlt:post.banner_alt||'',heroTitle:post.hero_title||'',
    heroDescription:post.hero_description||'',intro:post.intro||'',bodyHtml:post.body_html||'',
    bullets:toLines(post.bullets),ctaTitle:post.cta_title||'',ctaText:post.cta_text||'',
    status:post.status||'draft',seoTitle:post.seo_title||'',seoDescription:post.seo_description||'',ogImage:post.og_image||'',
  };
  Object.entries(map).forEach(([key,value])=>{if(byName(form,key))byName(form,key).value=value});
  document.getElementById('serviceEditorTitle').textContent=post.id?'Edit Service Post':'New Service Post';
  document.getElementById('serviceDanger').classList.toggle('hidden',!post.id);
  syncSlugPreview('service');
  showView('service-editor');
}

function locationToForm(post={}){
  const form=document.getElementById('locationForm');
  state.location=post.id?post:null;
  state.faq=Array.isArray(post.faq)?post.faq.map(item=>({...item})):[];
  const map={
    title:post.title||'',slug:post.slug||'',region:post.region||'',sortOrder:post.sort_order??0,eyebrow:post.eyebrow||'',
    bannerImage:post.banner_image||'',bannerAlt:post.banner_alt||'',heroTitle:post.hero_title||'',
    heroDescription:post.hero_description||'',intro:post.intro||'',bodyHtml:post.body_html||'',
    neighbourhoods:toLines(post.neighbourhoods),serviceSlugs:toLines(post.service_slugs),
    ctaTitle:post.cta_title||'',ctaText:post.cta_text||'',status:post.status||'draft',
    seoTitle:post.seo_title||'',seoDescription:post.seo_description||'',ogImage:post.og_image||'',
  };
  Object.entries(map).forEach(([key,value])=>{if(byName(form,key))byName(form,key).value=value});
  document.getElementById('locationEditorTitle').textContent=post.id?'Edit Location Post':'New Location Post';
  document.getElementById('locationDanger').classList.toggle('hidden',!post.id);
  renderFaq();
  syncSlugPreview('location');
  showView('location-editor');
}

function renderFaq(){
  const target=document.getElementById('faqList');
  if(!state.faq.length){target.innerHTML='<div class="empty">No FAQs added.</div>';return}
  target.innerHTML=state.faq.map((item,index)=>`
    <div class="faq-item">
      <div class="faq-head"><strong>FAQ ${index+1}</strong><button class="faq-remove" type="button" data-remove-faq="${index}">Remove</button></div>
      <label>Question<input data-faq-question="${index}" value="${escapeHtml(item.question||'')}"></label>
      <label>Answer<textarea rows="4" data-faq-answer="${index}">${escapeHtml(item.answer||'')}</textarea></label>
    </div>
  `).join('');
}

function syncSlugPreview(type){
  const form=document.getElementById(type==='service'?'serviceForm':'locationForm');
  const value=byName(form,'slug').value||slugify(byName(form,'title').value)||`${type}-name`;
  document.querySelector(`[data-preview="${type}-slug"]`).textContent=value;
}

async function saveService(){
  const form=document.getElementById('serviceForm');
  const values=readForm(form);
  const body={
    ...(state.service?.id?{id:state.service.id}:{}),
    ...values,
    slug:slugify(values.slug||values.title),
    sortOrder:Number(values.sortOrder||0),
    bullets:lines(values.bullets),
  };
  const payload=await api(API.services,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  state.service=payload.post;
  notice('Service post saved.');
  await loadServices();
  serviceToForm(payload.post);
}
async function saveLocation(){
  const form=document.getElementById('locationForm');
  const values=readForm(form);
  const body={
    ...(state.location?.id?{id:state.location.id}:{}),
    ...values,
    slug:slugify(values.slug||values.title),
    sortOrder:Number(values.sortOrder||0),
    neighbourhoods:lines(values.neighbourhoods),
    serviceSlugs:lines(values.serviceSlugs),
    faq:state.faq,
  };
  const payload=await api(API.locations,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  state.location=payload.post;
  notice('Location post saved.');
  await loadLocations();
  locationToForm(payload.post);
}

async function loadSettings(){
  const payload=await api(API.settings);
  const form=document.getElementById('settingsForm');
  Object.entries(payload.settings||{}).forEach(([key,value])=>{if(byName(form,key))byName(form,key).value=value||''});
}
async function saveSettings(){
  const settings=readForm(document.getElementById('settingsForm'));
  await api(API.settings,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})});
  notice('Sunwings settings saved.');
}



async function loadFacebookPosts(){
  const payload=await api(API.facebookPosts);
  state.facebookPosts=Array.isArray(payload.posts)?payload.posts:[];
  const target=document.getElementById('facebookFeedPreview');
  if(!target)return;
  if(!state.facebookPosts.length){target.innerHTML='<div class="empty">No Facebook posts synced yet.</div>';return}
  target.innerHTML=state.facebookPosts.map(post=>`
    <article class="social-preview-card">
      ${post.image_url?`<img src="${escapeHtml(post.image_url)}" alt="">`:''}
      <div><small>${date(post.published_at)}</small><p>${escapeHtml(post.message||'Facebook post')}</p>
      ${post.permalink_url?`<a href="${escapeHtml(post.permalink_url)}" target="_blank" rel="noreferrer">View on Facebook ↗</a>`:''}</div>
    </article>`).join('');
}
async function syncFacebookPosts(){
  const button=document.getElementById('syncFacebookPosts');
  button.disabled=true; button.textContent='Syncing…';
  try{
    const payload=await api(API.facebookPosts,{method:'POST'});
    notice(`Synced ${payload.count||0} Facebook posts.`);
    await loadFacebookPosts();
  }finally{button.disabled=false;button.textContent='Sync Facebook Posts'}
}

function integrationForm(provider){return document.getElementById(provider==='google_reviews'?'googleIntegrationForm':'facebookIntegrationForm')}
function integrationPrefix(provider){return provider==='google_reviews'?'google':'facebook'}
function setIntegrationForm(provider,item={}){
  const form=integrationForm(provider), config=item.config||{}, prefix=integrationPrefix(provider);
  Object.entries(config).forEach(([key,value])=>{if(byName(form,key))byName(form,key).value=String(value??'')});
  byName(form,'enabled').checked=Boolean(item.enabled);
  const secretKey=provider==='google_reviews'?'api_key':'page_access_token';
  document.getElementById(prefix+'SecretState').textContent=item.secretConfigured?.[secretKey]?'Saved securely · enter a new value only to replace it':provider==='google_reviews'?'No key saved':'No token saved';
  const status=document.getElementById(prefix+'Status');
  status.textContent=item.last_test_ok===true?'Connected':item.last_test_ok===false?'Connection failed':'Not tested';
  status.className='connection-badge '+(item.last_test_ok===true?'connected':item.last_test_ok===false?'failed':'');
  document.getElementById(prefix+'Detail').textContent=item.last_test_message||(item.last_tested_at?'Last tested '+date(item.last_tested_at):'Enter the required information, then test the connection.');
}
async function loadIntegrations(){
  const payload=await api(API.integrations);
  state.integrations=Object.fromEntries((payload.integrations||[]).map(item=>[item.provider,item]));
  setIntegrationForm('google_reviews',state.integrations.google_reviews||{});
  setIntegrationForm('facebook',state.integrations.facebook||{});
}
function integrationPayload(provider,action){
  const form=integrationForm(provider), values=readForm(form);
  const secretKey=provider==='google_reviews'?'api_key':'page_access_token';
  const config={...values}; delete config[secretKey]; delete config.enabled;
  return {provider,action,enabled:byName(form,'enabled').checked,config,secrets:{[secretKey]:values[secretKey]||''}};
}
function renderIntegrationPreview(provider,preview){
  const prefix=integrationPrefix(provider), target=document.getElementById(prefix+'Preview');
  if(!preview){target.classList.add('hidden');target.innerHTML='';return}
  if(provider==='google_reviews'){
    const reviews=Array.isArray(preview.reviews)?preview.reviews.slice(0,3):[];
    target.innerHTML='<strong>Live test preview</strong><small>'+escapeHtml(preview.displayName?.text||'Google business')+' · '+escapeHtml(String(preview.rating||'—'))+' stars · '+escapeHtml(String(preview.userRatingCount||0))+' ratings</small>'+reviews.map(r=>'<p>★ '+escapeHtml(r.authorAttribution?.displayName||'Reviewer')+': '+escapeHtml((r.text?.text||'').slice(0,180))+'</p>').join('');
  }else{
    const posts=preview.posts?.data||[];
    target.innerHTML='<strong>Live test preview</strong><small>'+escapeHtml(preview.name||'Facebook Page')+'</small>'+posts.slice(0,3).map(p=>'<p>'+escapeHtml((p.message||'Post with media').slice(0,220))+'</p>').join('');
  }
  target.classList.remove('hidden');
}
async function saveIntegration(provider,action='save'){
  const button=document.querySelector(action==='test'?`[data-integration-test="${provider}"]`:`[data-integration-save="${provider}"]`);
  const original=button.textContent; button.disabled=true; button.textContent=action==='test'?'Testing…':'Saving…';
  try{
    const payload=await api(API.integrations,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(integrationPayload(provider,action))});
    state.integrations[provider]=payload.integration;
    setIntegrationForm(provider,payload.integration);
    renderIntegrationPreview(provider,payload.preview);
    const secretKey=provider==='google_reviews'?'api_key':'page_access_token';
    byName(integrationForm(provider),secretKey).value='';
    notice(action==='test'?'Connection successful.':'Integration settings saved.');
  }finally{button.disabled=false;button.textContent=original}
}

async function initialLoad(){
  try{
    await Promise.all([loadServices(),loadLocations(),loadBlog(),loadQuotes(),loadSettings(),loadIntegrations(),loadFacebookPosts()]);
  }catch(error){
    notice(error.message,'error');
  }
}

nav.forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.go)));
document.getElementById('mobileMenu').addEventListener('click',()=>{sidebar.classList.add('open');scrim.classList.add('show')});
scrim.addEventListener('click',closeMenu);

document.getElementById('newService').addEventListener('click',()=>serviceToForm({}));
document.getElementById('newLocation').addEventListener('click',()=>locationToForm({}));
document.getElementById('newBlogPost').addEventListener('click',()=>blogToForm({}));
document.getElementById('saveService').addEventListener('click',saveService);
document.getElementById('saveLocation').addEventListener('click',saveLocation);
document.getElementById('saveBlogPost').addEventListener('click',()=>saveBlogPost().catch(error=>notice(error.message,'error')));
document.getElementById('serviceForm').addEventListener('submit',event=>{event.preventDefault();saveService().catch(error=>notice(error.message,'error'))});
document.getElementById('locationForm').addEventListener('submit',event=>{event.preventDefault();saveLocation().catch(error=>notice(error.message,'error'))});
document.getElementById('blogForm').addEventListener('submit',event=>{event.preventDefault();saveBlogPost().catch(error=>notice(error.message,'error'))});
document.getElementById('saveSettings').addEventListener('click',()=>saveSettings().catch(error=>notice(error.message,'error')));
document.getElementById('resetHeaderSettings').addEventListener('click',()=>{
  const form=document.getElementById('settingsForm');
  const defaults={logo_desktop_width:140,logo_mobile_width:170,logo_desktop_max_height:100,logo_mobile_max_height:90,logo_offset_x:0,logo_offset_y:0,header_desktop_height:110,header_mobile_height:105,topbar_enabled:'true',topbar_emphasis:'Reliable • On-Time • Professional',topbar_text:'Moving & delivery from Toronto to Niagara',call_button_enabled:'true',call_button_text:'Call Now'};
  Object.entries(defaults).forEach(([key,value])=>{if(byName(form,key))byName(form,key).value=value});
  notice('Header defaults restored. Save Settings to apply them.');
});
document.querySelectorAll('[data-integration-save]').forEach(button=>button.addEventListener('click',()=>saveIntegration(button.dataset.integrationSave,'save').catch(error=>notice(error.message,'error'))));
document.querySelectorAll('[data-integration-test]').forEach(button=>button.addEventListener('click',()=>saveIntegration(button.dataset.integrationTest,'test').catch(error=>notice(error.message,'error'))));

document.getElementById('serviceList').addEventListener('click',event=>{
  const id=event.target.closest('[data-edit-services]')?.dataset.editServices;
  if(id)serviceToForm(state.services.find(item=>item.id===id)||{});
});
document.getElementById('locationList').addEventListener('click',event=>{
  const id=event.target.closest('[data-edit-locations]')?.dataset.editLocations;
  if(id)locationToForm(state.locations.find(item=>item.id===id)||{});
});
document.getElementById('blogList').addEventListener('click',event=>{
  const id=event.target.closest('[data-edit-blog]')?.dataset.editBlog;
  if(id)blogToForm(state.blog.find(item=>item.id===id)||{});
});
document.getElementById('quoteList').addEventListener('change',async event=>{
  const id=event.target.dataset.quoteStatus;
  if(!id)return;
  try{
    await api(API.quotes,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:event.target.value})});
    notice('Quote status updated.');
    await loadQuotes();
  }catch(error){notice(error.message,'error')}
});
document.getElementById('addFaq').addEventListener('click',()=>{state.faq.push({question:'',answer:''});renderFaq()});
document.getElementById('faqList').addEventListener('input',event=>{
  const q=event.target.dataset.faqQuestion;
  const a=event.target.dataset.faqAnswer;
  if(q!==undefined)state.faq[Number(q)].question=event.target.value;
  if(a!==undefined)state.faq[Number(a)].answer=event.target.value;
});
document.getElementById('faqList').addEventListener('click',event=>{
  const index=event.target.dataset.removeFaq;
  if(index===undefined)return;
  state.faq.splice(Number(index),1);
  renderFaq();
});
document.getElementById('serviceForm').addEventListener('input',event=>{
  if(event.target.name==='title'&&!state.service?.id&&!byName(event.currentTarget,'slug').dataset.touched){
    byName(event.currentTarget,'slug').value=slugify(event.target.value);
  }
  if(event.target.name==='slug')event.target.dataset.touched='1';
  syncSlugPreview('service');
});
document.getElementById('blogForm').addEventListener('input',event=>{
  if(event.target.name==='title'&&!state.blogPost?.id&&!byName(event.currentTarget,'slug').dataset.touched){
    byName(event.currentTarget,'slug').value=slugify(event.target.value);
  }
  if(event.target.name==='slug')event.target.dataset.touched='1';
  syncBlogSlugPreview();
});
document.getElementById('locationForm').addEventListener('input',event=>{
  if(event.target.name==='title'&&!state.location?.id&&!byName(event.currentTarget,'slug').dataset.touched){
    byName(event.currentTarget,'slug').value=slugify(event.target.value);
  }
  if(event.target.name==='slug')event.target.dataset.touched='1';
  syncSlugPreview('location');
});
document.getElementById('deleteService').addEventListener('click',async()=>{
  if(!state.service?.id||!confirm(`Delete "${state.service.title}"?`))return;
  try{
    await api(`${API.services}?id=${encodeURIComponent(state.service.id)}`,{method:'DELETE'});
    notice('Service post deleted.');
    state.service=null;
    await loadServices();
    showView('services');
  }catch(error){notice(error.message,'error')}
});
document.getElementById('deleteBlogPost').addEventListener('click',async()=>{
  if(!state.blogPost?.id||!confirm(`Delete "${state.blogPost.title}"?`))return;
  try{
    await api(`${API.blog}?id=${encodeURIComponent(state.blogPost.id)}`,{method:'DELETE'});
    notice('Moving Tip deleted.');
    state.blogPost=null;
    await loadBlog();
    showView('blog');
  }catch(error){notice(error.message,'error')}
});
document.getElementById('deleteLocation').addEventListener('click',async()=>{
  if(!state.location?.id||!confirm(`Delete "${state.location.title}"?`))return;
  try{
    await api(`${API.locations}?id=${encodeURIComponent(state.location.id)}`,{method:'DELETE'});
    notice('Location post deleted.');
    state.location=null;
    await loadLocations();
    showView('locations');
  }catch(error){notice(error.message,'error')}
});

showView(location.hash.slice(1)||'dashboard');
initialLoad();

const syncFacebookButton=document.getElementById('syncFacebookPosts');
if(syncFacebookButton)syncFacebookButton.addEventListener('click',()=>syncFacebookPosts().catch(error=>notice(error.message,'error')));
