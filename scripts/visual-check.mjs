import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
const warnings = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if(['error','warning'].includes(message.type())) warnings.push(message.text()); });
await page.goto('http://127.0.0.1:3000');
await page.getByRole('button', { name: 'Docker 데모 체험', exact: true }).waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'artifacts/home-desktop.png', fullPage: true });

async function inspect(label) {
  const result = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    function rgba(color) { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; }
    function luminance(color) { const c = color.slice(0, 3).map(v => { const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4; });return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
    function background(el) { while(el){const value=rgba(getComputedStyle(el).backgroundColor); if(value[3]>240)return value;el=el.parentElement;}return [255,255,255,255]; }
    const textContrast = [], overflow = [];
    for(const el of document.querySelectorAll('main *')) {
      const style = getComputedStyle(el), rect=el.getBoundingClientRect();
      if(!rect.width || !rect.height || style.display==='none' || el.closest('.sr-only,pre,.progress-fill'))continue;
      if(rect.right>innerWidth+1 || rect.left< -1)overflow.push({tag:el.tagName,class:el.className,text:el.textContent.slice(0,50),left:rect.left,right:rect.right});
      if(![...el.childNodes].some(node=>node.nodeType===3&&node.textContent.trim()))continue;
      if(el.closest(':disabled,.muted-lesson'))continue;
      const fg=rgba(style.color),bg=background(el),l1=luminance(fg),l2=luminance(bg),ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
      const large=parseFloat(style.fontSize)>=24 || (parseFloat(style.fontSize)>=18&&parseInt(style.fontWeight)>=700);
      if(ratio < (large?3:4.5))textContrast.push({text:el.textContent.trim().slice(0,65),class:el.className,ratio:+ratio.toFixed(2),fg,bg});
    }
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow,textContrast};
  });
  console.log(JSON.stringify({screen:label,...result}));
}

await inspect('home desktop');
for(const width of [320,375,414,768,1280]) {
  await page.setViewportSize({width,height:width===1280?800:900});
  await page.evaluate(() => window.scrollTo(0,0));
  await inspect(`home ${width}`);
  if(width!==1280)await page.screenshot({path:`artifacts/home-${width}.png`,fullPage:true});
  if(width===1280)console.log(JSON.stringify({heroCta:await page.locator('.create-actions').boundingBox()}));
}
await page.setViewportSize({width:1440,height:1050});
await page.getByRole('button',{name:'Docker 데모 체험',exact:true}).click();
await page.locator('.course-summary').waitFor();
await page.screenshot({path:'artifacts/course-desktop.png',fullPage:true});
await inspect('course desktop');
await page.getByRole('link',{name:'첫 레슨 시작하기',exact:true}).click();
await page.getByRole('heading',{name:'오늘 무엇을 배우나요?',exact:true}).waitFor();
await page.screenshot({path:'artifacts/lesson-desktop.png',fullPage:true});
await inspect('lesson desktop');
console.log(JSON.stringify({pageErrors:errors,browserWarnings:warnings}));
await browser.close();
