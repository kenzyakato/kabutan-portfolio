import { defineConfig, type MediaUploadOptions } from 'tinacms';

const string = (name: string, label: string, required = false) => ({type:'string' as const,name,label,required});
export default defineConfig({
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.TINA_PUBLIC_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  telemetry: 'disabled',
  build: { outputFolder:'admin', publicFolder:'.', basePath:process.env.TINA_PUBLIC_BASE_PATH || '' },
  media: { tina:{ publicFolder:'.',mediaRoot:'assets' },accept:['image/png','image/jpeg','image/webp','image/gif'] },
  cmsCallback(cms) {
    // Keep Tina's repo-backed transport; enforce the site's stricter upload policy.
    // The provider may replace its store on render; guard the stable manager.
    Object.defineProperty(cms.media,'maxSize',{get:() => 24 * 1024 * 1024,configurable:true});
    const persist = cms.media.persist.bind(cms.media);
    cms.media.persist = async (files: MediaUploadOptions[]) => {
      for (const {file,directory} of files) {
        if (file.size > 24 * 1024 * 1024) throw Error('圖片必須小於或等於 24 MiB，請先壓縮。');
        if (!/^[a-z0-9][a-z0-9_-]*\.(png|jpe?g|webp|gif)$/i.test(file.name)) throw Error('請用英文字母、數字、連字號命名 PNG/JPG/WebP/GIF。換圖請上傳新檔名。');
        if (directory.split('/').includes('..')) throw Error('無效的資料夾。');
      }
      return persist(files);
    };
    // Removing a work is done with its visibility switch; retain media for recovery.
    cms.media.delete = async () => { throw Error('為保留可恢復的原圖，請在作品中關閉「公開展示」，不要刪除媒體。'); };
    cms.media.rename = async () => { throw Error('換圖請上傳新檔名，保留原檔以便恢復。'); };
    return cms;
  },
  schema: {collections:[
    {
      name:'artwork',label:'作品：新增・換圖・隱藏・排序',path:'content/artworks',format:'json',
      defaultItem:{visible:false,order:1000,category:'Illustration'},
      ui:{allowedActions:{delete:false},filename:{description:'內部檔名須唯一；非英文標題可手動填入英數檔名，例如 work-024。',parse:value => value.toLowerCase().replace(/[^a-z0-9_-]/g,'-'),slugify:values => String(values.title || 'artwork').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'artwork'}},
      fields:[
        {...string('title','作品名稱',true),isTitle:true},
        {type:'boolean',name:'visible',label:'公開展示（關閉可隱藏，重新開啟可恢復）',required:true},
        {type:'number',name:'order',label:'顯示順序（數字小的排前面）',required:true},
        {...string('category','分類名稱',true),description:'填入「分類與價目」中的完整分類名稱；可先在那裡新增分類。'},
        {type:'image',name:'image',label:'原圖／換圖',required:true,description:'PNG/JPG/WebP/GIF，最多 24 MiB。換圖使用新檔名。'},
        {type:'image',name:'preview',label:'縮圖（可留空，使用原圖）',description:'換原圖時也更換或清空這欄，避免圖庫仍顯示舊圖。'},
        {...string('alt','圖片內容描述',true),ui:{component:'textarea'}},
      ]
    },
    {
      name:'settings',label:'分類與價目',path:'content',format:'json',match:{include:'settings'},
      ui:{allowedActions:{create:false,delete:false}},fields:[
        {type:'object',name:'categories',label:'作品分類（拖曳排序）',list:true,ui:{defaultItem:{color:'#b7d99a'},itemProps:item => ({label:item?.name})},fields:[
          string('name','分類名稱（更名時同步修改作品分類）',true),{...string('color','顏色 #RRGGBB',true),ui:{validate:(value: string | undefined) => /^#[0-9a-f]{6}$/i.test(value || '') ? undefined : '請輸入六位十六進位顏色，例如 #f28db2'}},
          {...string('shadowColor','陰影色（留空跟隨分類顏色）'),ui:{validate:(value: string | undefined) => !value || /^#[0-9a-f]{6}$/i.test(value) ? undefined : '請輸入六位十六進位顏色'}}
        ]},
        {type:'object',name:'menu',label:'價目卡（拖曳排序）',list:true,ui:{defaultItem:{visible:false,rows:[]},itemProps:item => ({label:item?.title})},fields:[
          string('title','服務分類標題',true),{type:'boolean',name:'visible',label:'公開展示',required:true},
          {type:'object',name:'rows',label:'服務與價格（拖曳排序）',list:true,ui:{itemProps:item => ({label:item?.label})},fields:[string('label','服務名稱',true),string('note','服務補充'),string('price','完整價格原文（含已確認幣種）',true),string('detail','價格補充')]},
          {...string('note','卡片說明'),ui:{component:'textarea'}},string('extra','額外項目價格（一般卡片留空）')
        ]}
      ]
    }
  ]}
});
