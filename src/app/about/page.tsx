'use client';

import { useApp } from '../../lib/AppContext';
import { AboutAndFaqView } from '../../components/AboutAndFaqView';

export default function AboutPage() {
  const app = useApp();
  return <AboutAndFaqView language={app.language} />;
}
