import { getRoadmapData } from '@/lib/roadmap-server';
import RoadmapClient from './components/RoadmapUI';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ZmobCRM — Status do Projeto & Roadmap',
  description: 'Acompanhe o progresso do ZmobCRM em tempo real.',
};

export default async function RoadmapPage() {
  // Fetch data on the server
  const data = getRoadmapData();

  return <RoadmapClient data={data} />;
}
