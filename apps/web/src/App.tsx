import { AppStateProvider } from './state/AppStateContext';
import { AttributionFooter } from './components/AttributionFooter';
import { AuroraMap } from './components/AuroraMap';
import { Layout } from './components/Layout';
import { LocationPicker } from './components/LocationPicker';
import { AlertsPanel } from './components/AlertsPanel';
import { Hero } from './components/Hero';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { PwaReloadPrompt } from './components/PwaReloadPrompt';
import { ShareCard } from './components/ShareCard';
import { Timeline } from './components/Timeline';
import { VerdictGauge } from './components/VerdictGauge';
import { WebMcpBridge } from './components/WebMcpBridge';

export default function App() {
  return (
    <AppStateProvider>
      <WebMcpBridge />
      <Layout footer={<AttributionFooter />}>
        <Hero />
        <LocationPicker />
        <VerdictGauge />
        <AlertsPanel />
        <Timeline />
        <AuroraMap />
        <ShareCard />
      </Layout>
      <PrivacyPolicy />
      <PwaReloadPrompt />
    </AppStateProvider>
  );
}
