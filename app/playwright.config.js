import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const chrome=process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({testDir:'./test/browser',workers:1,use:{baseURL:process.env.TEST_URL||'http://127.0.0.1:5173',viewport:{width:1440,height:960},launchOptions:{executablePath:existsSync(chrome)?chrome:undefined,args:['--no-first-run','--no-default-browser-check']}}});
