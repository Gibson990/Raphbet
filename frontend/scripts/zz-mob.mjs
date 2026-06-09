import { chromium } from 'playwright';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('http://localhost:3000/',{waitUntil:'networkidle'});
await p.waitForTimeout(1500);
await p.screenshot({path:'scripts/shots/zz-mob-home.png'});
await b.close(); console.log('ok');
