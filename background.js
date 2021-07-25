/* 
  Copyright 2021. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.1 - initial concept
  version 1.0 - added toolbar button and keyboard shortcut option
  version 1.1 - added option to choose between toolbar button and address bar button
  version 1.2 - dark mode icon
*/

/**** Create and populate data structure ****/

// Default starting values
var oPrefs = {
	allpages: true, 		// Copy the URL of the page even if it's in the top frame
	allpagesmenu: false,	// Current menu status
	clickplain: 'url',		// Plain click on browser action copies URL only
	clickshift: 'markdown',	// Shift+click on browser action copies markdown
	pageaction: false,		// Button in the address bar
	darkmode: false			// Option to use dark icon for Page Action
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
	if (oPrefs.pageaction){
		browser.tabs.onUpdated.addListener(showPageAction);
	}
	updateButtonTooltips();
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
			updateClipboard(menuInfo.frameUrl);
			break;
		case 'copy-page-url':
			// Check for Shift as modifier
			var style = oPrefs.clickplain;
			if (menuInfo.modifiers && menuInfo.modifiers.includes('Shift')){
				style = oPrefs.clickshift;
			}
			// Set up text for copying
			if (style == 'markdown'){
				var txt = '[' + currTab.title + '](' + currTab.url + ')';
			} else {
				txt = menuInfo.pageUrl;
			}
			updateClipboard(txt);
			break;
		default:
			// WTF?
	}
});

function updateClipboard(txt){
	// Copy to clipboard
	navigator.clipboard.writeText(txt).catch((err) => {
		window.alert('Apologies, but there was an error writing to the clipboard: ' + err);
	});
}

/**** Toolbar button and keyboard shortcut ****/

browser.browserAction.onClicked.addListener((tab, clickData) => {
	// Check for Shift as modifier
	var style = oPrefs.clickplain;
	if (clickData && clickData.modifiers && clickData.modifiers.includes('Shift')){
		style = oPrefs.clickshift;
	}
	// Set up text for copying
	if (style == 'markdown'){
		var txt = '[' + tab.title + '](' + tab.url + ')';
	} else {
		txt = tab.url;
	}
	updateClipboard(txt);
});

browser.commands.onCommand.addListener((strName) => {
	if (strName === 'copy-page-url'){
		browser.tabs.query({
			active: true,
			currentWindow: true
		}).then((currTab) => {
			updateClipboard(currTab[0].url);
		}).catch((err) => {
			console.log(err);
		});
	} else if (strName === 'copy-page-url-as-markdown'){
		browser.tabs.query({
			active: true,
			currentWindow: true
		}).then((currTab) => {
			updateClipboard('[' + currTab[0].title + '](' + currTab[0].url + ')');
		}).catch((err) => {
			console.log(err);
		});
	}
});

function showPageAction(tabId){
	browser.pageAction.show(tabId);
	if (oPrefs.darkmode == true){
		browser.pageAction.setIcon({
			tabId: tabId,
			path: {
				64: "icons/copy-frame-url-64-dark.png"
			}
		});
	} else{
		browser.pageAction.setIcon({
			tabId: tabId,
			path: {
				64: "icons/copy-frame-url-64.png"
			}
		});
	}
	browser.pageAction.setTitle({
		tabId: tabId,
		title: buttonTitle
	});
}

browser.pageAction.onClicked.addListener((tab, clickData) => {
	// Check for Shift as modifier
	var style = oPrefs.clickplain;
	if (clickData && clickData.modifiers && clickData.modifiers.includes('Shift')){
		style = oPrefs.clickshift;
	}
	// Set up text for copying
	if (style == 'markdown'){
		var txt = '[' + tab.title + '](' + tab.url + ')';
	} else {
		txt = tab.url;
	}
	updateClipboard(txt);
});

var buttonTitle = '';
function updateButtonTooltips(){
	if (oPrefs.clickplain == 'url'){
		if (oPrefs.clickshift == 'markdown'){
			buttonTitle = 'Copy Current Page URL (Shift+click for Markdown)';
		} else {
			buttonTitle = 'Copy Current Page URL';
		}
	} else if (oPrefs.clickplain == 'markdown'){
		if (oPrefs.clickshift == 'markdown'){
			buttonTitle = 'Copy Title+URL as Markdown';
		} else {
			buttonTitle = 'Copy Title+URL as Markdown (Shift+click for Plain URL)';
		}
	}
	if (buttonTitle.length > 0){
		browser.browserAction.setTitle({
			title: buttonTitle
		});
	}
}

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
		oPrefs.clickplain = oSettings.clickplain;
		oPrefs.clickshift = oSettings.clickshift;
		// Check for Page Action changes
		oPrefs.darkmode = oSettings.darkmode;		
		if (oSettings.pageaction == true && oPrefs.pageaction == false){
			browser.tabs.onUpdated.addListener(showPageAction);
		} else if (oSettings.pageaction == false && oPrefs.pageaction == true){
			browser.tabs.onUpdated.removeListener(showPageAction);
		}
		oPrefs.pageaction = oSettings.pageaction;
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
		// Fix button tooltips
		updateButtonTooltips();
	}
}
browser.runtime.onMessage.addListener(handleMessage);
