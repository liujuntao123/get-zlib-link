/**
 * CLI: fetch Z-Library official links from Wikipedia and print JSON.
 *
 * Usage: npm run fetch
 */
import { getZlibLinks } from './lib/scrape.mjs';

const result = await getZlibLinks();

if (result.ok) {
  console.log('提取到的官方网址：', result.primaryUrl);
  if (result.links.length > 1) {
    console.log('\n全部候选：');
    for (const link of result.links) {
      console.log(`  - ${link.url}  (${link.wiki}/${link.source})`);
    }
  }
  console.log('\n完整结果：');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
} else {
  console.error('未能提取到官方网址：', result.error || 'unknown');
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
