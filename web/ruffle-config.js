(function (window) {
  'use strict';

  function darkOrbitRuffleConfig(pageLocation) {
    var secure = pageLocation.protocol === 'https:';
    var socketBase = secure
      ? 'wss://' + pageLocation.host + '/socket'
      : 'ws://' + pageLocation.hostname + ':8081';

    return {
      publicPath: '/browser/ruffle/',
      autoplay: 'on',
      unmuteOverlay: 'visible',
      allowNetworking: 'all',
      allowScriptAccess: true,
      playerRuntime: 'flashPlayer',
      socketProxy: [
        { host: pageLocation.hostname, port: 8080, proxyUrl: socketBase + '/game' },
        { host: pageLocation.hostname, port: 9338, proxyUrl: socketBase + '/chat' }
      ]
    };
  }

  window.darkOrbitRuffleConfig = darkOrbitRuffleConfig;
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = Object.assign(
    {},
    window.RufflePlayer.config || {},
    darkOrbitRuffleConfig(window.location)
  );
}(window));
