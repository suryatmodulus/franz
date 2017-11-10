import { ipcRenderer } from 'electron';
import { action, computed, observable } from 'mobx';

import Store from './lib/Store';
import Request from './lib/Request';
import CachedRequest from './lib/CachedRequest';
import { gaEvent } from '../lib/analytics';
import { DEFAULT_APP_SETTINGS } from '../config';

export default class SettingsStore extends Store {
  @observable allSettingsRequest = new CachedRequest(this.api.local, 'getSettings');
  @observable updateSettingsRequest = new Request(this.api.local, 'updateSettings');
  @observable removeSettingsKeyRequest = new Request(this.api.local, 'removeKey');

  constructor(...args) {
    super(...args);

    // Register action handlers
    this.actions.settings.update.listen(this._update.bind(this));
    this.actions.settings.remove.listen(this._remove.bind(this));

    // this.registerReactions([
    //   this._shareSettingsWithMainProcess.bind(this),
    // ]);
  }

  setup() {
    this.allSettingsRequest.execute();
    this._shareSettingsWithMainProcess();
  }

  @computed get all() {
    return observable(Object.assign(DEFAULT_APP_SETTINGS, this.allSettingsRequest.result));
  }

  @action async _update({ settings }) {
    await this.updateSettingsRequest.execute(settings)._promise;
    this.allSettingsRequest.patch((result) => {
      if (!result) return;
      Object.assign(result, settings);
    });

    this._shareSettingsWithMainProcess();

    gaEvent('Settings', 'update');
  }

  @action async _remove({ key }) {
    await this.removeSettingsKeyRequest.execute(key);
    await this.allSettingsRequest.invalidate({ immediately: true });

    this._shareSettingsWithMainProcess();
  }

  // Reactions
  _shareSettingsWithMainProcess() {
    ipcRenderer.send('settings', this.all);
  }
}
