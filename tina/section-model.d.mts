export type Question={id:string;question:string;answer:string;visible:boolean};
export type ContentSection={id:string;title:string;body:string;image:string;alt:string;visible:boolean;kind?:'text'|'faq'|'artwork';questions?:Question[];artworkIds?:string[]};
export type PageBlock={key:string;visible:boolean};
export type SocialLink={id:string;name:string;url:string;label:string;visible:boolean};
export type PageContent={items:ContentSection[];layout:PageBlock[];socials:SocialLink[]};
export type SectionRevision=Omit<PageContent,'socials'>&{id:string;createdAt:string};
export type SectionPage=PageContent&{history:SectionRevision[]};
export const SECTION_LIMITS:{count:number;title:number;body:number;questions:number;answer:number;totalText:number;photoBytes:number;photoPixels:number};
export function newSection(kind?:'text'|'faq'|'artwork'):ContentSection;
export function newQuestion():Question;
export function sectionInput(value:ContentSection):ContentSection;
export function sectionsInput(items:unknown):ContentSection[];
export function applySection(items:ContentSection[],index:number,draft:ContentSection):ContentSection[];
export function sectionType(item:ContentSection):string;
export const builtInBlocks:Record<string,string>;
export function layoutInput(layout:PageBlock[]|undefined,items:ContentSection[]):PageBlock[];
export function pageContent(value:{items?:ContentSection[];layout?:PageBlock[];socials?:SocialLink[]}):PageContent;
export function sectionPageInput(value:{items?:ContentSection[];layout?:PageBlock[];history?:SectionRevision[];socials?:SocialLink[]}):SectionPage;
export function withSectionHistory(next:PageContent,current:SectionPage,now?:string,id?:string):SectionPage;
export function toggleBlock(page:PageContent,key:string):PageContent;

export const DEFAULT_SOCIALS:SocialLink[];
export function socialsInput(value:unknown):SocialLink[];

export function restoreSectionVersion(page:SectionPage,id:string):PageContent;
