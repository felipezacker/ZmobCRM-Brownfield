import 'server-only';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { RoadmapData, Story, staticBusinessMetrics, staticBrandVision, staticMilestones } from './roadmap';

const ROOT = process.cwd();

export function getRoadmapData(): RoadmapData {
    const getVersion = () => {
        try {
            const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
            return pkg.version;
        } catch { return '0.0.0'; }
    };

    const getLastCommitDate = () => {
        try {
            return execSync('git log -1 --format=%ci', { cwd: ROOT, encoding: 'utf-8' }).trim();
        } catch { return new Date().toISOString(); }
    };

    const getRecentCommits = (n = 8) => {
        try {
            const raw = execSync(`git log -20 --format="%H|%s|%ci"`, { cwd: ROOT, encoding: 'utf-8' });
            return raw.trim().split('\n')
                .map(line => {
                    const [hash, message, date] = line.split('|');
                    return { hash: hash?.slice(0, 7), message, date };
                })
                .filter(c => !c.message?.startsWith('Merge '))
                .slice(0, n);
        } catch { return []; }
    };

    const getDeliveryVelocity = () => {
        try {
            const raw = execSync('git log --since="30 days ago" --no-merges --oneline', { cwd: ROOT, encoding: 'utf-8' });
            return raw.trim().split('\n').filter(Boolean).length;
        } catch { return 0; }
    };

    const getMigrationCount = () => {
        try {
            const dir = join(ROOT, 'supabase', 'migrations');
            return readdirSync(dir).filter(f => f.endsWith('.sql')).length;
        } catch { return 0; }
    };

    const getFeatureModules = () => {
        try {
            const dir = join(ROOT, 'features');
            return readdirSync(dir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
        } catch { return []; }
    };

    const getStories = (): Story[] => {
        const storiesDir = join(ROOT, 'docs', 'stories', 'active');
        if (!existsSync(storiesDir)) return [];

        const files = readdirSync(storiesDir).filter(f => f.endsWith('.md'));
        return files.map(f => {
            const content = readFileSync(join(storiesDir, f), 'utf-8');
            const titleMatch = content.match(/^#\s+(.+)/m);
            const statusMatch = content.match(/Status:\s*(\w+)/i) || content.match(/\*\*Status:\*\*\s*(\w+)/i);
            const idMatch = f.match(/(QV-[\d.]+|CP-[\d.]+|TDR-[\d.]+)/i);

            const total = (content.match(/- \[[ x]\]/g) || []).length;
            const done = (content.match(/- \[x\]/g) || []).length;

            return {
                id: idMatch ? idMatch[1] : f.replace('.story.md', ''),
                title: titleMatch ? titleMatch[1].replace(/^Story\s+[\d.]+:\s*/i, '') : f,
                status: statusMatch ? statusMatch[1] : 'Unknown',
                progress: total > 0 ? Math.round((done / total) * 100) : 0,
                file: f
            };
        });
    };

    return {
        version: getVersion(),
        generatedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        lastCommit: getLastCommitDate(),
        migrationCount: getMigrationCount(),
        featureModules: getFeatureModules(),
        stories: getStories(),
        recentCommits: getRecentCommits(),
        deliveryVelocity: getDeliveryVelocity(),
        businessMetrics: staticBusinessMetrics,
        brandVision: staticBrandVision,
        milestones: staticMilestones,
    };
}
