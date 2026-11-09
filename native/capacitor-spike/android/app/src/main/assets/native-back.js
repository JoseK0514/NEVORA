(function () {
  // The native host invokes this only for its local-runtime build. The packaged
  // fixture owns its @capacitor/app listener and never installs this callback.
  function closestAcrossRoots(element, selector) {
    while (element) {
      var found = element.closest ? element.closest(selector) : null;
      if (found) return found;
      var root = element.getRootNode ? element.getRootNode() : null;
      element = root && root.host;
    }
    return null;
  }
  var active = document.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  var dialogs = document.querySelectorAll('dialog[open]');
  // DOM order is not modal-stack order: CommandFinder can open over a sheet
  // even though the finder's dialog occurs earlier in the document.
  var dialog = closestAcrossRoots(active, 'dialog[open]') || dialogs[dialogs.length - 1];
  var popovers = [];
  var popover = null;
  try {
    popovers = document.querySelectorAll('[popover]:popover-open');
    popover = closestAcrossRoots(active, '[popover]:popover-open');
  } catch (_) {}
  // A menu in the focused modal is above that modal. A background page's menu
  // must not consume Back while a different modal owns focus.
  if (!popover) {
    for (var i = popovers.length - 1; i >= 0; i--) {
      if (!dialog || closestAcrossRoots(popovers[i], 'dialog[open]') === dialog) {
        popover = popovers[i];
        break;
      }
    }
  }
  if (popover) {
    popover.hidePopover();
    return { dismissed: true, root: false };
  }
  if (dialog) {
    if (typeof dialog.requestClose === 'function') {
      dialog.requestClose();
    } else if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) {
      dialog.close();
    }
    // A prevented cancel belongs to the app's animation / router. Consume Back.
    return { dismissed: true, root: false };
  }
  return { dismissed: false, root: ['/app', '/app/', '/app/home', '/ui-preview/home'].includes(location.pathname) };
})();
