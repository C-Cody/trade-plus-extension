export function observeSpaNavigation(onNavigation: () => void): void {
    let lastHref = window.location.href;

    const notifyIfUrlChanged = () => {
        const currentHref = window.location.href;
        if (currentHref === lastHref) {
            return;
        }

        lastHref = currentHref;
        onNavigation();
    };

    const originalPushState = history.pushState;
    history.pushState = function pushStatePatched(...args) {
        originalPushState.apply(this, args);
        window.dispatchEvent(new Event("tradeplus:navigation"));
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function replaceStatePatched(...args) {
        originalReplaceState.apply(this, args);
        window.dispatchEvent(new Event("tradeplus:navigation"));
    };

    window.addEventListener("popstate", onNavigation);
    window.addEventListener("hashchange", onNavigation);
    window.addEventListener("tradeplus:navigation", onNavigation);

    // Fallback for SPAs that update URL from the page world where patched
    // history methods in the isolated extension world are not observed.
    window.setInterval(notifyIfUrlChanged, 250);
}
