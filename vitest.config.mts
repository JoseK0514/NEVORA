import projects from './scripts/vitest-projects.json' with { type: 'json' };

// Load just the selected project so owned SQL and browser admission guards
// never run as a side effect of an ordinary unit invocation.
const selected = process.env.NEVORA_TEST_PROJECT ?? 'unit';
const project = projects.find(item => item.name === selected);
if (!project) throw Error('Unknown NEVORA_TEST_PROJECT; see scripts/vitest-projects.json');
export default (await import(new URL(project.config, import.meta.url).href)).default;
