const BASE_HOST_STORAGE = "site_";
const KNOWN_URLS = ["app.factorialhr.com"];

const autofill = function () {
  const LOGGER = false;

  const logger = (...messages) => {
    LOGGER && console.log(...messages);
  };

  function autofillExecution(arrayOfTimes) {
    logger("Running code with:", arrayOfTimes);

    const pressKey = (el, key) => {
      el.dispatchEvent(
        new KeyboardEvent("keydown", {
          keyCode: key.charCodeAt(0),
          bubbles: true,
        })
      );
    };

    // Format of text should be: HH:mm
    const writeText = (el, text) => {
      el.value = "";
      el.dispatchEvent(new Event("focus"));
      pressKey(el, text[0]);
      pressKey(el, text[1]);
      pressKey(el, text[3]);
      pressKey(el, text[4]);
    };

    const iterateOverTimeRows = (containerTimeRows, start = 0) => {
      const timeRows = containerTimeRows.querySelectorAll(":scope > div");
      logger(`Time rows: ${timeRows.length} - Start: ${start}`);
      Array.from(timeRows)
        .slice(start)
        .forEach((timeRow, index) => {
          // This is a corrected index, just to optimize the update
          const i = index + start;
          // The time for this row has been defined
          logger(`Index is: ${i} and ${arrayOfTimes[i]}`);
          if (arrayOfTimes[i]) {
            const inputs = timeRow.querySelectorAll(":scope input");
            logger("Found inputs:", inputs.length);

            if (inputs.length && !inputs[0].disabled) {
              writeText(inputs[0], arrayOfTimes[i][0]);
              writeText(inputs[1], arrayOfTimes[i][1]);

              // Now the button should be visible
              const buttons = timeRow.querySelectorAll(":scope button");
              logger(`Total buttons: ${buttons.length}`);
              if (
                (i === 0 && buttons.length === 2) ||
                (i > 0 && buttons.length === 1)
              ) {
                // This means the times haave changed
                buttons[0].click();

                // Check if we need to add more times
                if (i < arrayOfTimes.length - 1) {
                  // We reached the end of the lines created here
                  if (timeRows.length === index + 1) {
                    buttons[1].click();
                    iterateOverTimeRows(timeRow.parentNode, index + 1);
                  }
                }
              }
            }
          }
        });
    };

    const iterateOverDays = (tableRows) => {
      logger("Starting iteration to update all the times");
      Array.from(tableRows).forEach((tr) => {
        if (tr.className.indexOf("disabled") === -1) {
          const tds = tr.getElementsByTagName("td");
          const firstTD = tds[0];
          const day = firstTD
            .getElementsByTagName("div")[0]
            .getElementsByTagName("div")[1].innerHTML;

          if (!["s", "d", "S", "D"].includes(day[0])) {
            const secondTD = tds[1].getElementsByTagName("div")[0];
            iterateOverTimeRows(secondTD);
          }
        }
      });
    };

    // The clock-in page has only one table
    const body = document
      .getElementsByTagName("table")[0]
      .getElementsByTagName("tbody")[0];
    const trs = body.getElementsByTagName("tr");

    iterateOverDays(trs);
  }

  chrome.storage.sync.get("arrayOfTimes", function (value) {
    logger("The value is:", value);
    autofillExecution(JSON.parse(value.arrayOfTimes || "[]"));
    chrome.storage.sync.remove("arrayOfTimes");
  });
};

const isKnownURL = (url) => {
  return KNOWN_URLS.find((knownUrl) => url.includes(knownUrl));
};

window.onload = async function () {
  const lightbox = document.getElementById("lightbox");

  var tabInfo = false;

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    tabInfo = tab;
  } catch (e) {
    console.log(e);
  }

  if (tabInfo === false || !isKnownURL(tabInfo.url)) {
    lightbox.className = "visible";
    return;
  } else {
    lightbox.className = "";
  }

  const arrayOfTimeRanges = () => {
    const times = document.querySelectorAll("#times > .time-range");
    const arrayOfTimes = [];
    Array.from(times).forEach((timeContainer) => {
      arrayOfTimes.push([
        timeContainer.querySelector("input[name='text-from']").value,
        timeContainer.querySelector("input[name='text-to']").value,
      ]);
    });
    return JSON.stringify(arrayOfTimes);
  };

  document.getElementById("btn-autofill").onclick = function () {
    chrome.storage.sync.set(
      {
        arrayOfTimes: arrayOfTimeRanges(),
      },
      function () {
        chrome.scripting.executeScript({
          target: { tabId: tabInfo.id },
          function: autofill,
        });
      }
    );
  };

  const removeElement = (e) => {
    e.target.parentNode.parentNode.remove();
  };

  const timesContainer = document.getElementById("times");
  document.getElementById("btn-newline").onclick = function () {
    timesContainer.innerHTML =
      timesContainer.innerHTML +
      `
    <div class="row time-range">
      <div class="col-sm-4">
        <input type="time" class="tertiary" name="text-from" />
      </div>
      <div class="col-sm-4">
        <input type="time" class="tertiary" name="text-to" />
      </div>
      <div class="col-sm-4">
        <button name="btn-remove-line">Remove</button>
      </div>
    </div>
    `;

    const newButton = document.querySelector(
      "#times .time-range:last-child button"
    );
    newButton.addEventListener("click", removeElement);
  };
};
