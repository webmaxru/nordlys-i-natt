import { useAppState } from '../state/AppStateContext';

export function NotifyButton() {
  const { selectedLocation, forecast } = useAppState();

  return (
    <section className="placeholder-card placeholder-card--inline">
      <strong>Notifications</strong>
      <button className="secondary-button" disabled type="button">
        {selectedLocation && forecast.data
          ? 'Notify me when it is GO'
          : 'Pick a location to enable'}
      </button>
    </section>
  );
}
