### Trade Plus for Roblox Extension

Small browser extension (Chrome + Firefox) that replaces Roblox trade send/counter page with a page with much better navigation.

Includes values display pulled from Rolimons, search history, ordering items by Value/RAP/Name, offer totals/difference, and viewing more items in one page.

Firefox extension page: https://addons.mozilla.org/en-US/firefox/addon/trade-plus-for-roblox/
Chome extension page: (pending)
Github: https://github.com/C-Cody/trade-plus-extension
Discord server: https://discord.gg/6Ju3qYdnAp

Created by Cody (tinycatsocks)/hosted by Billabob on Chrome for convenience

#### Technical details

Changes the pages on the following URLs:
- `https://www.roblox.com/users/{userId}/trade`
- `https://www.roblox.com/trades/{tradeId}/counter`

To compile, run:

`
npm run zip 
`

and upload the generated zip files in .output/ to Chrome/Firefox
