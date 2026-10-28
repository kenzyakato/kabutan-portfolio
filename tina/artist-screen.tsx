import React,{useMemo} from 'react';
import {useCMS,type TinaCMS} from 'tinacms';
import {ArtistApp} from './artist-app';
import {createArtistAPI} from './artist-api';
import {START_ROUTE} from './artist-model.mjs';

function StudioScreen(){const cms=useCMS();const api=useMemo(()=>createArtistAPI(cms),[cms]);return <ArtistApp api={api}/>;}
export function LoginHelp(){return <div style={{padding:24,fontFamily:'system-ui',lineHeight:1.6}}><strong>Welcome to Kabutan's studio</strong><p>Sign in with the email address that received your invitation. Then choose “Start here” to edit your artwork and prices.</p><p>If you cannot sign in, ask the website owner to check your existing invitation.</p></div>;}
export function installArtistStudio(cms:TinaCMS){
  cms.plugins.add({__type:'screen' as const,name:'Start here',Component:StudioScreen,Icon:()=> <span aria-hidden="true">✿</span>,layout:'fullscreen' as const,navCategory:'Dashboard' as const});
  if(cms.sidebar){cms.sidebar.loadingPlaceholder=LoginHelp;cms.sidebar.isOpen=false;}
  // Route only the default start page. Native screens and existing deep links still work.
  if(typeof window!=='undefined'&&['','#','#/'].includes(window.location.hash))window.location.replace(START_ROUTE);
}
