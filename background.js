/* 
  Copyright 2020. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.1 - initial concept
*/

/**** Create and populate data structure ****/

// Default starting values
var oPrefs = {
	allpages: true, 		// Copy the URL of the page even if it's in the top frame
	allpagesmenu: false		// Current menu status
}
let pagemenu;

// Update oPrefs from storage
let getPrefs = browser.storage.local.get("prefs").then((results) => {
	if (results.prefs != undefined){
		if (JSON.stringify(results.prefs) != '{}'){
			var arrSavedPrefs = Object.keys(results.prefs)
			for (var j=0; j<arrSavedPrefs.length; j++){
				oPrefs[arrSavedPrefs[j]] = results.prefs[arrSavedPrefs[j]];
			}
		}
	}
}).then(() => {
	if (oPrefs.allpages == true){
		pagemenu = browser.menus.create({
			id: "copy-page-url",
			title: "Copy Page URL",
			contexts: ["page", "selection"],
			icons: {
			"64": "icons/copy-frame-url-64.png"
			}
		}, function(){ // Optimistic!
			oPrefs.allpagesmenu = true;
		});
	} 
}).catch((err) => {console.log('Error retrieving "prefs" from storage: '+err.message);});

/**** Context menu item ****/

let framemenu = browser.menus.create({
	id: "copy-frame-url",
	title: "Copy Framed Page URL",
	contexts: ["frame"],
	icons: {
	"64": "icons/copy-frame-url-64.png"
	}
});

browser.menus.onClicked.addListener((menuInfo, currTab) => {
	switch (menuInfo.menuItemId) {
		case 'copy-frame-url':
			// Copy to clipboard
			navigator.clipboard.writeText(menuInfo.frameUrl).catch((err) => {
				window.alert('Apologies, but there was an error writing to the clipboard: ' + err);
			});
			break;
		case 'copy-page-url':
			// Copy to clipboard
			navigator.clipboard.writeText(menuInfo.pageUrl).catch((err) => {
				window.alert('Apologies, but there was an error writing to the clipboard: ' + err);
			});
			break;
		default:
			// WTF?
	}
});

/**** Handle Requests from Options ****/

function handleMessage(request, sender, sendResponse){
	if ("get" in request) {
		// Send oPrefs to Options page
		sendResponse({
			prefs: oPrefs
		});
	} else if ("update" in request) {
		// Receive pref updates from Options page, store to oPrefs, and commit to storage
		var oSettings = request["update"];
		oPrefs.allpages = oSettings.allpages;
		browser.storage.local.set({prefs: oPrefs})
			.catch((err) => {console.log('Error on browser.storage.local.set(): '+err.message);});
		// Add or remove menu
		if (oPrefs.allpages == true && oPrefs.allpagesmenu == false) {
			browser.menus.create({
				id: "copy-page-url",
				title: "Copy Page URL",
				contexts: ["page", "selection"],
				icons: {
				"64": "icons/copy-frame-url-64.png"
				}
			}, function(){ // Optimistic!
			oPrefs.allpagesmenu = true;
			});
		} else if (oPrefs.allpages == false && oPrefs.allpagesmenu == true) {
			pagemenu = browser.menus.remove("copy-page-url");
			pagemenu.then(() => {
				oPrefs.allpagesmenu = false;
			});
		}
	}
}
browser.runtime.onMessage.addListener(handleMessage);
