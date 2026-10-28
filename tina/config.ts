import { defineConfig, type MediaUploadOptions } from 'tinacms';
import { installArtistStudio } from './artist-screen';

const string = (name: string, label: string, required = false) => ({type:'string' as const,name,label,required});
export default defineConfig({
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.TINA_PUBLIC_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  telemetry: 'disabled',
  build: { outputFolder:'admin', publicFolder:'.', basePath:process.env.TINA_PUBLIC_BASE_PATH || '' },
  media: { tina:{ publicFolder:'.',mediaRoot:'assets' },accept:['image/png','image/jpeg','image/webp','image/gif'] },
  cmsCallback(cms) {
    installArtistStudio(cms);
    // Keep Tina's repo-backed transport; enforce the site's stricter upload policy.
    // The provider may replace its store on render; guard the stable manager.
    Object.defineProperty(cms.media,'maxSize',{get:() => 24 * 1024 * 1024,configurable:true});
    const persist = cms.media.persist.bind(cms.media);
    cms.media.persist = async (files: MediaUploadOptions[]) => {
      for (const {file,directory} of files) {
        if (file.size > 24 * 1024 * 1024) throw Error('Images must be 24 MiB or smaller. Please compress the file first.');
        if (!/^[a-z0-9][a-z0-9_-]*\.(png|jpe?g|webp|gif)$/i.test(file.name)) throw Error('Use letters, numbers, hyphens or underscores in PNG/JPG/WebP/GIF filenames. Upload replacements with a new filename.');
        if (directory.split('/').includes('..')) throw Error('Invalid folder path.');
      }
      return persist(files);
    };
    // Removing a work is done with its visibility switch; retain media for recovery.
    cms.media.delete = async () => { throw Error('Keep media files so they can be restored. To hide artwork, turn off "Show on website" in its artwork entry.'); };
    cms.media.rename = async () => { throw Error('Upload replacements with a new filename. Keep the original file so it can be restored.'); };
    return cms;
  },
  schema: {collections:[
    {
      name:'artwork',label:'Artwork',path:'content/artworks',format:'json',
      defaultItem:{visible:false,order:1000,category:'Illustration'},
      ui:{allowedActions:{delete:false},filename:{description:'Use a unique internal filename with letters and numbers, such as work-024. You can enter it manually for non-English titles.',parse:value => value.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),slugify:values => String(values.title || 'artwork').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'artwork'}},
      fields:[
        {...string('title','Artwork title',true),isTitle:true},
        {type:'boolean',name:'visible',label:'Show on website (turn off to hide, turn on to restore)',required:true},
        {type:'number',name:'order',label:'Display order (lower numbers appear first)',required:true},
        {...string('category','Category name',true),description:'Enter the exact category name from "Categories and pricing". Add new categories there first.'},
        {type:'image',name:'image',label:'Original image / replacement',required:true,description:'PNG/JPG/WebP/GIF, up to 24 MiB. Use a new filename for replacements.'},
        {type:'image',name:'preview',label:'Thumbnail (optional; uses the original image if empty)',description:'When replacing the original image, also replace or clear this field to avoid showing the old thumbnail.'},
        {...string('alt','Image description (alt text)',true),ui:{component:'textarea'}},
      ]
    },
    {
      name:'settings',label:'Categories and pricing',path:'content',format:'json',match:{include:'settings'},
      ui:{allowedActions:{create:false,delete:false}},fields:[
        {type:'object',name:'categories',label:'Artwork categories (drag to reorder)',list:true,ui:{defaultItem:{color:'#b7d99a'},itemProps:item => ({label:item?.name})},fields:[
          string('name','Category name (also update artwork entries when renaming)',true),{...string('color','Color (#RRGGBB)',true),ui:{validate:(value: string | undefined) => /^#[0-9a-f]{6}$/i.test(value || '') ? undefined : 'Enter a six-digit hex color, such as #f28db2.'}},
          {...string('shadowColor','Shadow color (optional; uses the category color if empty)'),ui:{validate:(value: string | undefined) => !value || /^#[0-9a-f]{6}$/i.test(value) ? undefined : 'Enter a six-digit hex color, such as #f28db2.'}}
        ]},
        {type:'object',name:'menu',label:'Pricing cards (drag to reorder)',list:true,ui:{defaultItem:{visible:false,rows:[]},itemProps:item => ({label:item?.title})},fields:[
          string('title','Service category title',true),{type:'boolean',name:'visible',label:'Show on website',required:true},
          {type:'object',name:'rows',label:'Services and prices (drag to reorder)',list:true,ui:{itemProps:item => ({label:item?.label})},fields:[string('label','Service name',true),string('note','Service note'),string('price','Full price text (include the confirmed currency)',true),string('detail','Price note')]},
          {...string('note','Card note'),ui:{component:'textarea'}},string('extra','Extra item pricing (leave empty for standard cards)')
        ]}
      ]
    }
  ]}
});
