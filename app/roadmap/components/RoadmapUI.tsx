'use client';

import { motion } from 'framer-motion';
import { RoadmapPhase, RoadmapData, staticRoadmap, staticBrandVision } from '@/lib/roadmap';
import { ROADMAP_SECTION_COLORS } from '@/lib/design-tokens';

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
            className="absolute inset-0 opacity-[0.05] md:opacity-[0.08]"
            style={{
                background: `radial-gradient(circle at var(--mx, 50%) var(--my, 50%), ${ROADMAP_SECTION_COLORS.primary.hex} 0%, transparent 60%)`
            }}
        />
        <div className="absolute inset-0 opacity-[0.02] md:opacity-[0.03] grain" />
    </div>
);

export const SectionTitle = ({ number, title, color = ROADMAP_SECTION_COLORS.primary.hex, glow = ROADMAP_SECTION_COLORS.primary.glow }: { number: string; title: string; color?: string; glow?: string }) => (
    <Reveal>
        <div className="font-mono text-2xs md:text-1xs text-zinc-500 uppercase tracking-[0.15em] mb-2">
            <span className="text-blue-400 mr-3">{number}</span>{title.split('—')[0].trim()}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-3 mb-6 md:mb-10">
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full`} style={{ background: color, boxShadow: `0 0 12px ${glow}` }} />
            {title}
        </h2>
    </Reveal>
);

export const StatCard = ({ label, value, sub, color, delay }: { label: string; value: string | number; sub: string; color: string; delay?: number }) => (
    <Reveal delay={delay}>
        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/[0.03] rounded-2xl p-5 md:p-7 transition-all hover:translate-y-[-2px] hover:border-blue-500/15 group relative overflow-hidden h-full">
            <div className="font-mono text-3xs md:text-2xs text-zinc-500 uppercase tracking-wider mb-2 md:mb-3">{label}</div>
            <div className="text-3xl md:text-4xl font-extrabold tracking-tighter transition-all" style={{ color }}>{value}</div>
            <div className="text-1xs md:text-xs text-zinc-600 mt-1.5 md:mt-2">{sub}</div>
            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:block"
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
                <span className="font-mono text-2xs bg-zinc-800 text-zinc-600 px-2 py-0.5 rounded-full">{phase.items.length} itens</span>
            </div>
            <div className="pl-6 md:pl-8 border-l-2 border-zinc-800 ml-1.5 space-y-2">
                {phase.items.map((item, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 md:p-3.5 flex items-start gap-2.5 md:gap-3 transition-all hover:bg-zinc-800 hover:border-blue-500/10 group">
                        <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-zinc-800 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${phase.phase === 'Concluido' ? 'bg-emerald-500 border-emerald-500' : ''}`}>
                            {phase.phase === 'Concluido' && <span className="text-white text-[8px] md:text-2xs font-bold">✓</span>}
                        </div>
                        <div>
                            <div className="font-semibold text-[13px] md:text-[14px] text-zinc-100 tracking-tight">{item.name}</div>
                            <div className="text-zinc-400 text-1xs md:text-xs mt-0.5 leading-relaxed">{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </Reveal>
);

export const MilestoneTrack = ({ milestones }: { milestones: RoadmapData['milestones'] }) => (
    <Reveal>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-10 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            <h3 className="text-sm font-semibold text-zinc-100 mb-8 tracking-tight">Jornada do Produto</h3>
            <div className="flex items-center gap-0 overflow-x-auto pb-4 scrollbar-hide">
                {milestones.map((m, i) => (
                    <div key={i} className="flex items-center flex-shrink-0">
                        <div className="flex flex-col items-center min-w-[130px] relative">
                            <div className={`w-7 h-7 rounded-full border-[3px] z-10 mb-3 transition-all ${m.status === 'done' ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_16px_theme(colors.emerald.500/0.25)]' :
                                m.status === 'current' ? 'bg-blue-500 border-blue-500 shadow-[0_0_20px_theme(colors.blue.500/0.3)] animate-pulse' :
                                    'bg-zinc-950 border-zinc-600'
                                }`} />
                            <div className={`text-1xs text-center leading-tight ${m.status === 'current' ? 'text-blue-400 font-bold' : 'text-zinc-500'}`}>
                                {m.label}<br />
                                <span className={m.status === 'done' ? 'text-emerald-500' : ''}>{m.sub}</span>
                            </div>
                        </div>
                        {i < milestones.length - 1 && (
                            <div className={`h-[3px] w-12 -mt-10 rounded-full ${m.status === 'done' ? 'bg-gradient-to-r from-emerald-500 to-emerald-500/50' : 'bg-zinc-800'}`} />
                        )}
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
        <div className="min-h-screen bg-zinc-950 text-zinc-400 font-sans selection:bg-blue-500/20 selection:text-blue-500 pb-20">
            <MeshBg />

            <div className="max-w-5xl mx-auto px-4 md:px-6">
                {/* Header */}
                <header className="pt-20 md:pt-32 pb-8 md:pb-12 text-center relative">
                    <Reveal>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-100 mb-3 md:mb-4 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                            ZmobCRM
                        </h1>
                        <p className="text-lg md:text-xl text-zinc-500 font-medium tracking-tight px-4">{staticBrandVision.tagline}</p>

                        <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-8 md:mt-10">
                            <div className="flex items-center gap-2 text-xs md:text-[13px] text-zinc-600">
                                Versão <span className="font-mono text-zinc-100 font-semibold">{data.version}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs md:text-[13px] text-zinc-600">
                                Módulos <span className="font-mono text-zinc-100 font-semibold">{data.featureModules.length}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs md:text-[13px] text-zinc-600">
                                Atualizado <span className="font-mono text-zinc-100 font-semibold">{data.generatedAt.split(',')[0]}</span>
                            </div>
                        </div>
                    </Reveal>
                    <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-blue-600/30 to-transparent" />
                </header>

                {/* Section 01: DNA do Produto */}
                <section className="py-8 md:py-12">
                    <SectionTitle number="01" title="Visao & Posicionamento" />
                    <div className="text-center bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-10 mb-6 md:mb-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.06) 0%, transparent 60%) pointer-events-none" />
                        <h3 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-tighter mb-4 relative z-10 group-hover:scale-[1.02] transition-transform duration-500">
                            {data.brandVision.tagline}
                        </h3>
                        <p className="text-zinc-400 text-sm md:text-base max-w-2xl mx-auto relative z-10 leading-relaxed font-medium">
                            {data.brandVision.positioning}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {data.brandVision.archetypes.map((a, i) => (
                            <Reveal key={i} delay={0.1 * i}>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-transparent opacity-50" />
                                    <div className="text-blue-400 font-bold text-sm mb-2 tracking-tight">{a.name}</div>
                                    <div className="text-[13px] leading-relaxed text-zinc-500">{a.desc}</div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                    <div className="text-center mt-8 text-1xs text-zinc-600 uppercase tracking-widest font-bold opacity-60">
                        {data.brandVision.aesthetic}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4" />

                {/* Section 02: Módulo Prospecção */}
                <section className="py-12">
                    <SectionTitle number="02" title="Prospeccao Inteligente v2" color={ROADMAP_SECTION_COLORS.emerald.hex} glow={ROADMAP_SECTION_COLORS.emerald.glow} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <StatCard label="Power Dialer" value="⚡" sub="Fila ultraveloz automatica" color={ROADMAP_SECTION_COLORS.sky.hex} delay={0.1} />
                        <StatCard label="Scripts" value="📝" sub="Roteiros guiados por IA" color={ROADMAP_SECTION_COLORS.emerald.hex} delay={0.2} />
                        <StatCard label="Metricas" value="📈" sub="KPIs em tempo real" color={ROADMAP_SECTION_COLORS.amber.hex} delay={0.3} />
                        <StatCard label="Retry" value="🔄" sub="Recontato inteligente" color={ROADMAP_SECTION_COLORS.sky.hex} delay={0.4} />
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4" />

                {/* Section 03: Status Atual */}
                <section className="py-12">
                    <SectionTitle number="03" title="Onde Estamos Agora" />

                    <MilestoneTrack milestones={data.milestones} />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                        <StatCard label="Funcionalidades Ativas" value={data.featureModules.length} sub="modulos em producao" color={ROADMAP_SECTION_COLORS.emerald.hex} delay={0.1} />
                        <StatCard label="Entregas Realizadas" value={completedDeliveries} sub={`de ${totalDeliveries} no roadmap`} color={ROADMAP_SECTION_COLORS.sky.hex} delay={0.2} />
                        <StatCard label="Evolucoes no Banco" value={data.migrationCount} sub="melhorias na base" color={ROADMAP_SECTION_COLORS.amber.hex} delay={0.3} />
                        <StatCard label="Velocidade (30 dias)" value={data.deliveryVelocity} sub="commits no ultimo mes" color={ROADMAP_SECTION_COLORS.sky.hex} delay={0.4} />
                    </div>

                    <Reveal delay={0.5}>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                            <div className="flex justify-between items-end mb-4">
                                <span className="font-semibold text-zinc-100 text-sm">Progresso do Roadmap</span>
                                <span className="font-mono text-blue-400 font-bold">{overallProgress}%</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    whileInView={{ width: `${overallProgress}%` }}
                                    transition={{ duration: 1.5, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_12px_theme(colors.blue.500/0.3)]"
                                />
                            </div>
                        </div>
                    </Reveal>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4" />

                {/* Section 04: Funcionalidades (O que já funciona) */}
                <section className="py-12">
                    <SectionTitle number="04" title="O Que Já Funciona" color={ROADMAP_SECTION_COLORS.emerald.hex} />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.featureModules.map((mod, i) => (
                            <Reveal key={mod} delay={0.05 * i}>
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:bg-zinc-800 transition-all hover:border-emerald-500/20 group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-zinc-100 text-sm tracking-tight capitalize">{mod}</div>
                                        <div className="text-3xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Ativo</div>
                                    </div>
                                    <div className="text-xs text-zinc-500 leading-relaxed">Módulo centralizado de {mod} integrado ao ecossistema Zmob.</div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4" />

                {/* Section 05: Evolução (Roadmap) */}
                <section className="py-12">
                    <SectionTitle number="05" title="Roadmap — O Que Vem Pela Frente" />
                    <div className="space-y-4">
                        {staticRoadmap.map((phase, i) => (
                            <PhaseCard key={phase.phase} phase={phase} delay={0.1 * (i + 1)} />
                        ))}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4" />

                {/* Section 06: Histórico (Atividade Recente) */}
                <section className="py-8 md:py-12">
                    <SectionTitle number="06" title="Atividade Recente" />
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 divide-y divide-zinc-800">
                        {data.recentCommits.map((c, i) => (
                            <Reveal key={c.hash} delay={0.05 * i}>
                                <div className="py-4 flex gap-4 md:gap-6 items-start hover:pl-2 transition-all group">
                                    <div className="font-mono text-2xs md:text-1xs text-zinc-600 flex-shrink-0 pt-0.5">
                                        {new Date(c.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className="text-xs md:text-[13px] text-zinc-400 leading-relaxed group-hover:text-zinc-100 transition-colors">
                                        {c.message}
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4" />

                {/* Section 07: Visão (O Que Esperar) */}
                <section className="py-12 pb-32">
                    <SectionTitle number="07" title="O Que Esperar" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <div className="font-mono text-2xs text-zinc-500 uppercase tracking-widest pl-1 border-l-2 border-amber-500 mb-4">Curto Prazo (1-2 sem)</div>
                            {[
                                'IA recomenda quem ligar (Lead Score + Heatmap)',
                                'Assistente IA conhece suas metas e métricas',
                                'Sugestão e criação de Scripts de Venda via IA',
                                'Módulo de Imóveis (Beta): property_ref e buscas'
                            ].map((item, i) => (
                                <Reveal key={i} delay={0.1 * i}>
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                                        {item}
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                        <div className="space-y-4">
                            <div className="font-mono text-2xs text-zinc-500 uppercase tracking-widest pl-1 border-l-2 border-blue-500 mb-4">Médio Prazo (1-2 meses)</div>
                            {[
                                'Módulo de Imóveis + Matching',
                                'Permissões por Cargo/Depto',
                                'Listas de Segmentação',
                                'IA de Perfil de Interesse',
                                'Dashboard Customizável'
                            ].map((item, i) => (
                                <Reveal key={i} delay={0.1 * i}>
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                                        {item}
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                        <div className="space-y-4">
                            <div className="font-mono text-2xs text-zinc-500 uppercase tracking-widest pl-1 border-l-2 border-violet-500 mb-4">Longo Prazo (3-6 meses)</div>
                            {[
                                'Integrações com Portais',
                                'App Mobile Nativo (PWA)',
                                'Wizard de Onboarding',
                                'Migração Assistida',
                                'Calculadora de Comissão'
                            ].map((item, i) => (
                                <Reveal key={i} delay={0.1 * i}>
                                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                                        <div className="w-1 h-1 rounded-full bg-violet-500" />
                                        {item}
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="pt-10 text-center border-t border-zinc-800 text-[13px] text-zinc-600">
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
