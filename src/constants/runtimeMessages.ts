export const SYNC_EXTENSION_ROUTE_ZOOM_MESSAGE =
    "trade-plus:sync-extension-route-zoom";

export type SyncExtensionRouteZoomMessage = {
    type: typeof SYNC_EXTENSION_ROUTE_ZOOM_MESSAGE;
    extensionRouteActive: boolean;
};
