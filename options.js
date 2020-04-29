// Set form values from current preferences
browser.runtime.sendMessage({
	get: "oPrefs"
}).then((response) => {
	var oSettings = response['prefs'];
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	for (var i=0; i<chks.length; i++){
		if (oSettings[chks[i].name] == true) chks[i].checked = true;
		else chks[i].checked = false;
	}
}).catch((err) => {
	console.log('Problem getting settings: '+err.message);
});

// Send changes to background for storage
function updatePref(evt){
	// Checkboxes
	var chks = document.querySelectorAll('.chk input[type="checkbox"]');
	var oSettings = {};
	for (var i=0; i<chks.length; i++){
		oSettings[chks[i].name] = chks[i].checked;
	}
	// Send update to background
	browser.runtime.sendMessage({
		update: oSettings
	});
}

// Attach event handler to the checkbox
document.querySelector('input[name="allpages"]').addEventListener('change', updatePref, false);