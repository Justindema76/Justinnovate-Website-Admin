import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full));
    else entries.push(full);
  }
  return entries;
}

function expectFile(path) {
  try {
    if (!statSync(join(root, path)).isFile()) failures.push(`Missing file: ${path}`);
  } catch {
    failures.push(`Missing file: ${path}`);
  }
}

[
  'api/_shared/auth.js',
  'api/_shared/http.js',
  'api/_shared/siteRegistry.js',
  'api/_shared/supabase.js',
  'api/_shared/siteContent.js',
  'api/_shared/siteAssets.js',
  'api/_shared/contentPosts.js',
  'api/_shared/emailSettings.js',
  'api/admin/sites.js',

  'api/admin/justindematteis/service-requests.js',
  'api/admin/justindematteis/service-request-assignment.js',
  'api/admin/justindematteis/service-request-emails.js',
  'api/admin/justindematteis/hiring-contacts.js',
  'api/admin/justindematteis/departments.js',
  'api/admin/justindematteis/email-settings.js',
  'api/admin/justindematteis/pages.js',
  'api/admin/justindematteis/styles.js',
  'api/admin/justindematteis/global-sections.js',
  'api/admin/justindematteis/blog.js',
  'api/admin/justindematteis/work-posts.js',
  'api/admin/justindematteis/ai-posts.js',
  'api/admin/justindematteis/videos.js',
  'api/admin/justindematteis/media.js',
  'api/admin/justindematteis/social-links.js',

  'api/admin/justconsignin/demo-requests.js',
  'api/admin/justconsignin/demo-request-emails.js',
  'api/admin/justconsignin/demo-request-schedule.js',
  'api/admin/justconsignin/beta-partners.js',
  'api/admin/justconsignin/email-settings.js',
  'api/admin/justconsignin/pages.js',
  'api/admin/justconsignin/styles.js',
  'api/admin/justconsignin/global-sections.js',
  'api/admin/justconsignin/blog.js',
  'api/admin/justconsignin/videos.js',
  'api/admin/justconsignin/media.js',
  'api/admin/justconsignin/social-links.js',
  'api/admin/justconsignin/social-ai.js',
  'api/admin/justconsignin/social-automation.js',
  'api/admin/justconsignin/metricool-callback.js',
  'api/admin/justconsignin/_lib/metricoolMcp.js',
  'api/admin/justconsignin/_lib/metricoolMcpCompat.js',
  'api/admin/justconsignin/_lib/metricoolMcpClient.js',
].forEach(expectFile);

const apiFiles = walk(join(root, 'api')).filter(file => file.endsWith('.js'));

const rootAdminFiles = apiFiles
  .map(file => relative(root, file).replace(/\\/g, '/'))
  .filter(rel => /^api\/admin\/[^/]+\.js$/.test(rel) && rel !== 'api/admin/sites.js');

for (const rel of rootAdminFiles) {
  failures.push(`${rel}: Mixed root admin endpoint is forbidden. Put it under a website namespace.`);
}

for (const file of apiFiles) {
  const rel = relative(root, file);
  const source = readFileSync(file, 'utf8');

  if (source.includes('SUPABASE_SECRET_KEY')) {
    failures.push(`${rel}: secret/service-role Supabase key is forbidden in this admin backend.`);
  }

  if (/req\.query\?\.site|req\.query\.site|body\.siteKey|req\.body\?\.siteKey/.test(source)) {
    failures.push(`${rel}: site selection must come from the server-owned route, not request data.`);
  }

  if (rel.includes('api/admin/justindematteis/') && /JUSTCONSIGNIN|justconsignin/.test(source)) {
    failures.push(`${rel}: Justin route references JustConsignIn.`);
  }

  if (rel.includes('api/admin/justconsignin/') && /SITE_KEYS\.JUSTIN\b|justindematteis/.test(source)) {
    failures.push(`${rel}: JustConsignIn route references JustinDeMatteis.`);
  }

  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (syntax.status !== 0) {
    failures.push(`${rel}: JavaScript syntax check failed\n${syntax.stderr}`);
  }
}

if (failures.length) {
  console.error('\nArchitecture validation failed:\n');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Architecture validation passed for ${apiFiles.length} API files.`);
console.log('Two-site isolation: OK');
console.log('No service-role secret dependency: OK');
console.log('Server-owned site routing: OK');
console.log('JavaScript syntax: OK');
