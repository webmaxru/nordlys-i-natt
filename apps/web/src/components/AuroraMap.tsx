import { useAppState } from '../state/AppStateContext';

export function AuroraMap() {
  const { selectedLocation, forecast } = useAppState();

  return (
    <section className="placeholder-card">
      <strong>Aurora map</strong>
      <span>
        {selectedLocation
          ? forecast.isLoading
            ? 'Loading forecast layer'
            : selectedLocation.name
          : 'Map appears after location selection'}
      </span>
    </section>
  );
}
