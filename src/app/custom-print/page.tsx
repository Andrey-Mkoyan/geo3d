'use client';

import { useApp } from '../../lib/AppContext';
import { CustomPrintCalculator } from '../../components/CustomPrintCalculator';

export default function CustomPrintPage() {
  const app = useApp();
  return <CustomPrintCalculator language={app.language} stock={app.stock} onAddToCart={app.addToCart} />;
}
