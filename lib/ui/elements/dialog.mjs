/**
### mapp.ui.elements.dialog()

Exports the dialog method as mapp.ui.elements.dialog()

@module /ui/elements/dialog
*/

/**
@function dialog

@description
The dialog method decorates a dialog object with methods to close or shift the element within the confines of the containing [target] window element.

@param {Object} dialog
The dialog configuration object.
@param {HTMLElement} dialog.target
The target element where the dialog will be appended.
@param {string} [dialog.css_style]
The CSS styles to apply to the dialog dialog.
@param {string} [dialog.data_id='dialog']
The data-id attribute value for the dialog.
@param {string} [dialog.header]
The HTML content for the dialog header.
@param {string} [dialog.content]
The HTML content for the dialog body.
@param {boolean} [dialog.modal]
A flag to determine if its a Modal or Dialog.
@param {Function} [dialog.close]
A function to be called when the dialog is closed. Boolean to indicate whether there should be a close method.
@param {number} [dialog.top]
The top position of the dialog.
@param {number} [dialog.left]
The left position of the dialog.
@param {number} [dialog.right]
The right position of the dialog (used to calculate left position).
@param {boolean} [dialog.contained]
A flag indicating whether to keep the dialog within the target element's boundaries.
@param {boolean} [dialog.containedCentre]
A flag indicating whether to keep the dialog centered within the target element's boundaries.
*/

export default function dialog(dialog) {

  // Ensure the target is an HTMLElement before proceeding
  if (!(dialog.target instanceof HTMLElement)) return;

  const closeBtn = (dialog.close || dialog.modal)
    && mapp.utils.html.node`
    <button
      data-id=close
      class="mask-icon close"
      onclick=${closeDialog}>`

  dialog.data_id ??= 'dialog'

  let classList = `${dialog.modal ? 'modal' : 'dialog'} ${dialog.class || ''}`

  let dialogNode = mapp.utils.html.node`
    <dialog 
      style=${dialog.css_style}
      data-id=${dialog.data_id}
      class="${classList}">
      ${closeBtn}
      ${dialog.header}
      ${dialog.content}`

  // Construct the dialog element and append it to the target element
  dialog.node = dialog.modal ? document.body.appendChild(dialogNode) : dialog.target.appendChild(dialogNode);

  dialog.modal
    ? dialog.node.showModal()
    : dialog.node.show();

  if (!dialog.modal) {

    if (dialog.right) {

      // Calc left from right and offSetWidth
      dialog.left = dialog.target.offsetWidth - dialog.node.offsetWidth - parseInt(dialog.right)
    }

    dialog.node.style.top = `${dialog.top || 0}px`
    dialog.node.style.left = `${dialog.left || 0}px`

    dialog.node.addEventListener('mousedown', handleStartEvent);
    dialog.node.addEventListener('touchstart', handleStartEvent);

    // Create a ResizeObserver to observe changes in the map's dimensions
    const resizeObserver = new ResizeObserver(adjustDialogPosition);
    resizeObserver.observe(dialog.target);
  }

  // Function to handle the dialog closure
  function closeDialog() {
    if (dialog.close instanceof Function) dialog.close()
    dialog.node.close();
    resizeObserver.disconnect();
  }

  // Function to handle the start of a drag event, setting up the necessary event listeners for moving and ending the drag
  function handleStartEvent(e) {

    // Don't trigger shift on right click
    if (e.which === 3) return;

    dialog.node.style.cursor = 'grabbing';

    const eventsMap = {
      mousedown: {
        move: 'mousemove',
        end: 'mouseup'
      },
      touchstart: {
        move: 'touchmove',
        end: 'touchend'
      },
    };

    const { move: moveEvent, end: endEvent } = eventsMap[e.type];

    dialog.target.addEventListener(moveEvent, shiftEvent);
    window.addEventListener(endEvent, stopShift);
  }



  function adjustDialogPosition() {

    const { offsetWidth: mapWidth, offsetHeight: mapHeight } = dialog.target;
    const { offsetWidth: dialogWidth, offsetHeight: dialogHeight } = dialog.node;

    // Calculate the maximum allowed positions for the dialog
    const maxLeft = mapWidth - dialogWidth;
    const maxTop = mapHeight - dialogHeight;

    // Adjust the dialog's position if it exceeds the map boundaries
    dialog.node.style.left = `${Math.min(Math.max(dialog.node.offsetLeft, 0), maxLeft)}px`;
    dialog.node.style.top = `${Math.min(Math.max(dialog.node.offsetTop, 0), maxTop)}px`;
  }

  // Function to end the drag event, resetting cursor style and removing the move and end event listeners
  function stopShift() {
    delete dialog.x
    delete dialog.y

    dialog.node.style.cursor = 'grab';
    dialog.target.removeEventListener('mousemove', shiftEvent);
    dialog.target.removeEventListener('touchmove', shiftEvent);
    dialog.target.removeEventListener('mouseup', stopShift);
    dialog.target.removeEventListener('touchend', stopShift);
  }

  // Function to handle the move event during a drag, updating the position of the dialog while keeping it within the window bounds
  function shiftEvent(e) {

    // Set initial x
    dialog.x ??= e.x

    const leftShift = e.x - dialog.x

    dialog.x = e.x

    // Set initial y
    dialog.y ??= e.y

    const topShift = e.y - dialog.y

    dialog.y = e.y

    if (dialog.contained && !dialog.modal) {

      shiftContained(dialog, leftShift, topShift)
      return;
    }

    if (dialog.containedCentre && !dialog.modal) {

      shiftContainedCentre(dialog, leftShift, topShift)
      return
    }

    // left shift
    dialog.node.style.left = `${dialog.node.offsetLeft + leftShift}px`

    // top shift
    dialog.node.style.top = `${dialog.node.offsetTop + topShift}px`
  }
};

/**
@function shiftContained

@description
The shiftContained method prevents the dialog element to be shifted beyond the extent of the containing window element.

@param {Object} dialog
The dialog configuration object.
@param {integer} leftShift
Shift from left offset.
@param {integer} topShift
Shift from top offset
*/

function shiftContained(dialog, leftShift, topShift) {

  // Exceeds left offset
  if ((dialog.node.offsetLeft + leftShift) < 0) {

    dialog.node.style.left = 0

    // Shifts left
  } else if (leftShift < 0) {

    dialog.node.style.left = `${dialog.node.offsetLeft + leftShift}px`

    // Does NOT exceed right offset
  } else if ((dialog.target.offsetWidth - dialog.node.offsetWidth - dialog.node.offsetLeft) > 0) {

    // Shifts right
    dialog.node.style.left = `${dialog.node.offsetLeft + leftShift}px`
  }


  // Exceeds top offset
  if ((dialog.node.offsetTop + topShift) < 0) {

    dialog.node.style.top = 0

    // Shift top
  } else if (topShift < 0) {

    dialog.node.style.top = `${dialog.node.offsetTop + topShift}px`

    // Does NOT exceed bottom offset
  } else if ((dialog.target.offsetHeight - dialog.node.offsetHeight - dialog.node.offsetTop) > 0) {

    // Shift bottom
    dialog.node.style.top = `${dialog.node.offsetTop + topShift}px`
  }
}

/**
@function shiftContainedCentre

@description
The shiftContainedCentre method prevents the dialog elements calculated centre to be shifted beyond the extent of the containing window element.

@param {Object} dialog
The dialog configuration object.
@param {integer} leftShift
Shift from left offset.
@param {integer} topShift
Shift from top offset
*/

function shiftContainedCentre(dialog, leftShift, topShift) {

  // Exceeds left offset
  if ((dialog.node.offsetLeft + parseInt(dialog.node.offsetWidth / 2) + leftShift) < 0) {

    return;

    // Shifts left
  } else if (leftShift < 0) {

    dialog.node.style.left = `${dialog.node.offsetLeft + leftShift}px`

    // Does NOT exceed right offset
  } else if ((dialog.target.offsetWidth - parseInt(dialog.node.offsetWidth / 2) - dialog.node.offsetLeft) > 0) {

    // Shifts right
    dialog.node.style.left = `${dialog.node.offsetLeft + leftShift}px`
  }


  // Exceeds top offset
  if ((dialog.node.offsetTop + parseInt(dialog.node.offsetHeight / 2) + topShift) < 0) {

    return;

    // Shift top
  } else if (topShift < 0) {

    dialog.node.style.top = `${dialog.node.offsetTop + topShift}px`

    // Does NOT exceed bottom offset
  } else if ((dialog.target.offsetHeight - parseInt(dialog.node.offsetHeight / 2) - dialog.node.offsetTop) > 0) {

    // Shift bottom
    dialog.node.style.top = `${dialog.node.offsetTop + topShift}px`
  }
}