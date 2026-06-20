import { useAppState } from '../state/AppStateContext';

export function ShareCard() {
  const { selectedLocation, forecast } = useAppState();

  return (
    <section className="placeholder-card">
      <strong>Share card</strong>
      <span>
        {selectedLocation && forecast.data
          ? `Share ${forecast.data.verdict.verdict} for ${selectedLocation.name}`
          : 'Share image generator placeholder'}
      </span>
    </section>
  );
}
