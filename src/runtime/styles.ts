import PAGE_STYLE_CSS from "./pageStyle.css?raw";
import SHADOW_CSS_INVENTORY from "./styleParts/inventory.css?raw";
import SHADOW_CSS_LAYOUT from "./styleParts/layout.css?raw";
import SHADOW_CSS_RESPONSIVE from "./styleParts/responsive.css?raw";
import SHADOW_CSS_STAGE_CORE from "./styleParts/stageCore.css?raw";

export const SHADOW_CSS = `${SHADOW_CSS_LAYOUT}${SHADOW_CSS_INVENTORY}${SHADOW_CSS_STAGE_CORE}${SHADOW_CSS_RESPONSIVE}`;
export { PAGE_STYLE_CSS };
