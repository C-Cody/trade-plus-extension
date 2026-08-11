## Trade Plus for Roblox Extension

Small browser extension (Chrome + Firefox) that replaces Roblox trade send/counter page with a page with much better navigation.

Includes asset and limited-bundle values pulled from Rolimons, Roblox item and bundle images, search by item name, ordering by Value/RAP/Name, offer totals and differences, and viewing more items on one page. Inventory searches reset when the trade page is refreshed, closed, or opened for another user.

[![Firefox Add-on](https://img.shields.io/badge/Firefox-Addon-FF7139?logo=firefox&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/trade-plus-for-roblox/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/trade-plus-for-roblox/fiiphnjfcfjhhendfgaihogcbedaebea)\
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?logo=github&logoColor=white)](https://github.com/C-Cody/trade-plus-extension)

Created by Cody (tinycatsocks)/hosted by Billabob on Chrome for convenience

### Technical details

Changes the pages on the following URLs:

- `https://www.roblox.com/users/{userId}/trade`
- `https://www.roblox.com/trades/{tradeId}/counter`

To compile, run:

`npm run zip`

and upload the generated zip files in .output/ to Chrome/Firefox

### Version releases

- 0.1.5 - Fixed counter-trade two-step verification challenge detection
- 0.1.4 - Added limited bundle values, images, and trading support; inventory searches now reset between trade pages
- 0.1.3 - Added projected value signals
- 0.1.2 - Independent zooming functionality from the rest of Roblox website
- 0.1.1 - Manifest name change
- 0.1.0 - Initial release

### Firefox mobile support

The extension is supported on Firefox mobile

### Web Screenshots

![screenshot1.png](public%2Fscreenshots%2Fscreenshot1.png)

![screenshot2.png](public%2Fscreenshots%2Fscreenshot2.png)

![screenshot3.png](public%2Fscreenshots%2Fscreenshot3.png)

### Mobile Screenshots

![screenshot4.png](public%2Fscreenshots%2Fscreenshot4.png)

![screenshot5.png](public%2Fscreenshots%2Fscreenshot5.png)
