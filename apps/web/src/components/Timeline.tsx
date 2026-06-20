import { useAppState } from '../state/AppStateContext';

export function Timeline() {
  const { selectedLocation, forecast } = useAppState();

  return (
    <section className="placeholder-card">
      <strong>Timeline</strong>
      <span>
        {selectedLocation
          ? `${forecast.data?.verdict.hours.length ?? 0} hours ready`
          : 'Choose a location first'}
      </span>
    </section>
  );
}
