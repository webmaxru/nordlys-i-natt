import { AppStateProvider } from './state/AppStateContext';
import { AttributionFooter } from './components/AttributionFooter';
import { AuroraMap } from './components/AuroraMap';
import { ConsentBanner } from './components/ConsentBanner';
import { Layout } from './components/Layout';
import { LocationPicker } from './components/LocationPicker';
import { NotifyButton } from './components/NotifyButton';
import { ShareCard } from './components/ShareCard';
import { Timeline } from './components/Timeline';
import { VerdictGauge } from './components/VerdictGauge';

export default function App() {
  return (
    <AppStateProvider>
      <Layout footer={<AttributionFooter />}>
        <LocationPicker />
        <VerdictGauge />
        <Timeline />
        <AuroraMap />
        <ShareCard />
        <NotifyButton />
      </Layout>
      <ConsentBanner />
    </AppStateProvider>
  );
}
