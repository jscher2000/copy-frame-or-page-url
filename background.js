/* 
  Copyright 2022. Jefferson "jscher2000" Scher. License: MPL-2.0.
  version 0.1 - initial concept
  version 1.0 - added toolbar button and keyboard shortcut option
  version 1.1 - added option to choose between toolbar button and address bar button
  version 1.2 - dark mode icon
  version 1.3 - option to decode unicode characters
  version 1.4 - simplify icons, add HTML link format
*/

/**** Create and populate data structure ****/

// Default starting values
var oPrefs = {
	allpages: true, 		// Copy the URL of the page even if it's in the top frame
	allpagesmenu: false,	// Current menu status
	contexticon: false,		// Option to use context fill color for toolbar icons
	contexticonstatus: false,	// Whether context-fill icon is in use
	clickplain: 'url',		// Plain click on browser action copies URL only
	clickshift: 'markdown',	// Shift+click on browser action copies markdown
	clickctrl: 'html',		// Shift+click on browser action copies html
	pageaction: false,		// Button in the address bar
	darkmode: false,		// Option to use dark icon for Page Action
	decode: true			// Option to decode Unicode URLs
}
let pagemenu;
let iconpath = 'icons/link-64px-green.svg'; // default path, potentially updated later

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
	if (oPrefs.contexticon == true){
		iconpath = 'icons/link-64px.svg';
		oPrefs.contexticonstatus = true;
		// Update toolbar icon (async)
		browser.browserAction.setIcon({path: iconpath});
	}
	if (oPrefs.allpages == true){
		pagemenu = browser.menus.create({
			id: "copy-page-url",
			title: "Copy Page URL",
			contexts: ["page", "selection"]
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
	contexts: ["frame"]
});

browser.menus.onClicked.addListener((menuInfo, currTab) => {
	switch (menuInfo.menuItemId) {
		case 'copy-frame-url':
			// Copy to clipboard
			updateClipboard(deco(menuInfo.frameUrl));
			break;
		case 'copy-page-url':
			// Check for Shift or Ctrl as modifier
			var style = oPrefs.clickplain;
			if (menuInfo.modifiers){
				if (menuInfo.modifiers.includes('Shift')){
					style = oPrefs.clickshift;
				} else if (menuInfo.modifiers.includes('Ctrl')){
					style = oPrefs.clickctrl;
				}
			}
			// Set up text for copying
			if (style == 'html'){
				var txt = '<a href="' + deco(currTab.url) + '">' + currTab.title + '</a>';
			} else if (style == 'markdown'){
				var txt = '[' + currTab.title + '](' + deco(currTab.url) + ')';
			} else {
				txt = deco(menuInfo.pageUrl);
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

function deco(urltxt){ // version 1.3
	if (oPrefs.decode == true){
		try {
			return decodeURI(urltxt);
		} catch(err) {
			console.log(err, urltxt);
			return urltxt;
		}
	} else {
		return urltxt;
	}
}

/**** Toolbar button and keyboard shortcut ****/

browser.browserAction.onClicked.addListener((tab, clickData) => {
	// Check for Shift or Ctrl as modifier
	var style = oPrefs.clickplain;
	if (clickData && clickData.modifiers){
		if (clickData.modifiers.includes('Shift')){
			style = oPrefs.clickshift;
		} else if (clickData.modifiers.includes('Ctrl')){
			style = oPrefs.clickctrl;
		}
	}
	// Set up text for copying
	if (style == 'html'){
		var txt = '<a href="' + deco(tab.url) + '">' + tab.title + '</a>';
	} else if (style == 'markdown'){
		var txt = '[' + tab.title + '](' + deco(tab.url) + ')';
	} else {
		txt = deco(tab.url);
	}
	updateClipboard(txt);
});

browser.commands.onCommand.addListener((strName) => {
	if (strName === 'copy-page-url'){
		browser.tabs.query({
			active: true,
			currentWindow: true
		}).then((currTab) => {
			updateClipboard(deco(currTab[0].url));
		}).catch((err) => {
			console.log(err);
		});
	} else if (strName === 'copy-page-url-as-markdown'){
		browser.tabs.query({
			active: true,
			currentWindow: true
		}).then((currTab) => {
			updateClipboard('[' + currTab[0].title + '](' + deco(currTab[0].url) + ')');
		}).catch((err) => {
			console.log(err);
		});
	} else if (strName === 'copy-page-url-as-html'){ //todo
		browser.tabs.query({
			active: true,
			currentWindow: true
		}).then((currTab) => {
			updateClipboard('<a href="' + deco(currTab.url) + '">' + currTab.title + '</a>');
		}).catch((err) => {
			console.log(err);
		});
	}
});

function showPageAction(tabId){
	browser.pageAction.show(tabId);
	if (oPrefs.darkmode == true){ // as of v1.4, same icon
		browser.pageAction.setIcon({
			tabId: tabId,
			path: {
				64: iconpath
			}
		});
	} else {
		browser.pageAction.setIcon({
			tabId: tabId,
			path: {
				64: iconpath
			}
		});
	}
	browser.pageAction.setTitle({
		tabId: tabId,
		title: buttonTitle
	});
}

browser.pageAction.onClicked.addListener((tab, clickData) => {
	// Check for Shift or Ctrl as modifier
	var style = oPrefs.clickplain;
	if (clickData && clickData.modifiers){
		if (clickData.modifiers.includes('Shift')){
			style = oPrefs.clickshift;
		} else if (clickData.modifiers.includes('Ctrl')){
			style = oPrefs.clickctrl;
		}
	}
	// Set up text for copying
	if (style == 'html'){
		var txt = '<a href="' + deco(tab.url) + '">' + tab.title + '</a>';
	} else if (style == 'markdown'){
		var txt = '[' + tab.title + '](' + deco(tab.url) + ')';
	} else {
		txt = deco(tab.url);
	}
	updateClipboard(txt);
});

var buttonTitle = '';
function updateButtonTooltips(){
	if (oPrefs.clickplain == 'url'){
		buttonTitle = 'Copy Current Page URL (Shift => ' + oPrefs.clickshift + ', Ctrl => ' + oPrefs.clickctrl + ')';
	}
	if (oPrefs.clickplain == 'markdown'){
		buttonTitle = 'Copy Title+URL as Markdown (Shift => ' + oPrefs.clickshift + ', Ctrl => ' + oPrefs.clickctrl + ')';
	}
	if (oPrefs.clickplain == 'html'){
		buttonTitle = 'Copy Title+URL as HTML Link (Shift => ' + oPrefs.clickshift + ', Ctrl => ' + oPrefs.clickctrl + ')';
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
		// Icon change
		oPrefs.contexticon = oSettings.contexticon;
		if (oPrefs.contexticon == true && oPrefs.contexticonstatus == false) {
			iconpath = 'icons/link-64px.svg';
			oPrefs.contexticonstatus = true;
			// Update toolbar icon (async)
			browser.browserAction.setIcon({path: iconpath});
			// Update menu icon (NOT POSSIBLE FOR TOP LEVEL ITEMS)
		} else if (oPrefs.contexticon == false && oPrefs.contexticonstatus == true) {
			iconpath = 'icons/link-64px-green.svg';
			oPrefs.contexticonstatus = false;
			// Update toolbar icon (async)
			browser.browserAction.setIcon({path: iconpath});
			// Update menu icon (NOT POSSIBLE FOR TOP LEVEL ITEMS)
		}
		oPrefs.clickplain = oSettings.clickplain;
		oPrefs.clickshift = oSettings.clickshift;
		oPrefs.clickctrl = oSettings.clickctrl;
		oPrefs.decode = oSettings.decode;
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
				contexts: ["page", "selection"]
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
