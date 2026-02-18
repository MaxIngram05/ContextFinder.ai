chrome.runtime.onInstalled.addListener(() => {
  console.log("ContextFinder.ai installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("Message received:", message);
  sendResponse({ status: "ok" });
  return true;
});
