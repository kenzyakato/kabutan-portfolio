export type ContentSection={id:string;title:string;body:string;image:string;alt:string;visible:boolean};
export function newSection():ContentSection;
export function sectionInput(value:ContentSection):ContentSection;
export function sectionsInput(items:unknown):ContentSection[];
export function applySection(items:ContentSection[],index:number,draft:ContentSection):ContentSection[];
