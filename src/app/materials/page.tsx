'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '../../lib/AppContext';
import { MaterialsGuideView } from '../../components/MaterialsGuideView';

export default function MaterialsPage() {
  const app = useApp();
  const router = useRouter();
  return (
    <MaterialsGuideView
      language={app.language}
      onSelectMaterialForUpload={() => router.push('/custom-print')}
    />
  );
}
