import { useSalesStore } from '../features/sales/store/sales.store';
import { useSettingsStore } from '../features/settings/store/settings.store';
import { usePOSStore } from './pos-store';

export function resetAccountStores() {
  useSalesStore.setState(useSalesStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  usePOSStore.setState(usePOSStore.getInitialState(), true);
  // Remove persisted account data; a later action will persist fresh state.
  useSalesStore.persist?.clearStorage();
  useSettingsStore.persist?.clearStorage();
  usePOSStore.persist?.clearStorage();
}
