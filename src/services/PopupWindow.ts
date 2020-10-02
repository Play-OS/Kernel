// All credits go to BlockStack https://github.com/blockstack/ux/blob/master/packages/connect/src/popup.ts
// BlockStack licensed the code under MIT

interface PopupOptions {
    url?: string;
    title?: string;
    w?: number;
    h?: number;
    skipPopupFallback?: boolean;
}

const defaultWidth = 442;
const defaultHeight = 532;
const defaultTitle = "Continue with Secret Key";

// https://developer.mozilla.org/en-US/docs/Web/API/Window/open
export const popupCenter = ({
    url,
    title = defaultTitle,
    w = defaultWidth,
    h = defaultHeight,
    skipPopupFallback,
}: PopupOptions) => {
    const win = window;
    // Safari reports an incorrect browser height
    const isSafari = (win as any).safari !== undefined;

    const browserViewport = {
        width: win.innerWidth,
        height: win.innerHeight,
    };
    const browserToolbarHeight = win.outerHeight - win.innerHeight;
    const browserSidepanelWidth = win.outerWidth - win.innerWidth;

    // Such as fixed operating system UI
    const removeUnusableSpaceX = (coord: number) =>
        coord - (win.screen.width - win.screen.availWidth);
    const removeUnusableSpaceY = (coord: number) =>
        coord - (win.screen.height - win.screen.availHeight);

    const browserPosition = {
        x: removeUnusableSpaceX(win.screenX),
        y: removeUnusableSpaceY(win.screenY),
    };

    const left =
        browserPosition.x +
        browserSidepanelWidth +
        (browserViewport.width - w) / 2;
    const top =
        browserPosition.y +
        browserToolbarHeight +
        (browserViewport.height - h) / 2 +
        (isSafari ? 48 : 0);

    const options = {
        scrollbars: "no",
        width: w,
        height: h,
        top,
        left,
    };
    const optionsString = Object.keys(options).map((key) => {
        return `${key}=${options[key as keyof typeof options]}`;
    });
    const newWindow = window.open(url, title, optionsString.join(","));

    if (newWindow) {
        newWindow.focus();
        return newWindow;
    }

    return window.open(url);
};

export function listenForWindowClose(popupWindow: Window, onClose: () => void) {
    const timer = setInterval(() => {
        if (popupWindow.closed) {
            clearInterval(timer);
            onClose();
        }
    }, 200);
}
