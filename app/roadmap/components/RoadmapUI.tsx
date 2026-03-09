'use client';

import { motion } from 'framer-motion';
import { RoadmapPhase, RoadmapData, staticRoadmap } from '@/lib/roadmap';

export const Reveal = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(4px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}
    >
        {children}
    </motion.div>
);

export const MeshBg = () => (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
                background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), #3b82f6 0%, transparent 50%)'
            }}
        />
        <div className="absolute inset-0 opacity-[0.03] grain" />
    </div>
);

export const StatCard = ({ label, value, sub, color, delay }: { label: string; value: string | number; sub: string; color: string; delay?: number }) => (
    <Reveal delay={delay}>
        <div className="bg-[#18181b]/40 backdrop-blur-md border border-[#ffffff08] rounded-2xl p-7 transition-all hover:translate-y-[-2px] hover:border-[#3b82f626] group relative overflow-hidden">
            <div className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider mb-3">{label}</div>
            <div className="text-4xl font-extrabold tracking-tighter transition-all" style={{ color }}>{value}</div>
            <div className="text-xs text-[#52525b] mt-2">{sub}</div>
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background: `conic-gradient(from 180deg at 50% 50%, transparent 0%, ${color}1a 25%, transparent 50%, ${color}0d 75%, transparent 100%)`
                }}
            />
        </div>
    </Reveal>
);

export const PhaseCard = ({ phase, delay }: { phase: RoadmapPhase; delay: number }) => (
    <Reveal delay={delay}>
        <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-3.5 h-3.5 rounded-full border-[3px]" style={{ borderColor: phase.color, background: phase.phase === 'Concluido' ? phase.color : 'transparent' }} />
                <div className="font-bold text-lg" style={{ color: phase.color }}>{phase.phase}</div>
                <span className="font-mono text-[10px] bg-[#27272a] text-[#52525b] px-2 py-0.5 rounded-full">{phase.items.length} itens</span>
            </div>
            <div className="pl-8 border-l-2 border-[#27272a] ml-1.5 space-y-2">
                {phase.items.map((item, i) => (
                    <div key={i} className="bg-[#18181b] border border-[#27272a] rounded-lg p-3.5 flex items-start gap-3 transition-all hover:bg-[#27272a] hover:border-[#3b82f61f] group">
                        <div className={`w-5 h-5 rounded-full border-2 border-[#27272a] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${phase.phase === 'Concluido' ? 'bg-[#10b981] border-[#10b981]' : ''}`}>
                            {phase.phase === 'Concluido' && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                        <div>
                            <div className="font-semibold text-[14px] text-[#f4f4f5] tracking-tight">{item.name}</div>
                            <div className="text-[#a1a1aa] text-[12px] mt-0.5 leading-relaxed">{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </Reveal>
);

export default function RoadmapClient({ data }: { data: RoadmapData }) {
    const completedDeliveries = staticRoadmap.find(p => p.phase === 'Concluido')?.items.length || 0;
    const totalDeliveries = staticRoadmap.reduce((sum, p) => sum + p.items.length, 0);
    const overallProgress = Math.round((completedDeliveries / totalDeliveries) * 100);

    return (
        <div className="min-h-screen bg-[#09090b] text-[#a1a1aa] font-sans selection:bg-[#3b82f633] selection:text-[#3b82f6] pb-20">
            <MeshBg />

            <div className="max-w-5xl mx-auto px-6">
                {/* Header */}
                <header className="pt-32 pb-12 text-center relative">
                    <Reveal>
                        <h1 className="text-5xl font-extrabold tracking-tight text-[#f4f4f5] mb-4 bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#2563eb] bg-clip-text text-transparent">
                            ZmobCRM
                        </h1>
                        <p className="text-xl text-[#71717a] font-medium tracking-tight">CRM Inteligente para o Mercado Imobiliario</p>

                        <div className="flex justify-center gap-10 mt-10">
                            <div className="flex items-center gap-2 text-[13px] text-[#52525b]">
                                Versão <span className="font-mono text-[#f4f4f5] font-semibold">{data.version}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[13px] text-[#52525b]">
                                Módulos <span className="font-mono text-[#f4f4f5] font-semibold">{data.featureModules.length}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[13px] text-[#52525b]">
                                Atualizado <span className="font-mono text-[#f4f4f5] font-semibold">{data.generatedAt.split(',')[0]}</span>
                            </div>
                        </div>
                    </Reveal>
                    <div className="absolute bottom-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#2563eb4d] to-transparent" />
                </header>

                {/* Stats Section */}
                <section className="py-12">
                    <Reveal>
                        <div className="font-mono text-[11px] text-[#71717a] uppercase tracking-[0.15em] mb-2">
                            <span className="text-[#60a5fa] mr-3">01</span>Status Atual
                        </div>
                        <h2 className="text-2xl font-bold text-[#f4f4f5] tracking-tight flex items-center gap-3 mb-8">
                            <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_12px_#3b82f633]" />
                            Onde Estamos Agora
                        </h2>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                        <StatCard label="Funcionalidades Ativas" value={data.featureModules.length} sub="modulos em producao" color="#10b981" delay={0.1} />
                        <StatCard label="Entregas Realizadas" value={completedDeliveries} sub={`de ${totalDeliveries} no roadmap`} color="#60a5fa" delay={0.2} />
                        <StatCard label="Evolucoes no Banco" value={data.migrationCount} sub="melhorias na base" color="#f59e0b" delay={0.3} />
                        <StatCard label="Velocidade (30 dias)" value={data.deliveryVelocity} sub="commits no ultimo mes" color="#60a5fa" delay={0.4} />
                    </div>

                    <Reveal delay={0.5}>
                        <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6">
                            <div className="flex justify-between items-end mb-4">
                                <span className="font-semibold text-[#f4f4f5] text-sm">Progresso do Roadmap</span>
                                <span className="font-mono text-[#60a5fa] font-bold">{overallProgress}%</span>
                            </div>
                            <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${overallProgress}%` }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-[#2563eb] to-[#60a5fa] rounded-full shadow-[0_0_12px_#3b82f64d]"
                                />
                            </div>
                        </div>
                    </Reveal>
                </section>

                {/* Roadmap Evolução */}
                <section className="py-12">
                    <Reveal>
                        <div className="font-mono text-[11px] text-[#71717a] uppercase tracking-[0.15em] mb-2">
                            <span className="text-[#60a5fa] mr-3">02</span>Evolução
                        </div>
                        <h2 className="text-2xl font-bold text-[#f4f4f5] tracking-tight flex items-center gap-3 mb-10">
                            <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_12px_#3b82f633]" />
                            Rodmap — O Que Vem Pela Frente
                        </h2>
                    </Reveal>

                    <div className="space-y-4">
                        {staticRoadmap.map((phase, i) => (
                            <PhaseCard key={phase.phase} phase={phase} delay={0.1 * (i + 1)} />
                        ))}
                    </div>
                </section>

                {/* Footer */}
                <footer className="mt-20 pt-10 text-center border-t border-[#1e1e21] text-[13px] text-[#52525b]">
                    <Reveal>
                        ZmobCRM v{data.version} &mdash; Gerado dinamicamente &mdash; Open for Stakeholders
                    </Reveal>
                </footer>
            </div>

            <script dangerouslySetInnerHTML={{
                __html: `
        document.addEventListener('mousemove', (e) => {
          document.documentElement.style.setProperty('--mx', e.clientX + 'px');
          document.documentElement.style.setProperty('--my', e.clientY + 'px');
        });
      `}} />
        </div>
    );
}
