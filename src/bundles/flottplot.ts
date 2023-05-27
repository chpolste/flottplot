import { VERSION } from "../version";
import { Flottplot } from "../manager";
import { ElementMixin } from "../element";
import { Value } from "../values";
import { FlottplotError } from "../errors";
import * as dom from "../dom";

import { FPAnimation } from "../elements/animation";
import { FPBind } from "../elements/bind";
import { FPButton } from "../elements/button";
import { FPCalendar } from "../elements/calendar";
import { FPControls } from "../elements/controls";
import { FPCursors } from "../elements/cursors";
import { FPOverlay } from "../elements/overlay";
import { FPPlot } from "../elements/plot";
import { FPStack } from "../elements/stack";
import { FPState } from "../elements/state";
import { FPText } from "../elements/text";
import { FPVideo } from "../elements/video";
import { rangeFrom, selectFrom } from "../elements/items"

Flottplot.registerTag("fp-animation", FPAnimation.from, false);
Flottplot.registerTag("fp-bind", FPBind.from, false);
Flottplot.registerTag("fp-button", FPButton.from, false);
Flottplot.registerTag("fp-calendar", FPCalendar.from, false);
Flottplot.registerTag("fp-controls", FPControls.from, false);
Flottplot.registerTag("fp-cursors", FPCursors.from, false);
Flottplot.registerTag("fp-overlay", FPOverlay.from, false);
Flottplot.registerTag("fp-plot", FPPlot.from, false);
Flottplot.registerTag("fp-range", rangeFrom, false);
Flottplot.registerTag("fp-select", selectFrom, false);
Flottplot.registerTag("fp-stack", FPStack.from, true);
Flottplot.registerTag("fp-state", FPState.from, false);
Flottplot.registerTag("fp-text", FPText.from, true);
Flottplot.registerTag("fp-video", FPVideo.from, false);

// ...
export { VERSION, Flottplot, ElementMixin, Value, FlottplotError, dom };

// TODO return {
// TODO     OptionsItems: OptionsItems,
// TODO     RangeItems: RangeItems,
// TODO };

