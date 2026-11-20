// Public site content. These are the built-in defaults; the admin edits and publishes
// replacements from Base (base.dawnspire.cc), which the site loads at runtime.

export const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.cospheria.app';

export type Project = {
  id: string; name: string; subtitle: string; type: string; status: string; year: string;
  description: string; stack: string[]; theme: string; detail: string; phase: string;
  image?: string; link?: string; note?: string;
};
export type MediaItem = { title: string; category: string; image: string; caption: string; alt: string; credit: string };
export type Phase = { label: string; from: string | null; to: string; phase: 'complete' | 'active' | 'planned' };
export type TimelineRow = { project: string; kind: string; phases: Phase[]; deadline?: string };
export type Person = { name: string; role: string; bio: string; image?: string; group: 'board' | 'team' };

export type SiteContent = { projects: Project[]; media: MediaItem[]; timeline: TimelineRow[]; personnel: Person[] };

export const defaultProjects: Project[] = [
  {id:'01',name:'COSPHERIA',subtitle:'Where cosplay communities meet.',type:'Mobile applications',status:'Live on Google Play',year:'2026',description:'A mobile-first cosplay community and event platform for creators, attendees, organizers, and moderators.',stack:['React Native','Expo','TypeScript','Fastify','PostgreSQL'],theme:'cospheria',detail:'Cospheria brings the cosplay community into one app. Creators share their work, attendees find and join events, organizers run their gatherings, and moderators keep the space safe. It is our flagship product and available now on Google Play.',phase:'Scalability development · due Dec 27, 2026',link:PLAY_STORE,note:'Available now on Google Play'},
  {id:'02',name:'MERIDIAN',subtitle:'Municipal data. Planning intelligence.',type:'Civic & GIS systems',status:'Starts January 2027',year:'2027',description:'A GIS-centered decision-support platform that helps municipal planning offices turn their data into development decisions.',stack:['React','TypeScript','Python','PostGIS','Celery'],theme:'meridian',image:'/assets/projects/meridian.jpg',detail:'MERIDIAN connects municipal data management, spatial visualization, socioeconomic scenarios, multi-criteria decision analysis, and AI-assisted planning guidance in a single GIS workspace. It prepares preliminary SEPP and CDP drafts that planners review and refine. Santa Cruz, Laguna is the proposed pilot.',phase:'Jan 2027 – Jan 2028',note:'Design preview · Map data © OpenStreetMap contributors'},
  {id:'03',name:'BDRIS',subtitle:'Every road and drain, on one map.',type:'Civic & GIS systems',status:'In development',year:'2026',description:'A barangay-level road and drainage information system for mapping and maintaining local infrastructure records.',stack:['React','TypeScript','Canvas 2D','SQLite','Tauri'],theme:'bdris',image:'/assets/projects/bdris.jpg',detail:'The Barangay Level Drainage and Road Information System gives Barangay 7 in Calamba, Laguna a map-based workspace for recording roads and drainage, tracking their condition, and keeping infrastructure records in one place.',phase:'Full development · due Dec 15, 2026',note:'Design preview of the BDRIS workspace'},
  {id:'04',name:'AGRIWISE',subtitle:'Details coming soon.',type:'Agriculture',status:'To be announced',year:'TBA',description:'An agriculture-focused product in early planning. More to share soon.',stack:[],theme:'agriwise',detail:'Agriwise is an upcoming Dawnspire product for agriculture. It is in early planning, and details will be shared as the work takes shape.',phase:'To be announced',note:'Placeholder · details to follow'},
];

export const defaultMedia: MediaItem[] = [
  {title:'2nd Runner-Up',category:'DOST Hack4AProgress 2026',image:'/assets/media-agriwise-hack4aprogress.jpg',caption:'Agriwise placed 2nd Runner-Up at the DOST Hack4AProgress 2026 hackathon. The team took the stage to present the project and answer the judges\u2019 questions.',alt:'The Agriwise team on stage during the Q&A at DOST Hack4AProgress 2026',credit:'Photo: DOST CALABARZON'},
  {title:'Cospheria \u00d7 Cos7',category:'First partnership event',image:'/assets/media-cospheria-cos7.jpg',caption:'Cospheria\u2019s first-ever partnership event, with Cos7. A day with the cosplay community the app was built for.',alt:'Cosplayers and attendees posing together at the Cospheria and Cos7 partnership event',credit:'Photo: Jeruskie'},
];

export const defaultTimeline: TimelineRow[] = [
  {project:'COSPHERIA',kind:'Mobile application',deadline:'2026-12-27',phases:[{label:'Scalability development',from:null,to:'2026-12-27',phase:'active'}]},
  {project:'BDRIS',kind:'Civic & GIS system',deadline:'2026-12-15',phases:[{label:'Full development',from:null,to:'2026-12-15',phase:'active'}]},
  {project:'MERIDIAN',kind:'Civic & GIS system',phases:[
    {label:'Requirements & data preparation',from:'2027-01-01',to:'2027-02-28',phase:'planned'},
    {label:'System development',from:'2027-03-01',to:'2027-06-30',phase:'planned'},
    {label:'Pilot implementation',from:'2027-07-01',to:'2027-09-30',phase:'planned'},
    {label:'Evaluation & scalability',from:'2027-10-01',to:'2028-01-01',phase:'planned'},
  ]},
  {project:'AGRIWISE',kind:'Agriculture',phases:[]},
];

export const defaultPersonnel: Person[] = [
  { name: 'Founder 01', role: 'Co-founder / Board of Directors', bio: 'Name and biography to be announced.', group: 'board' },
  { name: 'Founder 02', role: 'Co-founder / Board of Directors', bio: 'Name and biography to be announced.', group: 'board' },
  { name: 'Founder 03', role: 'Co-founder / Board of Directors', bio: 'Name and biography to be announced.', group: 'board' },
];

export const defaultContent: SiteContent = { projects: defaultProjects, media: defaultMedia, timeline: defaultTimeline, personnel: defaultPersonnel };
