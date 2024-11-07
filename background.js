chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.clear(() => {
        console.log("chrome.storage.local cleared on browser startup.");
    });
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.clear(() => {
        console.log("chrome.storage.local cleared on extension reload.");
    });
});

// Clears storage every time a specific tab (Reddit) is refreshed or updated
chrome.tabs.onUpdated.addListener((changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('reddit.com')) {
        chrome.storage.local.clear(() => {
            console.log("chrome.storage.local cleared on Reddit tab refresh or reload.");
        });
    }
});

